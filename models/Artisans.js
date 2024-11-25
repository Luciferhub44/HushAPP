const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true
  },
  booking: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Booking',
    required: true
  }
}, {
  timestamps: true
});

const artisanSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  services: [{
    name: {
      type: String,
      required: true
    },
    description: String,
    basePrice: {
      type: Number,
      required: true
    },
    category: {
      type: String,
      required: true
    }
  }],
  availability: {
    schedule: [{
      day: {
        type: String,
        enum: ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
        required: true
      },
      slots: [{
        startTime: {
          type: String,
          required: true
        },
        endTime: {
          type: String,
          required: true
        },
        isAvailable: {
          type: Boolean,
          default: true
        }
      }]
    }],
    customDates: [{
      date: {
        type: Date,
        required: true
      },
      isAvailable: {
        type: Boolean,
        default: false
      },
      reason: String
    }]
  },
  stats: {
    totalBookings: {
      type: Number,
      default: 0
    },
    completedBookings: {
      type: Number,
      default: 0
    },
    cancelledBookings: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      default: 0
    },
    totalReviews: {
      type: Number,
      default: 0
    },
    totalEarnings: {
      type: Number,
      default: 0
    }
  },
  verification: {
    isVerified: {
      type: Boolean,
      default: false
    },
    documents: [{
      type: {
        type: String,
        enum: ['id', 'license', 'certification', 'insurance'],
        required: true
      },
      url: {
        type: String,
        required: true
      },
      isVerified: {
        type: Boolean,
        default: false
      },
      verifiedAt: Date,
      expiryDate: Date
    }]
  },
  reviews: [reviewSchema],
  serviceArea: {
    type: {
      type: String,
      enum: ['Polygon'],
      required: true
    },
    coordinates: {
      type: [[[Number]]],
      required: true
    }
  },
  preferences: {
    maxDailyBookings: {
      type: Number,
      default: 5
    },
    minLeadTime: {
      type: Number, // in hours
      default: 2
    },
    maxTravelDistance: {
      type: Number, // in kilometers
      default: 20
    },
    autoAcceptBookings: {
      type: Boolean,
      default: false
    },
    notificationPreferences: {
      email: {
        type: Boolean,
        default: true
      },
      sms: {
        type: Boolean,
        default: true
      },
      push: {
        type: Boolean,
        default: true
      }
    }
  },
  status: {
    isActive: {
      type: Boolean,
      default: true
    },
    lastActive: {
      type: Date,
      default: Date.now
    },
    currentLocation: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        default: undefined
      }
    }
  }
}, {
  timestamps: true
});

// Indexes
artisanSchema.index({ "serviceArea": "2dsphere" });
artisanSchema.index({ "status.currentLocation": "2dsphere" });
artisanSchema.index({ "services.category": 1 });
artisanSchema.index({ "stats.averageRating": -1 });

// Virtual populate reviews
artisanSchema.virtual('reviewsCount').get(function() {
  return this.reviews.length;
});

// Calculate average rating
artisanSchema.methods.calculateAverageRating = async function() {
  const stats = await this.model('Artisan').aggregate([
    {
      $match: { _id: this._id }
    },
    {
      $unwind: '$reviews'
    },
    {
      $group: {
        _id: null,
        averageRating: { $avg: '$reviews.rating' },
        totalReviews: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    this.stats.averageRating = Math.round(stats[0].averageRating * 10) / 10;
    this.stats.totalReviews = stats[0].totalReviews;
    await this.save();
  }
};

// Update stats after booking
artisanSchema.methods.updateBookingStats = async function(status) {
  this.stats.totalBookings += 1;
  if (status === 'completed') {
    this.stats.completedBookings += 1;
  } else if (status === 'cancelled') {
    this.stats.cancelledBookings += 1;
  }
  await this.save();
};

// Check availability
artisanSchema.methods.isAvailable = function(date, startTime, endTime) {
  // Implementation for checking availability
  const dayOfWeek = new Date(date).toLocaleLowerCase('en-US', { weekday: 'long' });
  const schedule = this.availability.schedule.find(s => s.day === dayOfWeek);
  
  if (!schedule) return false;

  // Check custom dates
  const customDate = this.availability.customDates.find(
    d => d.date.toDateString() === new Date(date).toDateString()
  );
  if (customDate && !customDate.isAvailable) return false;

  // Check slots
  return schedule.slots.some(slot => 
    slot.isAvailable && 
    slot.startTime <= startTime && 
    slot.endTime >= endTime
  );
};

module.exports = mongoose.model('Artisan', artisanSchema);
