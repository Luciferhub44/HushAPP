const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('Attempting to connect to MongoDB...');
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      heartbeatFrequencyMS: 10000,
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
    return false;
  }
};

let retryCount = 0;
const maxRetries = 5;

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected! Attempting to reconnect...');
  if (retryCount < maxRetries) {
    const timeout = Math.min(1000 * Math.pow(2, retryCount), 10000);
    retryCount++;
    console.log(`Retry attempt ${retryCount} of ${maxRetries} in ${timeout}ms`);
    setTimeout(connectDB, timeout);
  } else {
    console.error('Max reconnection attempts reached. Please check your database connection.');
    if (process.env.NODE_ENV === 'development') {
      process.exit(1);
    }
  }
});

mongoose.connection.on('connected', () => {
  console.log('MongoDB connected successfully');
  retryCount = 0;
});

mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

module.exports = connectDB; 