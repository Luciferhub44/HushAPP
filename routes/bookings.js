const router = require('express').Router();
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const { createBookingValidation, updateBookingValidation, reviewValidation } = require('../validation/bookingValidation');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');
const { io } = require('../server');

// @desc    Create new booking
// @route   POST /api/bookings
// @access  Private
router.post('/', protect, async (req, res, next) => {
  try {
    // Validate request body
    const { error } = createBookingValidation.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    // Check if artisan exists and is available
    const artisan = await User.findOne({
      _id: req.body.artisan,
      userType: 'artisan',
      'artisanProfile.availability': true
    });

    if (!artisan) {
      return next(new AppError('Artisan not found or not available', 404));
    }

    // Create booking
    const booking = await Booking.create({
      ...req.body,
      user: req.user.id,
      status: 'pending'
    });

    // Create notification for artisan
    const notification = await Notification.create({
      recipient: artisan._id,
      title: 'New Booking Request',
      message: `You have a new booking request from ${req.user.username}`,
      type: 'booking',
      relatedId: booking._id,
      onModel: 'Booking'
    });

    // Emit real-time notification
    io.to(artisan._id.toString()).emit('newBooking', {
      booking,
      notification
    });

    res.status(201).json({
      status: 'success',
      data: { booking }
    });
  } catch (err) {
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
    const { error } = updateBookingValidation.validate(req.body);
    if (error) {
      return next(new AppError(error.details[0].message, 400));
    }

    const booking = await Booking.findOne({
      _id: req.params.id,
      artisan: req.user._id
    }).populate('user', 'username');

    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Validate status transition
    const validTransitions = {
      pending: ['accepted', 'rejected'],
      accepted: ['in-progress'],
      'in-progress': ['completed'],
      completed: [],
      rejected: [],
      cancelled: []
    };

    if (!validTransitions[booking.status].includes(req.body.status)) {
      return next(new AppError(`Invalid status transition from ${booking.status} to ${req.body.status}`, 400));
    }

    booking.status = req.body.status;
    if (req.body.status === 'rejected' || req.body.status === 'cancelled') {
      booking.cancellationReason = req.body.cancellationReason;
    }

    await booking.save();

    // Create notification for user
    const notification = await Notification.create({
      recipient: booking.user._id,
      title: 'Booking Update',
      message: `Your booking has been ${req.body.status}`,
      type: 'booking',
      relatedId: booking._id,
      onModel: 'Booking'
    });

    // Emit real-time update
    io.to(booking.user._id.toString()).emit('bookingUpdate', {
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