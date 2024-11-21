const rateLimit = require('express-rate-limit');
const { AppError } = require('./error');

const limiter = rateLimit({
  windowMs: process.env.RATE_LIMIT_WINDOW_MS || 60 * 60 * 1000, // 1 hour default
  max: process.env.RATE_LIMIT_MAX_REQUESTS || 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later',
  handler: (req, res, next, options) => {
    next(new AppError(options.message, 429));
  }
});

module.exports = limiter; 