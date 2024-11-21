const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const Notification = require('../models/Notification');

// @desc    Get user notifications
// @route   GET /api/notifications
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 20;
    const skip = (page - 1) * limit;

    // Build query
    const query = { recipient: req.user.id };

    // Filter by read status
    if (req.query.read !== undefined) {
      query.read = req.query.read === 'true';
    }

    // Filter by type
    if (req.query.type) {
      query.type = req.query.type;
    }

    // Get notifications
    const notifications = await Notification.find(query)
      .sort('-createdAt')
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'relatedId',
        select: 'status service scheduledDate amount',
        model: function(doc) {
          return doc.onModel;
        }
      });

    // Get total count
    const total = await Notification.countDocuments(query);

    // Get unread count
    const unreadCount = await Notification.countDocuments({
      recipient: req.user.id,
      read: false
    });

    res.status(200).json({
      status: 'success',
      results: notifications.length,
      data: {
        notifications,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Mark notifications as read
// @route   PATCH /api/notifications/read
// @access  Private
router.patch('/read', protect, async (req, res, next) => {
  try {
    const { notificationIds } = req.body;

    if (!notificationIds || !Array.isArray(notificationIds)) {
      return next(new AppError('Please provide notification IDs', 400));
    }

    await Notification.markManyAsRead(req.user.id, notificationIds);

    res.status(200).json({
      status: 'success',
      message: 'Notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Mark all notifications as read
// @route   PATCH /api/notifications/read-all
// @access  Private
router.patch('/read-all', protect, async (req, res, next) => {
  try {
    await Notification.updateMany(
      {
        recipient: req.user.id,
        read: false
      },
      { read: true }
    );

    res.status(200).json({
      status: 'success',
      message: 'All notifications marked as read'
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Delete notification
// @route   DELETE /api/notifications/:id
// @access  Private
router.delete('/:id', protect, async (req, res, next) => {
  try {
    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user.id
    });

    if (!notification) {
      return next(new AppError('Notification not found', 404));
    }

    await notification.remove();

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Clear old notifications
// @route   DELETE /api/notifications/clear
// @access  Private
router.delete('/clear', protect, async (req, res, next) => {
  try {
    const days = parseInt(req.query.days, 10) || 30;
    await Notification.clearOldNotifications(req.user.id, days);

    res.status(204).json({
      status: 'success',
      data: null
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get notification preferences
// @route   GET /api/notifications/preferences
// @access  Private
router.get('/preferences', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('notificationPreferences');

    res.status(200).json({
      status: 'success',
      data: {
        preferences: user.notificationPreferences || {}
      }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Update notification preferences
// @route   PATCH /api/notifications/preferences
// @access  Private
router.patch('/preferences', protect, async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        notificationPreferences: req.body
      },
      {
        new: true,
        runValidators: true
      }
    );

    res.status(200).json({
      status: 'success',
      data: {
        preferences: user.notificationPreferences
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 