const express = require('express');
const router = express.Router();
const authService = require('../services/authService');
const { validateRegister } = require('../middleware/validate');

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', validateRegister, async (req, res, next) => {
  try {
    const { user, token } = await authService.register(req.body);
    
    res.status(201).json({
      status: 'success',
      data: {
        user,
        token
      }
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const { user, token } = await authService.login(email, password);
    
    res.status(200).json({
      status: 'success',
      data: { 
        user,
        token
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 