const router = require('express').Router();
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const User = require('../models/User');
const Product = require('../models/Product');
const Booking = require('../models/Booking');
const { upload } = require('../config/cloudinary');

// @desc    Get all artisans
// @route   GET /api/users/artisans
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const query = { userType: 'artisan' };

    // Filter by specialty
    if (req.query.specialty) {
      query['artisanProfile.specialty'] = req.query.specialty;
    }

    // Filter by rating
    if (req.query.minRating) {
      query['artisanProfile.rating'] = { $gte: parseFloat(req.query.minRating) };
    }

    // Filter by availability
    if (req.query.available === 'true') {
      query['artisanProfile.availability'] = true;
    }

    // Filter by verification status
    if (req.query.verified === 'true') {
      query['artisanProfile.verified'] = true;
    }

    const artisans = await User.find(query)
      .select('username artisanProfile email phoneNumber');

    res.status(200).json({
      status: 'success',
      results: artisans.length,
      data: { artisans }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get nearby artisans
// @route   GET /api/users/artisans/nearby
// @access  Public
router.get('/nearby', async (req, res, next) => {
  try {
    const { longitude, latitude, maxDistance = 10000 } = req.query; // maxDistance in meters

    if (!longitude || !latitude) {
      return next(new AppError('Please provide longitude and latitude', 400));
    }

    const artisans = await User.find({
      userType: 'artisan',
      'artisanProfile.location': {
        $near: {
          $geometry: {
            type: 'Point',
            coordinates: [parseFloat(longitude), parseFloat(latitude)]
          },
          $maxDistance: parseInt(maxDistance)
        }
      }
    }).select('username artisanProfile email phoneNumber');

    res.status(200).json({
      status: 'success',
      results: artisans.length,
      data: { artisans }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get artisan profile
// @route   GET /api/users/artisans/:id
// @access  Public
router.get('/:id', async (req, res, next) => {
  try {
    const artisan = await User.findOne({
      _id: req.params.id,
      userType: 'artisan'
    }).select('-__v');

    if (!artisan) {
      return next(new AppError('Artisan not found', 404));
    }

    // Get artisan's products
    const products = await Product.find({
      artisan: artisan._id,
      status: 'active'
    });

    // Get completed bookings count and average rating
    const bookings = await Booking.find({
      artisan: artisan._id,
      status: 'completed',
      rating: { $exists: true }
    });

    const stats = {
      completedJobs: bookings.length,
      averageRating: bookings.length > 0
        ? bookings.reduce((acc, curr) => acc + curr.rating, 0) / bookings.length
        : 0
    };

    res.status(200).json({
      status: 'success',
      data: {
        artisan,
        products,
        stats
      }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Update artisan availability
// @route   PATCH /api/users/artisans/availability
// @access  Private/Artisan
router.patch('/availability', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const artisan = await User.findById(req.user.id);
    artisan.artisanProfile.availability = req.body.availability;
    await artisan.save();

    res.status(200).json({
      status: 'success',
      data: { artisan }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Upload certification
// @route   POST /api/users/artisans/certifications
// @access  Private/Artisan
router.post('/certifications', protect, restrictTo('artisan'), upload.single('document'), async (req, res, next) => {
  try {
    const artisan = await User.findById(req.user.id);

    if (!req.file) {
      return next(new AppError('Please upload a document', 400));
    }

    const certification = {
      name: req.body.name,
      issuer: req.body.issuer,
      year: req.body.year,
      document: {
        url: req.file.path,
        public_id: req.file.filename
      }
    };

    artisan.artisanProfile.certifications.push(certification);
    await artisan.save();

    res.status(201).json({
      status: 'success',
      data: { certification }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get artisan analytics
// @route   GET /api/users/artisans/analytics
// @access  Private/Artisan
router.get('/analytics', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const bookings = await Booking.find({
      artisan: req.user.id,
      status: 'completed'
    });

    const analytics = {
      totalBookings: bookings.length,
      totalEarnings: bookings.reduce((acc, curr) => acc + curr.price, 0),
      averageRating: bookings.reduce((acc, curr) => acc + (curr.rating || 0), 0) / bookings.length || 0,
      completionRate: await calculateCompletionRate(req.user.id),
      monthlyStats: await calculateMonthlyStats(req.user.id),
      serviceBreakdown: await calculateServiceBreakdown(req.user.id)
    };

    res.status(200).json({
      status: 'success',
      data: { analytics }
    });
  } catch (err) {
    next(err);
  }
});

// Helper functions for analytics
async function calculateCompletionRate(artisanId) {
  const totalBookings = await Booking.countDocuments({ artisan: artisanId });
  const completedBookings = await Booking.countDocuments({
    artisan: artisanId,
    status: 'completed'
  });

  return totalBookings > 0 ? (completedBookings / totalBookings) * 100 : 0;
}

async function calculateMonthlyStats(artisanId) {
  const bookings = await Booking.aggregate([
    {
      $match: {
        artisan: artisanId,
        status: 'completed'
      }
    },
    {
      $group: {
        _id: {
          month: { $month: '$createdAt' },
          year: { $year: '$createdAt' }
        },
        bookings: { $sum: 1 },
        earnings: { $sum: '$price' }
      }
    },
    { $sort: { '_id.year': -1, '_id.month': -1 } }
  ]);

  return bookings;
}

async function calculateServiceBreakdown(artisanId) {
  return await Booking.aggregate([
    {
      $match: {
        artisan: artisanId,
        status: 'completed'
      }
    },
    {
      $group: {
        _id: '$service',
        count: { $sum: 1 },
        totalEarnings: { $sum: '$price' }
      }
    }
  ]);
}

module.exports = router; 