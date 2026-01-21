class RoomManager {
    constructor() {
      this.rooms = new Map();
    }
  
    /**
     * Add a user to a room
     * @param {string} roomId - Room identifier
     * @param {object} userData - User data (id, color, name)
     */
    addUser(roomId, userData) {
      if (!this.rooms.has(roomId)) {
        this.rooms.set(roomId, new Map());
      }
      
      const room = this.rooms.get(roomId);
      room.set(userData.id, userData);
      
      console.log(`User ${userData.id} joined room ${roomId}`);
    }
  
    /**
     * Remove a user from a room
     * @param {string} roomId - Room identifier
     * @param {string} userId - User identifier
     */
    removeUser(roomId, userId) {
      if (!this.rooms.has(roomId)) {
        return false;
      }
      
      const room = this.rooms.get(roomId);
      const removed = room.delete(userId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
        console.log(`Room ${roomId} deleted (empty)`);
      }
      
      console.log(`User ${userId} left room ${roomId}`);
      return removed;
    }
  
    /**
     * Get all users in a room
     * @param {string} roomId - Room identifier
     * @returns {array} Array of user objects
     */
    getUsers(roomId) {
      if (!this.rooms.has(roomId)) {
        return [];
      }
      
      const room = this.rooms.get(roomId);
      return Array.from(room.values());
    }
  
    /**
     * Get a specific user
     * @param {string} roomId - Room identifier
     * @param {string} userId - User identifier
     * @returns {object|null} User object or null
     */
    getUser(roomId, userId) {
      if (!this.rooms.has(roomId)) {
        return null;
      }
      
      const room = this.rooms.get(roomId);
      return room.get(userId) || null;
    }
  
    /**
     * Check if a room exists
     * @param {string} roomId - Room identifier
     * @returns {boolean}
     */
    roomExists(roomId) {
      return this.rooms.has(roomId);
    }
  
    /**
     * Get user count in a room
     * @param {string} roomId - Room identifier
     * @returns {number}
     */
    getUserCount(roomId) {
      if (!this.rooms.has(roomId)) {
        return 0;
      }
      return this.rooms.get(roomId).size;
    }
  
    /**
     * Get total number of rooms
     * @returns {number}
     */
    getRoomCount() {
      return this.rooms.size;
    }
  
    /**
     * Get total number of users across all rooms
     * @returns {number}
     */
    getTotalUserCount() {
      let total = 0;
      for (const room of this.rooms.values()) {
        total += room.size;
      }
      return total;
    }
  
    /**
     * Get all room IDs
     * @returns {array}
     */
    getAllRoomIds() {
      return Array.from(this.rooms.keys());
    }
  }
  
  module.exports = RoomManager;