const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/error');
const { protect, restrictTo } = require('../middleware/auth');
const { registerValidation, loginValidation, updateUserValidation } = require('../validation/userValidation');
const User = require('../models/User');

// Helper function to generate JWT token
const generateToken = (id, userType) => {
  return jwt.sign({ id, userType }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE
  });
};

// Helper function to send token response
const sendTokenResponse = (user, statusCode, res) => {
  const token = generateToken(user._id, user.userType);

  const cookieOptions = {
    expires: new Date(Date.now() + process.env.JWT_COOKIE_EXPIRE * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    cookieOptions.secure = true;
  }

  // Remove sensitive data
  user.password = undefined;

  res.status(statusCode)
    .cookie('token', token, cookieOptions)
    .json({
      status: 'success',
      token,
      data: { user }
    });
};

// @desc    Register user/artisan
// @route   POST /api/users/register
// @access  Public
router.post('/register', async (req, res, next) => {
  try {
    const { error } = registerValidation.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    // Check if user exists
    const userExists = await User.findOne({ 
      $or: [
        { email: req.body.email },
        { username: req.body.username }
      ]
    });

    if (userExists) {
      return next(new AppError('User with this email or username already exists', 400));
    }

    // Set role based on userType
    const role = req.body.userType === 'artisan' ? 'artisan' : 'user';

    // Create user
    const user = await User.create({
      ...req.body,
      role
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    next(err);
  }
});

// @desc    Login user/artisan
// @route   POST /api/users/login
// @access  Public
router.post('/login', async (req, res, next) => {
  try {
    const { error } = loginValidation.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const { email, password, userType } = req.body;

    // Check for user with correct userType
    const user = await User.findOne({ email, userType }).select('+password');
    if (!user) {
      return next(new AppError('Invalid credentials', 401));
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return next(new AppError('Invalid credentials', 401));
    }

    sendTokenResponse(user, 200, res);
  } catch (err) {
    next(err);
  }
});

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Update user profile
// @route   PUT /api/users/updateprofile
// @access  Private
router.put('/updateprofile', protect, async (req, res, next) => {
  try {
    const { error } = updateUserValidation.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const user = await User.findById(req.user.id);

    // Update basic fields
    if (req.body.username) user.username = req.body.username;
    if (req.body.email) user.email = req.body.email;
    if (req.body.phoneNumber) user.phoneNumber = req.body.phoneNumber;

    // Update artisan specific fields if user is artisan
    if (user.userType === 'artisan' && req.body.artisanProfile) {
      Object.assign(user.artisanProfile, req.body.artisanProfile);
    }

    await user.save();

    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (err) {
    next(err);
  }
});

// Artisan specific routes
router.use('/artisans', require('./artisans'));

module.exports = router; 