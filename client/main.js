/**
 * Main Application Entry Point
 * Coordinates canvas, WebSocket, and UI interactions
 */
import { CanvasManager } from './canvas.js';
import { WebSocketClient } from './websocket.js';

class CollaborativeCanvas {
  constructor() {
    // Core components
    this.canvas = null;
    this.canvasManager = null;
    this.wsClient = null;
    
    // Drawing state
    this.isDrawing = false;
    this.currentTool = 'brush';
    this.currentColor = '#3b82f6';
    this.strokeWidth = 3;
    
    // Users and cursors
    this.users = [];
    this.remoteCursors = new Map();
    
    // Performance optimization
    this.pendingPoints = [];
    this.animationFrame = null;
    this.lastCursorUpdate = 0;
    this.cursorThrottle = 50; // ms
    
    // Batch sending
    this.sendBatchTimeout = null;
    this.batchInterval = 16; // ~60fps
    
    this.initialize();
  }

  /**
   * Initialize the application
   */
  initialize() {
    // Get canvas element
    this.canvas = document.getElementById('drawing-canvas');
    if (!this.canvas) {
      console.error('Canvas element not found');
      return;
    }

    // Initialize canvas manager
    this.canvasManager = new CanvasManager(this.canvas);
    
    // Setup event listeners
    this.setupCanvasEvents();
    this.setupUIEvents();
    this.setupWindowEvents();
    
    // Initialize WebSocket
    this.initializeWebSocket();
  }

  /**
   * Initialize WebSocket connection
   */
  initializeWebSocket() {
    this.wsClient = new WebSocketClient(
      this.handleWebSocketMessage.bind(this),
      this.handleConnectionChange.bind(this)
    );
    
    this.wsClient.connect();
  }

  /**
   * Handle WebSocket messages
   */
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

  /**
   * Handle initial state
   */
  handleInit(data) {
    console.log('Initialized with data:', data);
    this.users = data.users || [];
    this.updateUserCount();
    
    if (data.operations && data.operations.length > 0) {
      this.canvasManager.loadOperations(data.operations);
    }
    
    this.updateUndoRedoButtons();
  }

  /**
   * Handle user joined
   */
  handleUserJoined(data) {
    console.log('User joined:', data);
    this.users.push(data);
    this.updateUserCount();
  }

  /**
   * Handle user left
   */
  handleUserLeft(data) {
    console.log('User left:', data);
    this.users = this.users.filter(u => u.id !== data.userId);
    this.updateUserCount();
    this.removeRemoteCursor(data.userId);
  }

  /**
   * Handle remote drawing (real-time)
   */
  handleRemoteDraw(data) {
    if (data.userId === this.wsClient.getUserId()) return;
    
    // Draw the stroke in real-time
    this.canvasManager.drawStroke(
      data.points,
      data.color,
      data.width,
      data.tool
    );
  }

  /**
   * Handle remote operation (completed stroke)
   */
  handleRemoteOperation(data) {
    if (data.userId === this.wsClient.getUserId()) return;
    
    this.canvasManager.addRemoteOperation(data.operation);
    this.updateUndoRedoButtons();
  }

  /**
   * Handle remote undo
   */
  handleRemoteUndo(data) {
    this.canvasManager.removeOperation(data.operationId);
    this.updateUndoRedoButtons();
  }

  /**
   * Handle remote redo
   */
  handleRemoteRedo(data) {
    this.canvasManager.addRemoteOperation(data.operation);
    this.updateUndoRedoButtons();
  }

  /**
   * Handle remote clear
   */
  handleRemoteClear(data) {
    this.canvasManager.clear();
    this.updateUndoRedoButtons();
  }

  /**
   * Handle remote cursor
   */
  handleRemoteCursor(data) {
    if (data.userId === this.wsClient.getUserId()) return;
    
    this.updateRemoteCursor(data.userId, data.x, data.y, data.color);
  }

  /**
   * Handle connection state change
   */
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

