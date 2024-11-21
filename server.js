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
const socketInit = require('./utils/socketInit');

// Route imports
const userRoutes = require('./routes/users');
const bookingRoutes = require('./routes/bookings');
const chatRoutes = require('./routes/chats');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const payoutRoutes = require('./routes/payouts');

const app = express();

// Add this at the very top, before any other code
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message, err.stack);
  process.exit(1);
});

// Trust proxy - Add this before other middleware
app.set('trust proxy', 1);

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
  message: 'Too many requests from this IP, please try again in an hour!',
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  // Add trusted proxy configuration
  trustProxy: true
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
  origin: process.env.NODE_ENV === 'production' 
    ? process.env.CORS_ORIGIN 
    : '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  exposedHeaders: ['set-cookie']
}));

// Compression middleware
app.use(compression());

// Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/users', userRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/chats', chatRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payouts', payoutRoutes);

// 404 handler comes after routes
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

// Create HTTP server first
const server = require('http').createServer(app);

// Initialize Socket.IO
const io = socketInit(server);

// Initialize socket handler
const SocketHandler = require('./utils/socketHandler');
const socketHandler = new SocketHandler(io);
socketHandler.initialize();

// Export only what's needed
module.exports = { app, server };

// Start the server
const startServer = async () => {
  try {
    // Connect to database first
    const dbConnected = await connectDB();
    if (!dbConnected && process.env.NODE_ENV === 'production') {
      throw new Error('Database connection failed');
    }

    // Start server only after successful DB connection
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`
        Server Started Successfully
        -------------------------
        Port: ${PORT}
        Environment: ${process.env.NODE_ENV}
        MongoDB Host: ${mongoose.connection.host}
        Date: ${new Date().toISOString()}
        -------------------------
      `);
    }).on('error', (err) => {
      console.error('Server failed to start:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

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