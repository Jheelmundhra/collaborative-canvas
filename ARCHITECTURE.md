# Architecture Documentation

## System Overview

This collaborative canvas application implements real-time drawing synchronization using WebSockets (Socket.IO). The architecture follows a client-server model where the server acts as the central coordinator for all drawing operations.

## Data Flow Diagram

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│   Client A  │         │   Server    │         │   Client B  │
│             │         │             │         │             │
│  Canvas     │         │  State      │         │  Canvas     │
│  Manager    │◄───────►│  Manager    │◄───────►│  Manager    │
│             │         │             │         │             │
│  WebSocket  │         │  Socket.IO  │         │  WebSocket  │
│  Client     │         │  Server     │         │  Client     │
└─────────────┘         └─────────────┘         └─────────────┘
       │                       │                       │
       │   1. User draws       │                       │
       │──────────────────────►│                       │
       │                       │   2. Broadcast draw   │
       │                       │──────────────────────►│
       │                       │                       │
       │                       │   3. Client renders   │
       │                       │◄──────────────────────│
       │                       │                       │
       │   4. Operation done   │                       │
       │──────────────────────►│                       │
       │                       │   5. Sync operation   │
       │                       │──────────────────────►│
```

## Component Architecture

### Client-Side Components

#### 1. CanvasManager (`client/canvas.js`)
**Responsibility**: All canvas drawing operations and state management

**Key Methods**:
- `startDrawing(x, y, color, width, tool)`: Initialize new stroke
- `addPoint(x, y)`: Add point to current stroke
- `endDrawing()`: Finalize stroke and return operation
- `drawOperation(operation)`: Render a complete operation
- `undo()`: Remove last operation and redraw
- `redo()`: Restore undone operation
- `redraw()`: Reconstruct entire canvas from operations

**Optimization Strategies**:
- Uses quadratic curves for smooth strokes
- Implements offscreen canvas for layer composition
- Batches points before rendering with `requestAnimationFrame`
- Maintains operation history as minimal data structures

#### 2. WebSocketClient (`client/websocket.js`)
**Responsibility**: Network communication and connection management

**Features**:
- Auto-reconnection with exponential backoff
- Message queuing during disconnection
- Latency monitoring via ping/pong
- Event-based message handling

**Message Types**:
```javascript
// Outgoing
- 'draw': Real-time stroke data (batched points)
- 'operation': Completed drawing operation
- 'undo': Undo request with operation ID
- 'redo': Redo request with operation data
- 'clear': Clear canvas request
- 'cursor': Cursor position update

