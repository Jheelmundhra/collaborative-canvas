/**
 * WebSocketClient - Manages WebSocket connection and message handling
 * Implements reconnection logic and latency monitoring
 */
export class WebSocketClient {
    constructor(onMessage, onConnectionChange) {
      this.socket = null;
      this.onMessage = onMessage;
      this.onConnectionChange = onConnectionChange;
      
      this.userId = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 1000;
      
      // Latency tracking
      this.latency = 0;
      this.lastPingTime = 0;
      
      // Message queue for when disconnected
      this.messageQueue = [];
    }
  
    /**
     * Connect to WebSocket server
     */
    connect() {
      try {
        // Initialize Socket.IO connection
        this.socket = io({
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay,
          reconnectionDelayMax: 5000,
          timeout: 20000
        });
  
        this.setupEventHandlers();
        
      } catch (error) {
        console.error('WebSocket connection error:', error);
        this.handleConnectionChange(false);
      }
    }
  
    /**
     * Setup Socket.IO event handlers
     */
    setupEventHandlers() {
      // Connection established
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.handleConnectionChange(true);
        
        // Flush message queue
        this.flushMessageQueue();
        
        // Start latency monitoring
        this.startLatencyMonitoring();
      });
  
      // Connection lost
      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.handleConnectionChange(false);
      });
  
      // Reconnection attempt
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
        this.reconnectAttempts = attemptNumber;
      });
  
      // Reconnection failed
      this.socket.on('reconnect_failed', () => {
        console.error('WebSocket reconnection failed');
        this.handleConnectionChange(false);
      });
  
      // Error handling
      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });
  
      // Initial state
      this.socket.on('init', (data) => {
        this.userId = data.userId;
        this.onMessage({ type: 'init', data });
      });
  
      // User joined
      this.socket.on('user-joined', (data) => {
        this.onMessage({ type: 'user-joined', data });
      });
  
      // User left
      this.socket.on('user-left', (data) => {
        this.onMessage({ type: 'user-left', data });
      });
  
      // Drawing events
      this.socket.on('draw', (data) => {
        this.onMessage({ type: 'draw', data });
      });
  
      // Operation completed
      this.socket.on('operation', (data) => {
        this.onMessage({ type: 'operation', data });
      });
  
      // Undo event
      this.socket.on('undo', (data) => {
        this.onMessage({ type: 'undo', data });
      });
  
      // Redo event
      this.socket.on('redo', (data) => {
        this.onMessage({ type: 'redo', data });
      });
  
      // Clear canvas
      this.socket.on('clear', (data) => {
        this.onMessage({ type: 'clear', data });
      });
  
      // Cursor movement
      this.socket.on('cursor', (data) => {
        this.onMessage({ type: 'cursor', data });
      });
  
      // Pong for latency
      this.socket.on('pong', () => {
        this.latency = Date.now() - this.lastPingTime;
      });
    }
  
    /**
     * Send message to server
     */
    send(event, data) {
      if (this.socket && this.socket.connected) {
        this.socket.emit(event, data);
      } else {
        // Queue message if disconnected
        this.messageQueue.push({ event, data });
      }
    }
  
    /**
     * Flush queued messages
     */
    flushMessageQueue() {
      while (this.messageQueue.length > 0) {
        const { event, data } = this.messageQueue.shift();
        this.socket.emit(event, data);
      }
    }
  
    /**
     * Handle connection state change
     */
    handleConnectionChange(connected) {
      if (this.onConnectionChange) {
        this.onConnectionChange(connected, this.latency);
      }
    }
  
    /**
     * Start latency monitoring
     */
    startLatencyMonitoring() {
      // Ping every 5 seconds
      this.latencyInterval = setInterval(() => {
        if (this.socket && this.socket.connected) {
          this.lastPingTime = Date.now();
          this.socket.emit('ping');
        }
      }, 5000);
    }
  
    /**
     * Stop latency monitoring
     */
    stopLatencyMonitoring() {
      if (this.latencyInterval) {
        clearInterval(this.latencyInterval);
      }
    }
  
    /**
     * Disconnect from server
     */
    disconnect() {
      this.stopLatencyMonitoring();
      
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    }
  
    /**
     * Check if connected
     */
    isConnected() {
      return this.socket && this.socket.connected;
    }
  
    /**
     * Get current latency
     */
    getLatency() {
      return this.latency;
    }
  
    /**
     * Get user ID
     */
    getUserId() {
      return this.userId;
    }
  }
  
  export default WebSocketClient;