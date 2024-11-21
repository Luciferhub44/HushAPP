const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Product must belong to an artisan']
  },
  name: {
    type: String,
    required: [true, 'Product must have a name'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product must have a description'],
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: String,
    required: [true, 'Product must have a category'],
    enum: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Landscaping', 'Other']
  },
  price: {
    type: Number,
    required: [true, 'Product must have a price']
  },
  priceUnit: {
    type: String,
    enum: ['fixed', 'hourly', 'daily'],
    default: 'fixed'
  },
  images: [{
    url: String,
    public_id: String
  }],
  availability: {
    type: Boolean,
    default: true
  },
  rating: {
    type: Number,
    default: 0,
    min: [0, 'Rating must be above 0'],
    max: [5, 'Rating must be below 5'],
    set: val => Math.round(val * 10) / 10 // Round to 1 decimal place
  },
  numReviews: {
    type: Number,
    default: 0
  },
  reviews: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    review: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  features: [String],
  estimatedDuration: {
    value: Number,
    unit: {
      type: String,
      enum: ['minutes', 'hours', 'days'],
      default: 'hours'
    }
  },
  tags: [String],
  status: {
    type: String,
    enum: ['active', 'inactive', 'archived'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes
productSchema.index({ artisan: 1, category: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ price: 1 });
productSchema.index({ rating: -1 });

// Virtual populate bookings
productSchema.virtual('bookings', {
  ref: 'Booking',
  foreignField: 'product',
  localField: '_id'
});

// Calculate average rating
productSchema.statics.calculateAverageRating = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: { _id: productId }
    },
    {
      $unwind: '$reviews'
    },
    {
      $group: {
        _id: '$_id',
        numReviews: { $sum: 1 },
        avgRating: { $avg: '$reviews.rating' }
      }
    }
  ]);

  if (stats.length > 0) {
    await this.findByIdAndUpdate(productId, {
      numReviews: stats[0].numReviews,
      rating: stats[0].avgRating
    });
  } else {
    await this.findByIdAndUpdate(productId, {
      numReviews: 0,
      rating: 0
    });
  }
};

// Call calculateAverageRating after save
productSchema.post('save', function() {
  this.constructor.calculateAverageRating(this._id);
});

// Middleware to populate artisan info
productSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'artisan',
    select: 'username artisanProfile.businessName artisanProfile.rating'
  });
  next();
});

module.exports = mongoose.model('Product', productSchema); 