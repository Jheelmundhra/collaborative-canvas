export class WebSocketClient {
    constructor(onMessage, onConnectionChange) {
      this.socket = null;
      this.onMessage = onMessage;
      this.onConnectionChange = onConnectionChange;
      
      this.userId = null;
      this.reconnectAttempts = 0;
      this.maxReconnectAttempts = 5;
      this.reconnectDelay = 1000;
      
      this.latency = 0;
      this.lastPingTime = 0;

      this.messageQueue = [];
    }
    connect() {
      try {
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
    setupEventHandlers() {
      
      this.socket.on('connect', () => {
        console.log('WebSocket connected');
        this.reconnectAttempts = 0;
        this.handleConnectionChange(true);

        this.flushMessageQueue();
   
        this.startLatencyMonitoring();
      });
  
      this.socket.on('disconnect', (reason) => {
        console.log('WebSocket disconnected:', reason);
        this.handleConnectionChange(false);
      });
  
      this.socket.on('reconnect_attempt', (attemptNumber) => {
        console.log(`Reconnection attempt ${attemptNumber}/${this.maxReconnectAttempts}`);
        this.reconnectAttempts = attemptNumber;
      });

      this.socket.on('reconnect_failed', () => {
        console.error('WebSocket reconnection failed');
        this.handleConnectionChange(false);
      });

      this.socket.on('error', (error) => {
        console.error('WebSocket error:', error);
      });

      this.socket.on('init', (data) => {
        this.userId = data.userId;
        this.onMessage({ type: 'init', data });
      });

      this.socket.on('user-joined', (data) => {
        this.onMessage({ type: 'user-joined', data });
      });

      this.socket.on('user-left', (data) => {
        this.onMessage({ type: 'user-left', data });
      });

      this.socket.on('draw', (data) => {
        this.onMessage({ type: 'draw', data });
      });

      this.socket.on('operation', (data) => {
        this.onMessage({ type: 'operation', data });
      });

      this.socket.on('undo', (data) => {
        this.onMessage({ type: 'undo', data });
      });

      this.socket.on('redo', (data) => {
        this.onMessage({ type: 'redo', data });
      });

      this.socket.on('clear', (data) => {
        this.onMessage({ type: 'clear', data });
      });

      this.socket.on('cursor', (data) => {
        this.onMessage({ type: 'cursor', data });
      });

      this.socket.on('pong', () => {
        this.latency = Date.now() - this.lastPingTime;
      });
    }
 
    send(event, data) {
      if (this.socket && this.socket.connected) {
        this.socket.emit(event, data);
      } else {
        this.messageQueue.push({ event, data });
      }
    }
 
    flushMessageQueue() {
      while (this.messageQueue.length > 0) {
        const { event, data } = this.messageQueue.shift();
        this.socket.emit(event, data);
      }
    }

    handleConnectionChange(connected) {
      if (this.onConnectionChange) {
        this.onConnectionChange(connected, this.latency);
      }
    }
 
    startLatencyMonitoring() {
      this.latencyInterval = setInterval(() => {
        if (this.socket && this.socket.connected) {
          this.lastPingTime = Date.now();
          this.socket.emit('ping');
        }
      }, 5000);
    }
 
    stopLatencyMonitoring() {
      if (this.latencyInterval) {
        clearInterval(this.latencyInterval);
      }
    }

    disconnect() {
      this.stopLatencyMonitoring();
      
      if (this.socket) {
        this.socket.disconnect();
        this.socket = null;
      }
    }

    isConnected() {
      return this.socket && this.socket.connected;
    }
 
    getLatency() {
      return this.latency;
    }
 
    getUserId() {
      return this.userId;
    }
  }
  
  export default WebSocketClient;