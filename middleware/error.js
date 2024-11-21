// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    this.isOperational = true;

    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  console.error(err.stack);

  // Add specific handling for validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: err.message,
      details: Object.values(err.errors).map(error => error.message)
    });
  }

  // Handle duplicate key errors (e.g., duplicate email)
  if (err.code === 11000) {
    return res.status(400).json({
      success: false,
      error: 'Duplicate field value entered'
    });
  }

  res.status(err.statusCode || 500).json({
    success: false,
    error: err.message || 'Server Error'
  });
};

module.exports = {
  AppError,
  errorHandler
}; 