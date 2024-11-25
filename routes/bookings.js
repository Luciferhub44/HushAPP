const router = require('express').Router();
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { io } = require('../server');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
router.post('/', protect, async (req, res, next) => {
  try {
    // Log the request body for debugging
    console.log('Creating booking with data:', req.body);

    // Check if artisan exists and is available
    const artisan = await User.findOne({
      _id: req.body.artisan,
      userType: 'artisan'
    });

    if (!artisan) {
      return next(new AppError('Artisan not found', 404));
    }

    // Create booking
    const booking = await Booking.create({
      user: req.user.id,
      artisan: req.body.artisan,
      service: req.body.service,
      description: req.body.description,
      location: req.body.location,
      scheduledDate: req.body.scheduledDate,
      estimatedDuration: req.body.estimatedDuration,
      price: req.body.price,
      status: 'pending'
    });

    // Create notification with onModel field
    const notification = await Notification.create({
      recipient: artisan._id,
      title: 'New Booking Request',
      message: `You have a new booking request for ${req.body.service}`,
      type: 'booking',
      relatedId: booking._id,
      onModel: 'Booking'
    });

    // Emit socket event if io is available
    if (io) {
      try {
        io.to(artisan._id.toString()).emit('newBooking', {
          booking,
          notification
        });
      } catch (socketError) {
        console.error('Socket emission error:', socketError);
        // Continue execution even if socket emission fails
      }
    }

    res.status(201).json({
      status: 'success',
      data: { booking }
    });

  } catch (err) {
    console.error('Booking creation error:', err);
    next(err);
  }
});

// @desc    Get user bookings with filters
// @route   GET /api/bookings/my-bookings
// @access  Private
router.get('/my-bookings', protect, async (req, res, next) => {
  try {
    const query = { user: req.user.id };

    // Filter by status
    if (req.query.status) {
      query.status = req.query.status;
    }

    // Filter by date range
    if (req.query.startDate && req.query.endDate) {
      query.scheduledDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    }

    // Filter by service type
    if (req.query.service) {
      query.service = req.query.service;
    }

    const bookings = await Booking.find(query)
      .populate('artisan', 'username artisanProfile.businessName')
      .sort('-scheduledDate');

    res.status(200).json({
      status: 'success',
      results: bookings.length,
      data: { bookings }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get artisan bookings with analytics
// @route   GET /api/bookings/my-jobs
// @access  Private/Artisan
router.get('/my-jobs', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const query = { artisan: req.user.id };

    // Apply filters
    if (req.query.status) query.status = req.query.status;
    if (req.query.service) query.service = req.query.service;

    const bookings = await Booking.find(query)
      .populate('user', 'username phoneNumber')
      .sort('-scheduledDate');

    // Calculate analytics
    const analytics = {
      total: bookings.length,
      completed: bookings.filter(b => b.status === 'completed').length,
      pending: bookings.filter(b => b.status === 'pending').length,
      inProgress: bookings.filter(b => b.status === 'in-progress').length,
      totalEarnings: bookings
        .filter(b => b.status === 'completed')
        .reduce((sum, booking) => sum + booking.price, 0),
      averageRating: bookings
        .filter(b => b.rating)
        .reduce((sum, booking, index, array) => {
          sum += booking.rating;
          if (index === array.length - 1) return sum / array.length;
          return sum;
        }, 0)
    };

    res.status(200).json({
      status: 'success',
      data: { 
        bookings,
        analytics
      }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Update booking status
// @route   PATCH /api/bookings/:id/status
// @access  Private/Artisan
router.patch('/:id/status', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const { status } = req.body;
    const booking = await Booking.findById(req.params.id);

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.artisan.toString() !== req.user.id) {
      return next(new AppError('Not authorized to update this booking', 403));
    }

    booking.status = status;
    await booking.save();

    // Notify user about status change
    await Notification.create({
      recipient: booking.user,
      title: 'Booking Status Updated',
      message: `Your booking status has been updated to ${status}`,
      type: 'booking_update',
      relatedId: booking._id
    });

    res.status(200).json({
      status: 'success',
      data: { booking }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Add review and rating
// @route   POST /api/bookings/:id/review
// @access  Private
router.post('/:id/review', protect, async (req, res, next) => {
  try {
    const { error } = reviewValidation.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: 'completed'
    });

    if (!booking) {
      return next(new AppError('Booking not found or not completed', 404));
    }

    if (booking.rating) {
      return next(new AppError('Review already submitted', 400));
    }

    booking.rating = req.body.rating;
    booking.review = req.body.review;
    await booking.save();

    // Update artisan ratings
    const artisan = await User.findById(booking.artisan);
    const bookings = await Booking.find({
      artisan: booking.artisan,
      rating: { $exists: true }
    });

    const avgRating = bookings.reduce((acc, curr) => acc + curr.rating, 0) / bookings.length;

    artisan.artisanProfile.rating = avgRating;
    artisan.artisanProfile.numReviews = bookings.length;
    await artisan.save();

    // Create notification for artisan
    const notification = await Notification.create({
      recipient: booking.artisan,
      title: 'New Review',
      message: `You received a ${req.body.rating}-star review`,
      type: 'review',
      relatedId: booking._id,
      onModel: 'Booking'
    });

    // Emit real-time notification
    io.to(booking.artisan.toString()).emit('newReview', {
      booking,
      notification
    });

    res.status(200).json({
      status: 'success',
      data: { booking }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 