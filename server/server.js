const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');
const RoomManager = require('./rooms');
const DrawingStateManager = require('./drawing-state');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

app.use(express.static(path.join(__dirname, '../client')));

const roomManager = new RoomManager();
const drawingStateManager = new DrawingStateManager();

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);
  
  const userData = {
    id: socket.id,
    color: ['#3b82f6', '#ef4444', '#22c55e', '#eab308'][Math.floor(Math.random() * 4)],
    name: `User ${Math.floor(Math.random() * 1000)}`
  };

  const roomId = 'default';
  socket.join(roomId);
  roomManager.addUser(roomId, userData);

  socket.emit('init', {
    userId: socket.id,
    operations: drawingStateManager.getOperations(roomId),
    users: roomManager.getUsers(roomId)
  });

  socket.to(roomId).emit('user-joined', userData);

  socket.on('draw', (data) => {
    socket.to(roomId).emit('draw', { ...data, userId: socket.id });
  });

  socket.on('operation', (data) => {
    const operation = { ...data.operation, userId: socket.id };
    drawingStateManager.addOperation(roomId, operation);
    socket.to(roomId).emit('operation', { operation, userId: socket.id });
  });

  socket.on('undo', (data) => {
    drawingStateManager.removeOperation(roomId, data.operationId);
    io.to(roomId).emit('undo', { operationId: data.operationId, userId: socket.id });
  });

  socket.on('redo', (data) => {
    drawingStateManager.addOperation(roomId, data.operation);
    io.to(roomId).emit('redo', { operation: data.operation, userId: socket.id });
  });

  socket.on('clear', () => {
    drawingStateManager.clearOperations(roomId);
    io.to(roomId).emit('clear', { userId: socket.id });
  });

  socket.on('cursor', (data) => {
    socket.to(roomId).emit('cursor', { ...data, userId: socket.id, color: userData.color });
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    roomManager.removeUser(roomId, socket.id);
    socket.to(roomId).emit('user-left', { userId: socket.id });
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in multiple tabs to test collaboration`);
});