const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Please provide a username'],
    unique: true,
    trim: true,
    minlength: [3, 'Username must be at least 3 characters long']
  },
  email: {
    type: String,
    required: [true, 'Please provide an email'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Please provide a password'],
    minlength: 6,
    select: false
  },
  userType: {
    type: String,
    enum: ['user', 'artisan'],
    required: [true, 'Please specify user type']
  },
  role: {
    type: String,
    enum: ['user', 'admin', 'artisan'],
    default: 'user'
  },
  phoneNumber: {
    type: String,
    required: [true, 'Please provide a phone number']
  },
  avatar: {
    url: String,
    public_id: String
  },
  artisanProfile: {
    businessName: String,
    specialty: [{
      type: String,
      enum: ['Plumbing', 'Electrical', 'Carpentry', 'Painting', 'Cleaning', 'Landscaping', 'Other']
    }],
    experience: Number,
    bio: String,
    location: {
      type: {
        type: String,
        enum: ['Point'],
        default: 'Point'
      },
      coordinates: {
        type: [Number],
        required: true
      },
      address: String,
      city: String,
      state: String
    },
    rating: {
      type: Number,
      default: 0
    },
    numReviews: {
      type: Number,
      default: 0
    },
    availability: {
      type: Boolean,
      default: true
    },
    certifications: [{
      name: String,
      issuer: String,
      year: Number,
      document: {
        url: String,
        public_id: String
      }
    }],
    verified: {
      type: Boolean,
      default: false
    }
  },
  passwordChangedAt: Date,
  active: {
    type: Boolean,
    default: true,
    select: false
  }
}, {
  timestamps: true
});

userSchema.index({ 'artisanProfile.location': '2dsphere' });
userSchema.index({ email: 1, username: 1 });

// Hash password before saving
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Update passwordChangedAt when password is modified
userSchema.pre('save', function(next) {
  if (!this.isModified('password') || this.isNew) return next();
  
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Only find active users
userSchema.pre(/^find/, function(next) {
  this.find({ active: { $ne: false } });
  next();
});

// Instance methods
userSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model('User', userSchema);