  /**
   * Setup canvas event listeners
   */
  setupCanvasEvents() {
    // Mouse events
    this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.canvas.addEventListener('mouseleave', this.handleMouseUp.bind(this));
    
    // Touch events
    this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
    this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
    this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this), { passive: false });
  }

  /**
   * Setup UI event listeners
   */
  setupUIEvents() {
    // Tool buttons
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setTool(btn.dataset.tool);
      });
    });
    
    // Color buttons
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setColor(btn.dataset.color);
      });
    });
    
    // Stroke width
    const strokeSlider = document.getElementById('stroke-width');
    const strokeValue = document.getElementById('stroke-value');
    strokeSlider.addEventListener('input', (e) => {
      this.strokeWidth = parseInt(e.target.value);
      strokeValue.textContent = this.strokeWidth;
    });
    
    // Action buttons
    document.getElementById('undo-btn').addEventListener('click', () => this.undo());
    document.getElementById('redo-btn').addEventListener('click', () => this.redo());
    document.getElementById('clear-btn').addEventListener('click', () => this.clear());
    document.getElementById('download-btn').addEventListener('click', () => this.download());
  }

  /**
   * Setup window event listeners
   */
  setupWindowEvents() {
    window.addEventListener('resize', () => {
      this.canvasManager.resize();
      this.canvasManager.redraw();
    });
    
    window.addEventListener('beforeunload', () => {
      this.wsClient.disconnect();
    });
  }

  /**
   * Handle mouse down
   */
  handleMouseDown(e) {
    const coords = this.canvasManager.getCanvasCoordinates(e);
    this.startDrawing(coords.x, coords.y);
  }

  /**
   * Handle mouse move
   */
  handleMouseMove(e) {
    const coords = this.canvasManager.getCanvasCoordinates(e);
    
    if (this.isDrawing) {
      this.draw(coords.x, coords.y);
    }
    
    this.sendCursor(coords.x, coords.y);
  }

  /**
   * Handle mouse up
   */
  handleMouseUp(e) {
    this.stopDrawing();
  }

  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = this.canvasManager.getCanvasCoordinates(touch);
    this.startDrawing(coords.x, coords.y);
  }

  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const coords = this.canvasManager.getCanvasCoordinates(touch);
    this.draw(coords.x, coords.y);
  }

  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    e.preventDefault();
    this.stopDrawing();
  }

  /**
   * Start drawing
   */
  startDrawing(x, y) {
    this.isDrawing = true;
    this.canvasManager.startDrawing(x, y, this.currentColor, this.strokeWidth, this.currentTool);
    this.pendingPoints = [{ x, y }];
    
    // Draw the starting point immediately
    this.canvasManager.drawStroke([{ x, y }], this.currentColor, this.strokeWidth, this.currentTool);
  }

  /**
   * Draw
   */
  draw(x, y) {
    if (!this.isDrawing) return;
    
    this.canvasManager.addPoint(x, y);
    this.pendingPoints.push({ x, y });
    
    // Draw locally immediately for smooth experience
    if (this.pendingPoints.length >= 2) {
      const lastTwo = this.pendingPoints.slice(-2);
      this.canvasManager.drawStroke(
        lastTwo,
        this.currentColor,
        this.strokeWidth,
        this.currentTool
      );
    }
    
    // Batch and send to server
    this.scheduleBatchSend();
  }

  /**
   * Schedule batched send to server
   */
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
        
        // Keep only the last point for continuity
        if (this.pendingPoints.length > 1) {
          this.pendingPoints = [this.pendingPoints[this.pendingPoints.length - 1]];
        }
      }
      
      this.sendBatchTimeout = null;
    }, this.batchInterval);
  }

  /**
   * Stop drawing
   */
  stopDrawing() {
    if (!this.isDrawing) return;
    
    // Clear any pending batch send
    if (this.sendBatchTimeout) {
      clearTimeout(this.sendBatchTimeout);
      this.sendBatchTimeout = null;
    }
    
    // Send final batch if needed
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

  /**
   * Send cursor position (throttled)
   */
  sendCursor(x, y) {
    const now = Date.now();
    if (now - this.lastCursorUpdate > this.cursorThrottle) {
      if (this.wsClient.isConnected()) {
        this.wsClient.send('cursor', { x, y, color: this.currentColor });
      }
      this.lastCursorUpdate = now;
    }
  }

  /**
   * Set current tool
   */
  setTool(tool) {
    this.currentTool = tool;
    
    document.querySelectorAll('.tool-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tool === tool);
    });
    
    console.log('Tool changed to:', tool);
  }

  /**
   * Set current color
   */
  setColor(color) {
    this.currentColor = color;
    
    document.querySelectorAll('.color-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.color === color);
    });
    
    console.log('Color changed to:', color);
  }

  /**
   * Undo
   */
  undo() {
    const operation = this.canvasManager.undo();
    
    if (operation && this.wsClient.isConnected()) {
      this.wsClient.send('undo', { operationId: operation.id });
    }
    
    this.updateUndoRedoButtons();
  }

  /**
   * Redo
   */
  redo() {
    const operation = this.canvasManager.redo();
    
    if (operation && this.wsClient.isConnected()) {
      this.wsClient.send('redo', { operation });
    }
    
    this.updateUndoRedoButtons();
  }

  /**
   * Clear canvas
   */
  clear() {
    if (confirm('Clear the entire canvas for all users? This action cannot be undone.')) {
      this.canvasManager.clear();
      
      if (this.wsClient.isConnected()) {
        this.wsClient.send('clear', {});
      }
      
      this.updateUndoRedoButtons();
    }
  }

  /**
   * Download canvas
   */
  download() {
    const dataUrl = this.canvasManager.exportImage();
    const link = document.createElement('a');
    link.download = `canvas-${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
  }

  /**
   * Update undo/redo button states
   */
  updateUndoRedoButtons() {
    const state = this.canvasManager.getState();
    
    document.getElementById('undo-btn').disabled = !state.canUndo;
    document.getElementById('redo-btn').disabled = !state.canRedo;
  }

  /**
   * Update user count display
   */
  updateUserCount() {
    document.getElementById('user-count').textContent = 
      `${this.users.length} online`;
  }

  /**
   * Update remote cursor position
   */
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
    
    // Auto-hide after inactivity
    clearTimeout(cursor.hideTimeout);
    cursor.style.opacity = '1';
    cursor.hideTimeout = setTimeout(() => {
      cursor.style.opacity = '0';
    }, 2000);
  }

  /**
   * Remove remote cursor
   */
  removeRemoteCursor(userId) {
    const cursor = this.remoteCursors.get(userId);
    if (cursor) {
      cursor.remove();
      this.remoteCursors.delete(userId);
    }
  }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  new CollaborativeCanvas();
});