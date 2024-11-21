const logger = (req, res, next) => {
  // Log request details
  console.log(`${req.method} ${req.url}`);
  
  // Log request body for debugging (remove in production)
  if (req.method === 'POST') {
    console.log('Request body:', req.body);
  }

  next();
};

module.exports = logger; 