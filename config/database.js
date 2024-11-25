const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Validate environment variables
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    // Debug log (only in development)
    if (process.env.NODE_ENV === 'development') {
      console.log('Attempting MongoDB connection...');
    }

    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      heartbeatFrequencyMS: 10000,
      autoIndex: process.env.NODE_ENV === 'development',
      retryWrites: true,
      w: 'majority'
    });

    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
    
    // Log database details in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Database: ${conn.connection.name}`);
      console.log(`🔌 Connection State: ${conn.connection.readyState}`);
    }

    return conn;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error.message);
    if (error.name === 'MongoServerSelectionError') {
      console.error('🔍 Please check if MongoDB server is running and accessible');
    }
    if (error.name === 'MongoParseError') {
      console.error('🔍 Invalid MongoDB connection string');
    }
    process.exit(1);
  }
};

// Simplified event handlers
mongoose.connection.on('disconnected', () => {
  console.log('🔌 MongoDB disconnected!');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('connected', () => {
  console.log('✅ MongoDB connection established successfully');
});

module.exports = connectDB; 