// Incoming
- 'init': Initial state (operations + users)
- 'user-joined': New user notification
- 'user-left': User disconnect notification
- 'draw': Real-time drawing from others
- 'operation': Completed operation from others
- 'undo': Global undo event
- 'redo': Global redo event
- 'clear': Global clear event
- 'cursor': Remote cursor positions
```

#### 3. Main Application (`client/main.js`)
**Responsibility**: Coordinate all components and handle UI interactions

**Key Responsibilities**:
- Initialize canvas and WebSocket
- Handle user input (mouse/touch events)
- Manage UI state (tools, colors, buttons)
- Coordinate between canvas and network layer
- Manage remote cursor rendering

### Server-Side Components

#### 1. Express + Socket.IO Server (`server/server.js`)
**Responsibility**: WebSocket server and HTTP serving

**Key Functions**:
- Serve static files (HTML, CSS, JS)
- Handle WebSocket connections
- Route messages between clients
- Manage user sessions

**Connection Flow**:
```javascript
1. Client connects → Generate user data
2. Join room (default: 'default')
3. Send initial state (operations + users)
4. Broadcast 'user-joined' to others
5. Handle drawing events
6. On disconnect → Remove user, broadcast 'user-left'
```

#### 2. RoomManager (`server/rooms.js`)
**Responsibility**: Multi-room user management

**Data Structure**:
```javascript
rooms: Map<roomId, Map<userId, userData>>
```

**Key Methods**:
- `addUser(roomId, userData)`: Add user to room
- `removeUser(roomId, userId)`: Remove user and cleanup
- `getUsers(roomId)`: Get all users in room
- `getUserCount(roomId)`: Count users

**Features**:
- Automatic room cleanup when empty
- Efficient user lookups with Map structures
- Support for multiple isolated rooms

#### 3. DrawingStateManager (`server/drawing-state.js`)
**Responsibility**: Canvas state and operation history

**Data Structure**:
```javascript
roomStates: Map<roomId, {
  operations: Array<Operation>,
  operationMap: Map<operationId, Operation>,
  createdAt: timestamp,
  lastActivity: timestamp
}>
```

**Key Methods**:
- `addOperation(roomId, operation)`: Store new operation
- `removeOperation(roomId, operationId)`: Remove for undo
- `getOperations(roomId)`: Get all operations
- `clearOperations(roomId)`: Clear all operations

**Features**:
- Dual storage (array + map) for efficient access
- Maximum operation limit per room
- Automatic cleanup of inactive rooms
- Memory usage tracking

## WebSocket Protocol

### Message Structure

All messages follow this structure:
```javascript
{
  type: string,      // Message type
  userId: string,    // Sender's user ID
  ...data           // Type-specific payload
}
```

### Real-time Drawing Protocol

**Phase 1: Live Drawing (High Frequency)**
```javascript
// Client → Server (throttled, ~60fps)
{
  type: 'draw',
  points: [{x, y}, {x, y}, ...],
  color: '#3b82f6',
  width: 3,
  tool: 'brush'
}

// Server → Other Clients (broadcast)
{
  type: 'draw',
  userId: 'abc123',
  points: [...],
  color: '#3b82f6',
  width: 3,
  tool: 'brush'
}
```

**Phase 2: Operation Complete**
```javascript
// Client → Server (on mouse up)
{
  type: 'operation',
  operation: {
    id: unique_id,
    type: 'brush',
    color: '#3b82f6',
    width: 3,
    points: [...],
    timestamp: 1234567890
  }
}

// Server → Other Clients
{
  type: 'operation',
  userId: 'abc123',
  operation: {...}
}
```

## Global Undo/Redo Strategy

### Problem
Traditional undo/redo is per-user, but we need global undo that works across all users while maintaining consistency.

### Solution: Operation-Based History

**Data Model**:
```javascript
Operation {
  id: unique_identifier,    // For removal during undo
  type: 'brush' | 'eraser',
  color: string,
  width: number,
  points: [{x, y}, ...],
  timestamp: number,
  userId: string            // Who created it
}
```

**Undo Implementation**:
1. Client calls undo on their local canvas
2. Client gets the removed operation's ID
3. Client sends `{type: 'undo', operationId: id}` to server
4. Server removes operation from global history
5. Server broadcasts undo to ALL clients (including sender)
6. All clients remove the operation and redraw

**Redo Implementation**:
1. Client calls redo on their local canvas
2. Client gets the restored operation
3. Client sends `{type: 'redo', operation: op}` to server
4. Server adds operation back to global history
5. Server broadcasts redo to ALL clients
6. All clients add operation and render it

**Conflict Resolution**:
- Operations are identified by unique IDs (timestamp + random)
- Last-write-wins for concurrent operations
- Clients maintain local redo stack separately
- Server is source of truth for operation history

**Trade-offs**:
- ✅ Simple to implement and understand
- ✅ Consistent across all clients
- ✅ Works with network delays
- ❌ Undo order may differ from drawing order
- ❌ No user-specific undo (by design)

## Performance Optimizations

### 1. Client-Side Prediction
**Strategy**: Draw immediately on local canvas, confirm with server
```javascript
// Immediate: Draw locally
canvasManager.drawStroke(points, color, width, tool);

