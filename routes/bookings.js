const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateBooking } = require('../middleware/validate');
const Booking = require('../models/Booking');
const AppError = require('../utils/AppError');

router.post('/', protect, validateBooking, async (req, res, next) => {
  try {
    const booking = await Booking.create({
      user: req.user.id,
      artisan: req.body.artisan,
      service: req.body.service,
      description: req.body.description,
      location: {
        type: 'Point',
        coordinates: req.body.location.coordinates,
        address: req.body.location.address
      },
      scheduledDate: req.body.scheduledDate,
      estimatedDuration: req.body.estimatedDuration,
      price: req.body.price,
      status: 'pending'
    });

    await booking.populate('artisan', 'username email artisanProfile');

    res.status(201).json({
      status: 'success',
      data: {
        booking: {
          id: booking._id,
          service: booking.service,
          description: booking.description,
          location: booking.location,
          scheduledDate: booking.scheduledDate,
          estimatedDuration: booking.estimatedDuration,
          price: booking.price,
          status: booking.status,
          artisan: {
            id: booking.artisan._id,
            username: booking.artisan.username,
            email: booking.artisan.email,
            businessName: booking.artisan.artisanProfile?.businessName
          }
        }
      }
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      return next(new AppError(err.message, 400));
    }
    if (err.name === 'CastError') {
      return next(new AppError('Invalid artisan ID', 400));
    }
    next(err);
  }
});

module.exports = router; 