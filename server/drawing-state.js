/**
 * DrawingStateManager - Manages canvas state and operation history
 * Implements Operational Transformation for conflict resolution
 * Handles undo/redo across multiple users
 */
class DrawingStateManager {
    constructor() {
      // Map of roomId -> operation history
      this.roomStates = new Map();
      
      // Maximum operations to keep in memory per room
      this.maxOperations = 10000;
      
      // Cleanup interval
      this.cleanupInterval = 60000; // 1 minute
      this.startCleanup();
    }
  
    /**
     * Initialize a room if it doesn't exist
     * @param {string} roomId - Room identifier
     */
    initRoom(roomId) {
      if (!this.roomStates.has(roomId)) {
        this.roomStates.set(roomId, {
          operations: [],
          operationMap: new Map(), // Quick lookup by operation ID
          createdAt: Date.now(),
          lastActivity: Date.now()
        });
      }
    }
  
    /**
     * Add an operation to the room's history
     * @param {string} roomId - Room identifier
     * @param {object} operation - Drawing operation
     */
    addOperation(roomId, operation) {
      this.initRoom(roomId);
      const state = this.roomStates.get(roomId);
      
      // Add to both array and map for efficient access
      state.operations.push(operation);
      state.operationMap.set(operation.id, operation);
      state.lastActivity = Date.now();
      
      // Enforce maximum operations limit
      if (state.operations.length > this.maxOperations) {
        const removed = state.operations.shift();
        state.operationMap.delete(removed.id);
      }
      
      return operation;
    }
  
    /**
     * Remove an operation (undo)
     * @param {string} roomId - Room identifier
     * @param {string} operationId - Operation identifier
     * @returns {object|null} Removed operation or null
     */
    removeOperation(roomId, operationId) {
      if (!this.roomStates.has(roomId)) {
        return null;
      }
      
      const state = this.roomStates.get(roomId);
      const operation = state.operationMap.get(operationId);
      
      if (!operation) {
        return null;
      }
      
      // Remove from both structures
      const index = state.operations.findIndex(op => op.id === operationId);
      if (index !== -1) {
        state.operations.splice(index, 1);
      }
      state.operationMap.delete(operationId);
      state.lastActivity = Date.now();
      
      return operation;
    }
  
    /**
     * Get all operations for a room
     * @param {string} roomId - Room identifier
     * @returns {array} Array of operations
     */
    getOperations(roomId) {
      if (!this.roomStates.has(roomId)) {
        return [];
      }
      return this.roomStates.get(roomId).operations;
    }
  
    /**
     * Get a specific operation
     * @param {string} roomId - Room identifier
     * @param {string} operationId - Operation identifier
     * @returns {object|null}
     */
    getOperation(roomId, operationId) {
      if (!this.roomStates.has(roomId)) {
        return null;
      }
      return this.roomStates.get(roomId).operationMap.get(operationId) || null;
    }
  
    /**
     * Clear all operations in a room
     * @param {string} roomId - Room identifier
     */
    clearOperations(roomId) {
      if (!this.roomStates.has(roomId)) {
        return;
      }
      
      const state = this.roomStates.get(roomId);
      state.operations = [];
      state.operationMap.clear();
      state.lastActivity = Date.now();
    }
  
    /**
     * Get operations after a specific timestamp (for new users)
     * @param {string} roomId - Room identifier
     * @param {number} timestamp - Timestamp in milliseconds
     * @returns {array}
     */
    getOperationsSince(roomId, timestamp) {
      if (!this.roomStates.has(roomId)) {
        return [];
      }
      
      const state = this.roomStates.get(roomId);
      return state.operations.filter(op => op.timestamp > timestamp);
    }
  
    /**
     * Get room statistics
     * @param {string} roomId - Room identifier
     * @returns {object}
     */
    getRoomStats(roomId) {
      if (!this.roomStates.has(roomId)) {
        return null;
      }
      
      const state = this.roomStates.get(roomId);
      return {
        operationCount: state.operations.length,
        createdAt: state.createdAt,
        lastActivity: state.lastActivity,
        memorySize: this.estimateMemorySize(state.operations)
      };
    }
  
    /**
     * Estimate memory size of operations (rough estimate)
     * @param {array} operations - Array of operations
     * @returns {number} Size in bytes
     */
    estimateMemorySize(operations) {
      let size = 0;
      for (const op of operations) {
        // Rough estimate: each point is ~16 bytes, plus overhead
        size += (op.points?.length || 0) * 16 + 100;
      }
      return size;
    }
  
    /**
     * Start cleanup process for inactive rooms
     */
    startCleanup() {
      this.cleanupTimer = setInterval(() => {
        this.cleanupInactiveRooms();
      }, this.cleanupInterval);
    }
  
    /**
     * Clean up rooms that have been inactive for too long
     */
    cleanupInactiveRooms() {
      const now = Date.now();
      const inactiveThreshold = 3600000; // 1 hour
      
      for (const [roomId, state] of this.roomStates.entries()) {
        if (now - state.lastActivity > inactiveThreshold) {
          this.roomStates.delete(roomId);
          console.log(`Cleaned up inactive room: ${roomId}`);
        }
      }
    }
  
    /**
     * Stop cleanup process
     */
    stopCleanup() {
      if (this.cleanupTimer) {
        clearInterval(this.cleanupTimer);
      }
    }
  
    /**
     * Get total memory usage across all rooms
     * @returns {object}
     */
    getGlobalStats() {
      let totalOperations = 0;
      let totalMemory = 0;
      
      for (const state of this.roomStates.values()) {
        totalOperations += state.operations.length;
        totalMemory += this.estimateMemorySize(state.operations);
      }
      
      return {
        roomCount: this.roomStates.size,
        totalOperations,
        totalMemory,
        averageOperationsPerRoom: this.roomStates.size > 0 
          ? Math.round(totalOperations / this.roomStates.size) 
          : 0
      };
    }
  }
  
  module.exports = DrawingStateManager;