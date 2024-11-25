const Artisan = require('../models/Artisans');
const User = require('../models/User');
const AppError = require('../utils/AppError');

const artisanService = {
  async createArtisanProfile(userId, profileData) {
    try {
      const user = await User.findById(userId);
      if (!user || user.userType !== 'artisan') {
        throw new AppError('User not found or not an artisan', 404);
      }

      const artisan = await Artisan.create({
        user: userId,
        ...profileData
      });

      return artisan;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  async updateAvailability(artisanId, availabilityData) {
    try {
      const artisan = await Artisan.findOne({ user: artisanId });
      if (!artisan) {
        throw new AppError('Artisan profile not found', 404);
      }

      if (availabilityData.schedule) {
        artisan.availability.schedule = availabilityData.schedule;
      }

      if (availabilityData.customDates) {
        artisan.availability.customDates = availabilityData.customDates;
      }

      await artisan.save();
      return artisan.availability;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  async updateLocation(artisanId, locationData) {
    try {
      const artisan = await Artisan.findOne({ user: artisanId });
      if (!artisan) {
        throw new AppError('Artisan profile not found', 404);
      }

      artisan.status.currentLocation = {
        type: 'Point',
        coordinates: locationData.coordinates
      };
      artisan.status.lastActive = Date.now();

      await artisan.save();
      return artisan.status.currentLocation;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  async updateServiceArea(artisanId, serviceAreaData) {
    try {
      const artisan = await Artisan.findOne({ user: artisanId });
      if (!artisan) {
        throw new AppError('Artisan profile not found', 404);
      }

      artisan.serviceArea = serviceAreaData;
      await artisan.save();
      return artisan.serviceArea;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  async addService(artisanId, serviceData) {
    try {
      const artisan = await Artisan.findOne({ user: artisanId });
      if (!artisan) {
        throw new AppError('Artisan profile not found', 404);
      }

      artisan.services.push(serviceData);
      await artisan.save();
      return artisan.services[artisan.services.length - 1];
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  async updatePreferences(artisanId, preferencesData) {
    try {
      const artisan = await Artisan.findOne({ user: artisanId });
      if (!artisan) {
        throw new AppError('Artisan profile not found', 404);
      }

      Object.assign(artisan.preferences, preferencesData);
      await artisan.save();
      return artisan.preferences;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  async addReview(artisanId, reviewData, userId) {
    try {
      const artisan = await Artisan.findById(artisanId);
      if (!artisan) {
        throw new AppError('Artisan not found', 404);
      }

      // Check if user has already reviewed this booking
      const existingReview = artisan.reviews.find(
        review => review.booking.toString() === reviewData.bookingId &&
                 review.user.toString() === userId
      );

      if (existingReview) {
        throw new AppError('You have already reviewed this booking', 400);
      }

      const review = {
        user: userId,
        rating: reviewData.rating,
        comment: reviewData.comment,
        booking: reviewData.bookingId
      };

      artisan.reviews.push(review);
      await artisan.calculateAverageRating();
      await artisan.save();

      return review;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  async searchArtisans(filters) {
    try {
      const {
        specialty,
        rating,
        price,
        location,
        radius = 5000,
        page = 1,
        limit = 10
      } = filters;

      const query = {};

      if (specialty) {
        query['services.category'] = specialty;
      }

      if (rating) {
        query['stats.averageRating'] = { $gte: parseFloat(rating) };
      }

      if (price) {
        const [min, max] = price.split('-').map(Number);
        query['services.basePrice'] = { $gte: min, $lte: max };
      }

      if (location) {
        const [lng, lat] = location.split(',').map(Number);
        query.serviceArea = {
          $geoWithin: {
            $centerSphere: [[lng, lat], radius / 6378100]
          }
        };
      }

      const artisans = await Artisan.find(query)
        .populate('user', 'username email phoneNumber')
        .skip((page - 1) * limit)
        .limit(limit)
        .sort('-stats.averageRating');

      const total = await Artisan.countDocuments(query);

      return {
        artisans,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  }
};

module.exports = artisanService; 