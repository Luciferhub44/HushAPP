const User = require('../models/User');
const jwt = require('jsonwebtoken');
const AppError = require('../utils/AppError');

const authService = {
  async generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
  },

  async register(userData) {
    try {
      // Format artisan profile data if user is artisan
      if (userData.userType === 'artisan' && userData.artisanProfile) {
        // Ensure location data is in correct GeoJSON format
        if (userData.artisanProfile.location) {
          userData.artisanProfile.location = {
            type: 'Point',
            coordinates: userData.artisanProfile.location.coordinates,
            address: userData.artisanProfile.location.address,
            city: userData.artisanProfile.location.city,
            state: userData.artisanProfile.location.state
          };
        }

        // Validate required artisan fields
        if (!userData.artisanProfile.businessName || 
            !userData.artisanProfile.specialty || 
            !userData.artisanProfile.experience || 
            !userData.artisanProfile.bio || 
            !userData.artisanProfile.location) {
          throw new AppError('Missing required artisan profile fields', 400);
        }
      }

      // Create user with auto-verification in test mode
      const user = await User.create({
        ...userData,
        isPhoneVerified: process.env.NODE_ENV === 'test',
        isEmailVerified: process.env.NODE_ENV === 'test'
      });

      // Generate token
      const token = user.getSignedJwtToken();

      // Return sanitized user data
      const sanitizedUser = {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        phoneNumber: user.phoneNumber,
        artisanProfile: user.userType === 'artisan' ? {
          businessName: user.artisanProfile.businessName,
          specialty: user.artisanProfile.specialty,
          experience: user.artisanProfile.experience,
          bio: user.artisanProfile.bio,
          location: {
            coordinates: user.artisanProfile.location.coordinates,
            address: user.artisanProfile.location.address,
            city: user.artisanProfile.location.city,
            state: user.artisanProfile.location.state
          }
        } : undefined
      };

      return { user: sanitizedUser, token };

    } catch (error) {
      if (error.code === 11000) {
        const field = Object.keys(error.keyPattern)[0];
        throw new AppError(`${field} already exists`, 400);
      }
      if (error.name === 'ValidationError') {
        const messages = Object.values(error.errors).map(err => err.message);
        throw new AppError(messages.join('. '), 400);
      }
      throw new AppError(error.message, error.statusCode || 400);
    }
  },

  async login(email, password) {
    try {
      // Check if email and password exist
      if (!email || !password) {
        throw new AppError('Please provide email and password', 400);
      }

      // Find user and include password field
      const user = await User.findOne({ email }).select('+password');
      
      if (!user) {
        throw new AppError('Invalid credentials', 401);
      }

      // Check if password matches
      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        throw new AppError('Invalid credentials', 401);
      }

      // Generate token
      const token = user.getSignedJwtToken();

      // Return sanitized user data
      const sanitizedUser = {
        id: user._id,
        username: user.username,
        email: user.email,
        userType: user.userType,
        phoneNumber: user.phoneNumber,
        artisanProfile: user.userType === 'artisan' ? {
          businessName: user.artisanProfile.businessName,
          specialty: user.artisanProfile.specialty,
          experience: user.artisanProfile.experience,
          bio: user.artisanProfile.bio,
          location: {
            coordinates: user.artisanProfile.location.coordinates,
            address: user.artisanProfile.location.address,
            city: user.artisanProfile.location.city,
            state: user.artisanProfile.location.state
          }
        } : undefined
      };

      return { token, user: sanitizedUser };
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  // Helper method to sanitize user data
  sanitizeUser(user) {
    return {
      id: user._id,
      username: user.username,
      email: user.email,
      userType: user.userType,
      phoneNumber: user.phoneNumber,
      artisanProfile: user.userType === 'artisan' ? {
        businessName: user.artisanProfile.businessName,
        specialty: user.artisanProfile.specialty,
        experience: user.artisanProfile.experience,
        bio: user.artisanProfile.bio,
        location: {
          coordinates: user.artisanProfile.location.coordinates,
          address: user.artisanProfile.location.address,
          city: user.artisanProfile.location.city,
          state: user.artisanProfile.location.state
        }
      } : undefined
    };
  }
};

module.exports = authService; 