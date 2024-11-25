const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');

// @route   GET /api/users/me
// @desc    Get current user profile
// @access  Private
router.get('/me', protect, async (req, res, next) => {
  try {
    res.status(200).json({
      status: 'success',
      data: {
        user: {
          id: req.user._id,
          username: req.user.username,
          email: req.user.email,
          userType: req.user.userType
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 