const mongoose = require('mongoose');

const customizationOptionSchema = new mongoose.Schema({
  name: String,
  options: [String]
}, { _id: false });

const productSchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Product description is required']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: ['Furniture', 'Clothing', 'Art', 'Jewelry', 'Home Decor', 'Other']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: 0
  },
  images: [{
    type: String,
    required: [true, 'Product must have at least one image']
  }],
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 1
  },
  customizable: {
    type: Boolean,
    default: false
  },
  customizationOptions: {
    type: [customizationOptionSchema],
    validate: [{
      validator: function(options) {
        return !this.customizable || (options && options.length > 0);
      },
      message: 'Customization options are required when product is customizable'
    }]
  },
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalReviews: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'out_of_stock'],
    default: 'active'
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

productSchema.index({ artisan: 1, category: 1 });
productSchema.index({ name: 'text', description: 'text' });

productSchema.pre('save', function(next) {
  if (!this.images || this.images.length === 0) {
    next(new Error('Product must have at least one image'));
  }
  next();
});

module.exports = mongoose.model('Product', productSchema); 