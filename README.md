# Real-Time Collaborative Drawing Canvas

A multi-user drawing application where multiple people can draw simultaneously on the same canvas with real-time synchronization using WebSockets.

## 🚀 Features

- **Real-time Drawing Sync**: See other users' drawings as they draw
- **Drawing Tools**: Brush and eraser with adjustable stroke width
- **Color Palette**: 8 preset colors for drawing
- **Global Undo/Redo**: Works across all users
- **User Indicators**: See remote cursor positions with color coding
- **Conflict Resolution**: Handles simultaneous drawing in overlapping areas
- **Performance Optimized**: Batched updates and requestAnimationFrame for smooth drawing
- **Mobile Support**: Touch events for drawing on mobile devices
- **Auto-reconnection**: Handles network interruptions gracefully
- **Latency Monitoring**: Real-time connection quality indicator

## 📋 Prerequisites

- Node.js >= 14.0.0
- npm or yarn

## 🛠️ Installation

```bash
# Clone the repository
git clone <repository-url>
cd collaborative-canvas

# Install dependencies
npm install
```

## 🎮 Running the Application

```bash
# Start the server
npm start

# Or use nodemon for development
npm run dev
```

The server will start on `http://localhost:3000`

## 🧪 Testing with Multiple Users

1. Open `http://localhost:3000` in your browser
2. Open the same URL in another browser tab or window
3. Start drawing in one window - you'll see the drawing appear in real-time in the other window
4. Try different tools, colors, and undo/redo operations

**Alternative Testing Methods:**
- Use different browsers (Chrome, Firefox, Safari)
- Use incognito/private browsing mode
- Test on mobile devices on the same network

## 📁 Project Structure

```
collaborative-canvas/
├── client/
│   ├── index.html          # Main HTML file
│   ├── style.css           # Styles
│   ├── canvas.js           # Canvas drawing logic
│   ├── websocket.js        # WebSocket client
│   └── main.js             # App initialization
├── server/
│   ├── server.js           # Express + Socket.IO server
│   ├── rooms.js            # Room management
│   └── drawing-state.js    # Canvas state management
├── package.json
├── README.md
└── ARCHITECTURE.md
```

## 🎯 Usage

### Drawing
- **Select Tool**: Click "Brush" or "Eraser"
- **Choose Color**: Click on any color in the palette
- **Adjust Size**: Use the slider to change stroke width
- **Draw**: Click and drag on the canvas

### Actions
- **Undo**: Click the undo button or use Ctrl+Z
- **Redo**: Click the redo button or use Ctrl+Y
- **Clear**: Remove all drawings (requires confirmation)
- **Download**: Save canvas as PNG image

### Collaboration
- User count shows number of connected users
- Remote cursors appear as colored dots
- Connection status indicator shows real-time connection state
- Latency displays current network delay

## ⚙️ Configuration

### Server Port
Change the port in `server/server.js`:
```javascript
const PORT = process.env.PORT || 3000;
```

### Maximum Operations
Adjust memory limits in `server/drawing-state.js`:
```javascript
this.maxOperations = 10000; // Max operations per room
```

### Cursor Update Throttle
Modify throttle in `client/main.js`:
```javascript
this.cursorThrottle = 50; // milliseconds
```

## 🐛 Known Limitations

1. **Memory**: Canvas history grows with usage. Implement periodic cleanup for production.
2. **Persistence**: Canvas state is lost on server restart. Add database for production.
3. **Scaling**: Single-server architecture. Use Redis adapter for multi-server deployment.
4. **Mobile**: Touch drawing works but could be optimized further.

## 🚀 Deployment

### Heroku
```bash
# Login to Heroku
heroku login

# Create app
heroku create your-app-name

# Deploy
git push heroku main

# Open app
heroku open
```

### Vercel/Netlify
For serverless deployment, you'll need to adapt the WebSocket server or use a separate service for WebSocket handling.

## ⏱️ Time Spent

- **Architecture & Planning**: 2 hours
- **Canvas Implementation**: 4 hours
- **WebSocket Integration**: 3 hours
- **UI/UX Development**: 2 hours
- **Testing & Debugging**: 2 hours
- **Documentation**: 1 hour
- **Total**: ~14 hours

## 🔧 Technical Highlights

- **Operational Transformation**: Operations are stored with unique IDs for conflict-free undo/redo
- **Client-Side Prediction**: Immediate visual feedback with server confirmation
- **Batched Updates**: Mouse movements are batched to reduce network traffic
- **Smooth Curves**: Quadratic curves for natural-looking strokes
- **Memory Optimization**: Offscreen canvas and efficient redrawing strategies

## 📝 License

MIT License - feel free to use this project for learning or production.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.