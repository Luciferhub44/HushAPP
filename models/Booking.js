const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must belong to a user']
  },
  artisan: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Booking must be assigned to an artisan']
  },
  service: {
    type: String,
    required: [true, 'Please specify the service type'],
    enum: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Landscaping', 'Other']
  },
  description: {
    type: String,
    required: [true, 'Please provide service description'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point'
    },
    coordinates: {
      type: [Number],
      required: [true, 'Please provide location coordinates']
    },
    address: {
      type: String,
      required: [true, 'Please provide service address']
    }
  },
  scheduledDate: {
    type: Date,
    required: [true, 'Please provide scheduled date']
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  price: {
    type: Number,
    required: [true, 'Please specify the service price']
  },
  paid: {
    type: Boolean,
    default: false
  },
  rating: {
    type: Number,
    min: 1,
    max: 5
  },
  review: String,
  acceptedAt: Date,
  completedAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  estimatedDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'hours'
    }
  },
  attachments: [{
    url: String,
    public_id: String,
    type: String
  }],
  notes: [{
    content: String,
    author: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
bookingSchema.index({ user: 1, status: 1 });
bookingSchema.index({ artisan: 1, status: 1 });
bookingSchema.index({ location: '2dsphere' });
bookingSchema.index({ scheduledDate: 1 });

// Virtual populate payment
bookingSchema.virtual('payment', {
  ref: 'Payment',
  foreignField: 'booking',
  localField: '_id',
  justOne: true
});

// Virtual populate chat
bookingSchema.virtual('chat', {
  ref: 'Chat',
  foreignField: 'booking',
  localField: '_id',
  justOne: true
});

// Middleware to populate references
bookingSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'username phoneNumber'
  }).populate({
    path: 'artisan',
    select: 'username artisanProfile.businessName artisanProfile.phoneNumber'
  });
  next();
});

// Update status timestamps
bookingSchema.pre('save', function(next) {
  if (this.isModified('status')) {
    switch (this.status) {
      case 'accepted':
        this.acceptedAt = Date.now();
        break;
      case 'completed':
        this.completedAt = Date.now();
        break;
      case 'cancelled':
        this.cancelledAt = Date.now();
        break;
    }
  }
  next();
});

module.exports = mongoose.model('Booking', bookingSchema); 