const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { validateBooking } = require('../middleware/validate');
const Booking = require('../models/Booking');

router.post('/', protect, validateBooking, async (req, res, next) => {
  try {
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

    res.status(201).json({
      status: 'success',
      data: { booking }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 