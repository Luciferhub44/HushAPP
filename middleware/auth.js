const jwt = require('jsonwebtoken');
const { AppError } = require('./error');
const User = require('../models/User');

exports.protect = async (req, res, next) => {
  try {
    let token;

    // Get token from header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next(new AppError('Not authorized to access this route', 401));
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Get user from token
    const user = await User.findById(decoded.id);

    if (!user) {
      return next(new AppError('User not found', 404));
    }

    // Check if user changed password after token was issued
    if (user.changedPasswordAfter && user.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('User recently changed password. Please log in again', 401));
    }

    req.user = user;
    next();
  } catch (err) {
    next(new AppError('Not authorized to access this route', 401));
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.userType)) {
      return next(new AppError('Not authorized to access this route', 403));
    }
    next();
  };
};

module.exports = { protect: exports.protect, restrictTo: exports.restrictTo }; 