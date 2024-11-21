const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const socketInit = (server) => {
  const io = socketIo(server, {
    cors: {
      origin: process.env.NODE_ENV === 'production' 
        ? process.env.CORS_ORIGIN 
        : '*',
      methods: ['GET', 'POST']
    }
  });

  // Socket.IO middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      
      if (!user) {
        return next(new Error('User not found'));
      }

      socket.user = user;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Socket.IO error handling
  io.on('connect_error', (err) => {
    console.error('Socket.IO connection error:', err);
  });

  io.on('error', (err) => {
    console.error('Socket.IO error:', err);
  });

  return io;
};

module.exports = socketInit; 