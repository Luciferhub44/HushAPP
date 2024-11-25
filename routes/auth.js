const express = require('express');
const authService = require('../services/authService');
const { protect } = require('../middleware/auth');

const router = express.Router();

router.post('/register', async (req, res, next) => {
  try {
    const user = await authService.register(req.body);
    res.status(201).json({
      success: true,
      message: 'Registration successful. Please verify your phone number and email.',
      data: {
        userId: user._id
      }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/verify-otp', async (req, res, next) => {
  try {
    const { userId, otp, type } = req.body;
    const user = await authService.verifyOTP(userId, otp, type);
    res.status(200).json({
      success: true,
      message: `${type} verification successful`,
      data: { user }
    });
  } catch (err) {
    next(err);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;
    const { token, user } = await authService.login(phoneNumber, password);
    res.status(200).json({
      success: true,
      token,
      data: { user }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 