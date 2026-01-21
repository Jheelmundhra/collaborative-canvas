import { CanvasManager } from './canvas.js';
import { WebSocketClient } from './websocket.js';

class CollaborativeCanvas {
  constructor() {
    this.canvas = null;
    this.canvasManager = null;
    this.wsClient = null;
    this.isDrawing = false;
    this.currentTool = 'brush';
    this.currentColor = '#3b82f6';
    this.strokeWidth = 3;
    this.users = [];
    this.remoteCursors = new Map();
    this.pendingPoints = [];
    this.animationFrame = null;
    this.lastCursorUpdate = 0;
    this.cursorThrottle = 50;
    this.sendBatchTimeout = null;
    this.batchInterval = 16; 
    this.initialize();
  }
  initialize() {
    this.canvas = document.getElementById('drawing-canvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }
    this.canvasManager = new CanvasManager(this.canvas);
    this.setupCanvasEvents();
    this.setupUIEvents();
    this.setupWindowEvents();
    this.initializeWebSocket();
  }
  initializeWebSocket() {
    this.wsClient = new WebSocketClient(
      this.handleWebSocketMessage.bind(this),
      this.handleConnectionChange.bind(this)
    );
    
    this.wsClient.connect();
  }
  handleWebSocketMessage(message) {
    const { type, data } = message;
    
    switch (type) {
      case 'init':
        this.handleInit(data);
        break;
      
      case 'user-joined':
        this.handleUserJoined(data);
        break;
      
      case 'user-left':
        this.handleUserLeft(data);
        break;
      
      case 'draw':
        this.handleRemoteDraw(data);
        break;
      
      case 'operation':
        this.handleRemoteOperation(data);
        break;
      
      case 'undo':
        this.handleRemoteUndo(data);
        break;
      
      case 'redo':
        this.handleRemoteRedo(data);
        break;
      
      case 'clear':
        this.handleRemoteClear(data);
        break;
      
      case 'cursor':
        this.handleRemoteCursor(data);
        break;
    }
  }
  handleInit(data) {
    console.log('Initialized with data:', data);
    this.users = data.users || [];
    this.updateUserCount();
    
    if (data.operations && data.operations.length > 0) {
      this.canvasManager.loadOperations(data.operations);
    }
    
    this.updateUndoRedoButtons();
  }
  handleUserJoined(data) {
    console.log('User joined:', data);
    this.users.push(data);
    this.updateUserCount();
  }
  handleUserLeft(data) {
    console.log('User left:', data);
    this.users = this.users.filter(u => u.id !== data.userId);
    this.updateUserCount();
    this.removeRemoteCursor(data.userId);
  }
  handleRemoteDraw(data) {
    if (data.userId === this.wsClient.getUserId()) return;
    this.canvasManager.drawStroke(
      data.points,
      data.color,
      data.width,
      data.tool
    );
  }
  handleRemoteOperation(data) {
    if (data.userId === this.wsClient.getUserId()) return;
    
    this.canvasManager.addRemoteOperation(data.operation);
    this.updateUndoRedoButtons();
  }
  handleRemoteUndo(data) {
    this.canvasManager.removeOperation(data.operationId);
    this.updateUndoRedoButtons();
  }
  handleRemoteRedo(data) {
    this.canvasManager.addRemoteOperation(data.operation);
    this.updateUndoRedoButtons();
  }
  handleRemoteClear(data) {
    this.canvasManager.clear();
    this.updateUndoRedoButtons();
  }
  handleRemoteCursor(data) {
    if (data.userId === this.wsClient.getUserId()) return;
    
    this.updateRemoteCursor(data.userId, data.x, data.y, data.color);
  }
  handleConnectionChange(connected, latency) {
    const statusIndicator = document.getElementById('connection-status');
    const statusText = document.getElementById('status-text');
    const latencyText = document.getElementById('latency-text');
    
    if (connected) {
      statusIndicator.classList.add('connected');
      statusText.textContent = 'Connected';
      latencyText.textContent = `Latency: ${latency} ms`;
    } else {
      statusIndicator.classList.remove('connected');
      statusText.textContent = 'Disconnected';
      latencyText.textContent = 'Latency: -- ms';
    }
  }
  setupCanvasEvents() {
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }
  setupUIEvents() {
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTool(btn.dataset.tool);
      });
    });
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setColor(btn.dataset.color);
      });
    });
    const strokeSlider = document.getElementById('stroke-width');
    const strokeValue = document.getElementById('stroke-value');
    strokeSlider.addEventListener('input', (e) => {
      this.strokeWidth = parseInt(e.target.value);
      strokeValue.textContent = this.strokeWidth;
    });
    document.getElementById('undo-btn').addEventListener('click', () => this.undo());
    document.getElementById('redo-btn').addEventListener('click', () => this.redo());
    document.getElementById('clear-btn').addEventListener('click', () => this.clear());
    document.getElementById('download-btn').addEventListener('click', () => this.download());
  }
  setupWindowEvents() {
    window.addEventListener('resize', () => {
      this.canvasManager.resize();
      this.canvasManager.redraw();
    });
    
    window.addEventListener('beforeunload', () => {
      this.wsClient.disconnect();
    });
  }
  handleMouseDown(e) {
    const coords = this.canvasManager.getCanvasCoordinates(e);
    this.startDrawing(coords.x, coords.y);
  }
  handleMouseMove(e) {
    const coords = this.canvasManager.getCanvasCoordinates(e);
    
    if (this.isDrawing) {
      this.draw(coords.x, coords.y);
    }
    
    this.sendCursor(coords.x, coords.y);
  }
  handleMouseUp(e) {
    this.stopDrawing();
  }
  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = this.canvasManager.getCanvasCoordinates(touch);
    this.startDrawing(coords.x, coords.y);
  }
  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = this.canvasManager.getCanvasCoordinates(touch);
    this.draw(coords.x, coords.y);
  }
  handleTouchEnd(e) {
    e.preventDefault();
    this.stopDrawing();
  }
  startDrawing(x, y) {
    this.isDrawing = true;
    this.canvasManager.startDrawing(x, y, this.currentColor, this.strokeWidth, this.currentTool);
    this.pendingPoints = [{ x, y }];
    this.canvasManager.drawStroke([{ x, y }], this.currentColor, this.strokeWidth, this.currentTool);
  }
  draw(x, y) {
    if (!this.isDrawing) return;
    
    this.canvasManager.addPoint(x, y);
    this.pendingPoints.push({ x, y });
    if (this.pendingPoints.length >= 2) {
      const lastTwo = this.pendingPoints.slice(-2);
      this.canvasManager.drawStroke(
        lastTwo,
        this.currentColor,
        this.strokeWidth,
        this.currentTool
      );
    }
    this.scheduleBatchSend();
  }
  scheduleBatchSend() {
    if (this.sendBatchTimeout) return;
    
    this.sendBatchTimeout = setTimeout(() => {
      if (this.pendingPoints.length > 0 && this.wsClient.isConnected()) {
        this.wsClient.send('draw', {
          points: [...this.pendingPoints],
          color: this.currentColor,
          width: this.strokeWidth,
          tool: this.currentTool
        });
        if (this.pendingPoints.length > 1) {
          this.pendingPoints = [this.pendingPoints[this.pendingPoints.length - 1]];
        }
      }
      
      this.sendBatchTimeout = null;
    }, this.batchInterval);
  }
  stopDrawing() {
    if (!this.isDrawing) return;
    if (this.sendBatchTimeout) {
      clearTimeout(this.sendBatchTimeout);
      this.sendBatchTimeout = null;
    }
    if (this.pendingPoints.length > 0 && this.wsClient.isConnected()) {
      this.wsClient.send('draw', {
        points: [...this.pendingPoints],
        color: this.currentColor,
        width: this.strokeWidth,
        tool: this.currentTool
      });
    }
    
    const operation = this.canvasManager.endDrawing();
    
    if (operation && this.wsClient.isConnected()) {
      this.wsClient.send('operation', { operation });
    }
    
    this.isDrawing = false;
    this.pendingPoints = [];
    this.updateUndoRedoButtons();
  }
  sendCursor(x, y) {
    const now = Date.now();
    if (now - this.lastCursorUpdate > this.cursorThrottle) {
      if (this.wsClient.isConnected()) {
        this.wsClient.send('cursor', { x, y, color: this.currentColor });
      }
      this.lastCursorUpdate = now;
    }
  }
  setTool(tool) {
    this.currentTool = tool;
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    
    console.log('Tool changed to:', tool);
  }
  setColor(color) {
    this.currentColor = color;
    
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    
    console.log('Color changed to:', color);
  }
  undo() {
    const operation = this.canvasManager.undo();
    
    if (operation && this.wsClient.isConnected()) {
      this.wsClient.send('undo', { operationId: operation.id });
    }
    
    this.updateUndoRedoButtons();
  }
  redo() {
    const operation = this.canvasManager.redo();
    
    if (operation && this.wsClient.isConnected()) {
      this.wsClient.send('redo', { operation });
    }
    
    this.updateUndoRedoButtons();
  }
  clear() {
    if (confirm('Clear the entire canvas for all users? This action cannot be undone.')) {
      this.canvasManager.clear();
      
      if (this.wsClient.isConnected()) {
        this.wsClient.send('clear', {});
      }
      
      this.updateUndoRedoButtons();
    }
  }
  download() {
    const dataUrl = this.canvasManager.exportImage();
    const link = document.createElement('a');
    link.download = `canvas-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }
  updateUndoRedoButtons() {
    const state = this.canvasManager.getState();
    
    document.getElementById('undo-btn').disabled = !state.canUndo;
    document.getElementById('redo-btn').disabled = !state.canRedo;
  }
  updateUserCount() {
    document.getElementById('user-count').textContent = 
      `${this.users.length} online`;
  }
  updateRemoteCursor(userId, x, y, color) {
    let cursor = this.remoteCursors.get(userId);
    
    if (!cursor) {
      cursor = document.createElement('div');
      cursor.className = 'remote-cursor';
      cursor.style.backgroundColor = color;
      document.getElementById('cursors-container').appendChild(cursor);
      this.remoteCursors.set(userId, cursor);
    }
    
    cursor.style.left = x + 'px';
    cursor.style.top = y + 'px';
    clearTimeout(cursor.hideTimeout);
    cursor.style.opacity = '1';
    cursor.hideTimeout = setTimeout(() => {
      cursor.style.opacity = '0';
    }, 2000);
  }
  removeRemoteCursor(userId) {
    const cursor = this.remoteCursors.get(userId);
    if (cursor) {
      cursor.remove();
      this.remoteCursors.delete(userId);
    }
  }
}
document.addEventListener('DOMContentLoaded', () => {
  new CollaborativeCanvas();
});