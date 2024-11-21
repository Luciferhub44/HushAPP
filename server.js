require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');
const compression = require('compression');
const morgan = require('morgan');
const { errorHandler } = require('./middleware/error');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const securityMiddleware = require('./middleware/security');
const corsMiddleware = require('./middleware/cors');
const rateLimiter = require('./middleware/rateLimiter');
const logger = require('./middleware/logger');

// Route imports
const userRoutes = require('./routes/users');
const bookingRoutes = require('./routes/bookings');
const chatRoutes = require('./routes/chats');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const payoutRoutes = require('./routes/payouts');

const app = express();

// Security Middleware
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(helmet()); // Set security HTTP headers
app.use(mongoSanitize()); // Data sanitization against NoSQL query injection
app.use(xss()); // Data sanitization against XSS
app.use(hpp()); // Prevent parameter pollution
app.use(logger);
app.use(corsMiddleware);
app.use(rateLimiter);

// Rate limiting
const limiter = rateLimit({
  max: 100, // Limit each IP to 100 requests per windowMs
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Enable CORS with configuration
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Compression middleware
app.use(compression());

// Routes
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);

// Handle undefined routes
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'error',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Error Handler (Should be last piece of middleware)
app.use(errorHandler);

// Graceful shutdown function
const gracefulShutdown = (server) => {
  console.log('Starting graceful shutdown...');
  server.close(() => {
    console.log('Server closed');
    mongoose.connection.close(false, () => {
      console.log('MongoDB connection closed');
      process.exit(0);
    });
  });

  // Force shutdown after 30 seconds
  setTimeout(() => {
    console.error('Could not close connections in time, forcefully shutting down');
    process.exit(1);
  }, 30000);
};

// Database connection with retry logic
const connectDB = require('./config/database');

connectDB();

// Create HTTP server
const server = require('http').createServer(app);

// Initialize Socket.IO
const io = socketIo(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
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

// Add this after creating the io instance
const SocketHandler = require('./utils/socketHandler');
const socketHandler = new SocketHandler(io);
socketHandler.initialize();

// Update the server start to use the HTTP server instead of app
server.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  gracefulShutdown(server);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Handle SIGTERM
process.on('SIGTERM', () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  gracefulShutdown(server);
});

// Handle SIGINT
process.on('SIGINT', () => {
  console.log('👋 SIGINT RECEIVED. Shutting down gracefully');
  gracefulShutdown(server);
});

// Export io instance for use in other files
module.exports.io = io;