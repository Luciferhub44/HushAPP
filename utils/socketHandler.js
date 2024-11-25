const Chat = require('../models/Chat');
const User = require('../models/User');
const Notification = require('../models/Notification');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.connectedUsers = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      this.setupEventListeners(socket);
    });
  }

  handleConnection(socket) {
    socket.on('authenticate', (userId) => {
      this.connectedUsers.set(userId, socket.id);
      socket.userId = userId;
      console.log(`👤 User ${userId} authenticated on socket ${socket.id}`);
    });

    socket.on('disconnect', () => {
      if (socket.userId) {
        this.connectedUsers.delete(socket.userId);
        console.log(`👤 User ${socket.userId} disconnected`);
      }
    });
  }

  setupEventListeners(socket) {
    // Chat events
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
    });

    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
    });
  }

  // Utility methods
  isUserOnline(userId) {
    return this.connectedUsers.has(userId);
  }

  getUserSocketId(userId) {
    return this.connectedUsers.get(userId);
  }
}

module.exports = SocketHandler; 