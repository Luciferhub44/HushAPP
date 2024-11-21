const mongoose = require('mongoose');

const timeSlotSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  isBooked: {
    type: Boolean,
    default: false
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking'
  }
});

const scheduleSchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  workingHours: {
    monday: [timeSlotSchema],
    tuesday: [timeSlotSchema],
    wednesday: [timeSlotSchema],
    thursday: [timeSlotSchema],
    friday: [timeSlotSchema],
    saturday: [timeSlotSchema],
    sunday: [timeSlotSchema]
  },
  breaks: [{
    startTime: Date,
    endTime: Date,
    reason: String
  }],
  vacations: [{
    startDate: Date,
    endDate: Date,
    reason: String
  }],
  preferences: {
    minimumNotice: {
      type: Number,
      default: 24 // hours
    },
    maxBookingsPerDay: {
      type: Number,
      default: 5
    },
    serviceRadius: {
      type: Number,
      default: 20 // kilometers
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Schedule', scheduleSchema); 