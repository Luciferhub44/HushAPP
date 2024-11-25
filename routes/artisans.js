const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const Artisan = require('../models/Artisans');
const AppError = require('../utils/AppError');

// @route   GET /api/artisans
// @desc    Get all artisans with filters
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const {
      specialty,
      rating,
      price,
      location,
      radius = 5000, // Default 5km radius
      page = 1,
      limit = 10
    } = req.query;

    const query = {};

    // Filter by specialty
    if (specialty) {
      query['services.category'] = specialty;
    }

    // Filter by rating
    if (rating) {
      query['stats.averageRating'] = { $gte: parseFloat(rating) };
    }

    // Filter by price range
    if (price) {
      const [min, max] = price.split('-');
      query['services.basePrice'] = {
        $gte: parseInt(min),
        $lte: parseInt(max)
      };
    }

    // Filter by location if coordinates provided
    if (location) {
      const [lng, lat] = location.split(',').map(Number);
      query.serviceArea = {
        $geoWithin: {
          $centerSphere: [[lng, lat], radius / 6378100] // Convert radius to radians
        }
      };
    }

    const artisans = await Artisan.find(query)
      .populate('user', 'username email phoneNumber')
      .skip((page - 1) * limit)
      .limit(limit)
      .sort('-stats.averageRating');

    const total = await Artisan.countDocuments(query);

    res.status(200).json({
      status: 'success',
      data: {
        artisans,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/artisans/:id
// @desc    Get artisan details
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const artisan = await Artisan.findById(req.params.id)
      .populate('user', 'username email phoneNumber')
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: 'username'
        }
      });

    if (!artisan) {
      return next(new AppError('Artisan not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { artisan }
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/artisans/:id/reviews
// @desc    Add review for artisan
// @access  Private
router.post('/:id/reviews', protect, async (req, res, next) => {
  try {
    const { rating, comment, bookingId } = req.body;

    const artisan = await Artisan.findById(req.params.id);
    if (!artisan) {
      return next(new AppError('Artisan not found', 404));
    }

    // Check if user has a completed booking with this artisan
    const hasValidBooking = await Booking.findOne({
      _id: bookingId,
      user: req.user.id,
      artisan: artisan.user,
      status: 'completed'
    });

    if (!hasValidBooking) {
      return next(new AppError('You can only review after a completed booking', 400));
    }

    // Check if user has already reviewed this booking
    const existingReview = artisan.reviews.find(
      review => review.booking.toString() === bookingId
    );

    if (existingReview) {
      return next(new AppError('You have already reviewed this booking', 400));
    }

    artisan.reviews.push({
      user: req.user.id,
      rating,
      comment,
      booking: bookingId
    });

    await artisan.calculateAverageRating();
    await artisan.save();

    res.status(201).json({
      status: 'success',
      data: {
        review: artisan.reviews[artisan.reviews.length - 1]
      }
    });
  } catch (err) {
    next(err);
  }
});

// @route   PATCH /api/artisans/availability
// @desc    Update artisan availability
// @access  Private
router.patch('/availability', protect, async (req, res, next) => {
  try {
    const artisan = await Artisan.findOne({ user: req.user.id });
    if (!artisan) {
      return next(new AppError('Artisan profile not found', 404));
    }

    const { schedule, customDates } = req.body;

    if (schedule) {
      artisan.availability.schedule = schedule;
    }

    if (customDates) {
      artisan.availability.customDates = customDates;
    }

    await artisan.save();

    res.status(200).json({
      status: 'success',
      data: {
        availability: artisan.availability
      }
    });
  } catch (err) {
    next(err);
  }
});

// @route   PATCH /api/artisans/location
// @desc    Update artisan current location
// @access  Private
router.patch('/location', protect, async (req, res, next) => {
  try {
    const { coordinates } = req.body;

    const artisan = await Artisan.findOne({ user: req.user.id });
    if (!artisan) {
      return next(new AppError('Artisan profile not found', 404));
    }

    artisan.status.currentLocation = {
      type: 'Point',
      coordinates
    };
    artisan.status.lastActive = Date.now();

    await artisan.save();

    res.status(200).json({
      status: 'success',
      data: {
        location: artisan.status.currentLocation
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 