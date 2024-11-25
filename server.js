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
const { adminRouter } = require('./config/adminConfig');
const path = require('path');

// Route imports
const userRoutes = require('./routes/users');
const bookingRoutes = require('./routes/bookings');
const chatRoutes = require('./routes/chats');
const notificationRoutes = require('./routes/notifications');
const paymentRoutes = require('./routes/payments');
const payoutRoutes = require('./routes/payouts');
const disputeRoutes = require('./routes/disputes');

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

// Rate limiting
const { authLimiter, apiLimiter } = require('./middleware/rateLimiter');

// Apply rate limiters to specific routes
app.use('/api/auth', authLimiter);  // Rate limit auth routes
app.use('/api', apiLimiter);        // Rate limit all API routes

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

// Add a base API route and group all routes under it
const apiRouter = express.Router();
app.use('/api', apiRouter);

// Mount all routes on the API router
apiRouter.use('/users', userRoutes);
apiRouter.use('/bookings', bookingRoutes);
apiRouter.use('/chats', chatRoutes);
apiRouter.use('/notifications', notificationRoutes);
apiRouter.use('/payments', paymentRoutes);
apiRouter.use('/payouts', payoutRoutes);
apiRouter.use('/disputes', disputeRoutes);

// Serve static files for admin panel BEFORE admin routes
app.use('/admin', express.static(path.join(__dirname, 'public/admin')));

// Mount admin routes AFTER static files
app.use('/admin/api', adminRouter);

// Add a root route handler
app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Welcome to Hush API',
    version: '1.0.0'
  });
});

// Health check route should be at root level
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Server is healthy',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  });
});

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
const gracefulShutdown = async (server) => {
  console.log('🔄 Starting graceful shutdown...');
  
  try {
    await new Promise((resolve) => {
      server.close(resolve);
    });
    console.log('✅ Server closed');
    
    await mongoose.connection.close();
    console.log('✅ MongoDB connection closed');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
};

// Database connection with retry logic
const connectDB = require('./config/database');

// Create HTTP server first
const server = require('http').createServer(app);

// Initialize Socket.IO after server creation
const io = socketInit.initializeSocket(server);

// Initialize socket handler
const SocketHandler = require('./utils/socketHandler');
const socketHandler = new SocketHandler(io);
socketHandler.initialize();

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Export only what's needed
module.exports = { app, server, io };

// Start the server
const startServer = async () => {
  try {
    // Connect to database first
    const dbConnection = await connectDB();
    
    // Start server only after successful DB connection
    const PORT = process.env.PORT || 5000;
    server.listen(PORT, () => {
      console.log(`
        🚀 Server Started Successfully
        -------------------------
        🌐 Port: ${PORT}
        🔧 Environment: ${process.env.NODE_ENV}
        📦 MongoDB Host: ${dbConnection.connection.host}
        📅 Date: ${new Date().toISOString()}
        -------------------------
      `);
    }).on('error', (err) => {
      console.error('❌ Server failed to start:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
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
process.on('SIGTERM', async () => {
  console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
  await gracefulShutdown(server);
});

// Handle SIGINT
process.on('SIGINT', async () => {
  console.log('👋 SIGINT RECEIVED. Shutting down gracefully');
  await gracefulShutdown(server);
});