const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const hpp = require('hpp');

const securityMiddleware = (app) => {
  // Set security HTTP headers
  app.use(helmet());

  // Data sanitization against NoSQL query injection
  app.use(mongoSanitize());

  // Data sanitization against XSS
  app.use(xss());

  // Prevent parameter pollution
  app.use(hpp({
    whitelist: [
      'price',
      'rating',
      'duration',
      'difficulty',
      'maxGroupSize'
    ]
  }));
};

module.exports = securityMiddleware; 