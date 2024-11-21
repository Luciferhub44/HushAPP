const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  userType: {
    type: String,
    enum: ['user', 'artisan'],
    required: true
  },
  phoneNumber: {
    type: String,
    required: true
  },
  artisanProfile: {
    type: {
      businessName: String,
      specialty: [String],
      experience: Number,
      bio: String,
      location: {
        type: {
          coordinates: {
            type: [Number],
            required: function() {
              return this.userType === 'artisan';
            }
          },
          address: {
            type: String,
            required: function() {
              return this.userType === 'artisan';
            }
          },
          city: {
            type: String,
            required: function() {
              return this.userType === 'artisan';
            }
          },
          state: {
            type: String,
            required: function() {
              return this.userType === 'artisan';
            }
          }
        },
        required: function() {
          return this.userType === 'artisan';
        }
      }
    },
    required: function() {
      return this.userType === 'artisan';
    }
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