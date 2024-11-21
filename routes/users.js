const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { AppError } = require('../middleware/error');
const { protect, restrictTo } = require('../middleware/auth');
const { registerValidation, loginValidation, updateUserValidation } = require('../validation/userValidation');
const User = require('../models/User');
const { validateRegister } = require('../middleware/validate');

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
router.post('/register', validateRegister, async (req, res, next) => {
  try {
    const { username, email, password, userType, phoneNumber, artisanProfile } = req.body;
    
    // Log sanitized request info (avoid logging full password)
    console.log('Registration attempt:', {
      username,
      email,
      userType,
      hasArtisanProfile: !!artisanProfile
    });

    // Check if user exists
    const userExists = await User.findOne({ 
      $or: [
        { email: email.toLowerCase() },
        { username: username.toLowerCase() }
      ]
    });

    if (userExists) {
      return next(new AppError('User with this email or username already exists', 400));
    }

    // Create user with all validated fields
    const user = await User.create({
      username: username.toLowerCase(),
      email: email.toLowerCase(),
      password,
      userType,
      phoneNumber,
      ...(userType === 'artisan' ? { artisanProfile } : {})
    });

    // Log successful registration (without sensitive data)
    console.log('User registered successfully:', {
      id: user._id,
      username: user.username,
      userType: user.userType
    });

    sendTokenResponse(user, 201, res);
  } catch (err) {
    console.error('Registration error:', {
      message: err.message,
      code: err.code
    });
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