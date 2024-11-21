const router = require('express').Router();
const { protect, restrictTo } = require('../middleware/auth');
const Schedule = require('../models/Schedule');
const { AppError } = require('../middleware/error');
const { notifications } = require('../utils/notifications');

// Get artisan schedule
router.get('/artisan/:artisanId', async (req, res, next) => {
  try {
    const schedule = await Schedule.findOne({ artisan: req.params.artisanId })
      .populate('artisan', 'username artisanProfile.businessName');

    if (!schedule) {
      return next(new AppError('Schedule not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: { schedule }
    });
  } catch (err) {
    next(err);
  }
});

// Update artisan schedule (Artisan only)
router.put('/update', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const { workingHours, breaks, preferences } = req.body;
    let schedule = await Schedule.findOne({ artisan: req.user.id });

    if (!schedule) {
      schedule = await Schedule.create({
        artisan: req.user.id,
        workingHours,
        breaks,
        preferences
      });
    } else {
      if (workingHours) schedule.workingHours = workingHours;
      if (breaks) schedule.breaks = breaks;
      if (preferences) schedule.preferences = preferences;
      await schedule.save();
    }

    res.status(200).json({
      status: 'success',
      data: { schedule }
    });
  } catch (err) {
    next(err);
  }
});

// Add vacation time
router.post('/vacation', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const { startDate, endDate, reason } = req.body;
    const schedule = await Schedule.findOne({ artisan: req.user.id });

    if (!schedule) {
      return next(new AppError('Schedule not found', 404));
    }

    // Check for overlapping vacations
    const hasOverlap = schedule.vacations.some(vacation => {
      return (new Date(startDate) <= new Date(vacation.endDate) &&
              new Date(endDate) >= new Date(vacation.startDate));
    });

    if (hasOverlap) {
      return next(new AppError('Vacation period overlaps with existing vacation', 400));
    }

    schedule.vacations.push({ startDate, endDate, reason });
    await schedule.save();

    res.status(200).json({
      status: 'success',
      data: { schedule }
    });
  } catch (err) {
    next(err);
  }
});

// Check availability for specific time
router.get('/check-availability', async (req, res, next) => {
  try {
    const { artisanId, date, service } = req.query;
    const schedule = await Schedule.findOne({ artisan: artisanId });

    if (!schedule) {
      return next(new AppError('Schedule not found', 404));
    }

    const requestedDate = new Date(date);
    const dayOfWeek = requestedDate.toLocaleLowerCase();

    // Check if it's a vacation day
    const isVacation = schedule.vacations.some(vacation => {
      return (requestedDate >= new Date(vacation.startDate) &&
              requestedDate <= new Date(vacation.endDate));
    });

    if (isVacation) {
      return res.status(200).json({
        status: 'success',
        data: { 
          available: false,
          reason: 'Artisan is on vacation'
        }
      });
    }

    // Get available time slots for the day
    const daySchedule = schedule.workingHours[dayOfWeek];
    const availableSlots = daySchedule.filter(slot => !slot.isBooked);

    res.status(200).json({
      status: 'success',
      data: { 
        available: availableSlots.length > 0,
        availableSlots
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 