// Later: Confirm with server
wsClient.send('draw', {points, color, width, tool});
```

### 2. Batched Point Updates
**Strategy**: Accumulate points and send in batches
```javascript
// Bad: Send every point
mousemove → send({x, y})

// Good: Batch points
mousemove → accumulate points
requestAnimationFrame → send all accumulated points
```

**Benefit**: Reduces network messages from 60/sec to ~10/sec

### 3. Optimized Redrawing
**Strategy**: Only redraw when necessary
```javascript
// During live drawing: Incremental rendering
drawStroke(newPoints) // Just new points

// After undo/redo: Full redraw
redraw() // All operations
```

### 4. Smooth Curve Rendering
**Strategy**: Use quadratic curves instead of straight lines
```javascript
// Creates smoother, more natural strokes
ctx.quadraticCurveTo(controlX, controlY, endX, endY);
```

### 5. Throttled Cursor Updates
**Strategy**: Limit cursor position broadcasts
```javascript
// Send cursor max every 50ms
if (now - lastUpdate > 50) {
  sendCursor(x, y);
}
```

## Conflict Resolution

### Scenario 1: Simultaneous Drawing
**Problem**: Users A and B draw at the same location

**Resolution**:
- Both strokes are preserved
- Operations have unique IDs
- Render order determined by timestamp
- Last operation appears on top

### Scenario 2: Concurrent Undo
**Problem**: User A undoes while User B is drawing

**Resolution**:
- Each operation has unique ID
- Undo removes specific operation by ID
- New drawings are separate operations
- No conflict occurs

### Scenario 3: Network Latency
**Problem**: Client sees delayed updates

**Resolution**:
- Client-side prediction for local drawing
- Server state is source of truth
- On init, client loads full operation history
- Missing operations applied on reconnection

## Scaling Considerations

### Current Architecture
- Single server instance
- In-memory state storage
- Direct WebSocket connections

### For Production Scale

#### 1. Horizontal Scaling
**Solution**: Redis Adapter for Socket.IO
```javascript
const io = require('socket.io')(server);
const redisAdapter = require('socket.io-redis');

io.adapter(redisAdapter({
  host: 'redis-server',
  port: 6379
}));
```

#### 2. Persistent Storage
**Solution**: Database for operation history
```javascript
// Store operations in MongoDB/PostgreSQL
await db.operations.insert(operation);

// Load on user join
const ops = await db.operations.find({roomId});
```

#### 3. CDN for Static Assets
**Solution**: Serve client files from CDN
- Reduces server load
- Improves global latency
- Better caching

#### 4. Rate Limiting
**Solution**: Limit messages per user
```javascript
const rateLimit = new Map();

socket.on('draw', (data) => {
  if (rateLimiter.check(socket.id)) {
    // Process message
  }
});
```

## Security Considerations

### Current Implementation
- No authentication
- Public rooms
- No input validation

### Production Requirements

1. **Authentication**: User identity verification
2. **Authorization**: Room access control
3. **Input Validation**: Sanitize all client data
4. **Rate Limiting**: Prevent spam/DoS
5. **HTTPS/WSS**: Encrypted connections
6. **CORS**: Proper cross-origin settings

## Testing Strategy

### Unit Tests
- Canvas operations (draw, undo, redo)
- State management (add, remove operations)
- Message serialization/deserialization

### Integration Tests
- WebSocket connection flow
- Room management
- Multi-client synchronization

### Load Tests
- 100+ concurrent users
- High-frequency drawing
- Network instability simulation

## Future Enhancements

1. **Shapes Tool**: Rectangles, circles, lines
2. **Text Tool**: Add text annotations
3. **Layers**: Multiple drawing layers
4. **Export Formats**: SVG, PDF support
5. **Replay Mode**: Playback drawing session
6. **User Permissions**: Read-only, moderator roles
7. **Drawing History**: Timeline view of operations
8. **Collaborative Cursors**: Named cursor labels