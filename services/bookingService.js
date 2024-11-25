const Booking = require('../models/Booking');
const Artisan = require('../models/Artisans');
const AppError = require('../utils/AppError');

const bookingService = {
  async createBooking(userId, bookingData) {
    try {
      // Check if artisan exists and is available
      const artisan = await Artisan.findOne({ user: bookingData.artisan });
      if (!artisan) {
        throw new AppError('Artisan not found', 404);
      }

      // Check artisan availability
      const isAvailable = artisan.isAvailable(
        bookingData.scheduledDate,
        bookingData.estimatedDuration.startTime,
        bookingData.estimatedDuration.endTime
      );

      if (!isAvailable) {
        throw new AppError('Artisan is not available at this time', 400);
      }

      // Create booking
      const booking = await Booking.create({
        user: userId,
        artisan: bookingData.artisan,
        service: bookingData.service,
        description: bookingData.description,
        location: {
          type: 'Point',
          coordinates: bookingData.location.coordinates,
          address: bookingData.location.address
        },
        scheduledDate: bookingData.scheduledDate,
        estimatedDuration: bookingData.estimatedDuration,
        price: bookingData.price,
        status: 'pending'
      });

      // Update artisan stats
      await artisan.updateBookingStats('pending');

      // Populate artisan details
      await booking.populate('artisan', 'username email artisanProfile');

      return booking;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  async getUserBookings(userId, query) {
    try {
      const {
        status,
        page = 1,
        limit = 10,
        sort = '-createdAt'
      } = query;

      const queryObj = { user: userId };
      if (status) {
        queryObj.status = status;
      }

      const bookings = await Booking.find(queryObj)
        .populate('artisan', 'username email artisanProfile')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Booking.countDocuments(queryObj);

      return {
        bookings,
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
  },

  async getArtisanBookings(artisanId, query) {
    try {
      const {
        status,
        page = 1,
        limit = 10,
        sort = '-createdAt'
      } = query;

      const queryObj = { artisan: artisanId };
      if (status) {
        queryObj.status = status;
      }

      const bookings = await Booking.find(queryObj)
        .populate('user', 'username email')
        .sort(sort)
        .skip((page - 1) * limit)
        .limit(limit);

      const total = await Booking.countDocuments(queryObj);

      return {
        bookings,
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
  },

  async updateBookingStatus(bookingId, userId, status) {
    try {
      const booking = await Booking.findById(bookingId);
      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      // Check if user is authorized to update status
      if (booking.artisan.toString() !== userId && booking.user.toString() !== userId) {
        throw new AppError('Not authorized to update this booking', 403);
      }

      // Validate status transition
      const validTransitions = {
        pending: ['accepted', 'cancelled'],
        accepted: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      };

      if (!validTransitions[booking.status].includes(status)) {
        throw new AppError(`Cannot transition from ${booking.status} to ${status}`, 400);
      }

      // Update booking status
      booking.status = status;
      await booking.save();

      // Update artisan stats
      const artisan = await Artisan.findOne({ user: booking.artisan });
      if (artisan) {
        await artisan.updateBookingStats(status);
      }

      return booking;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  },

  async getBookingDetails(bookingId, userId) {
    try {
      const booking = await Booking.findById(bookingId)
        .populate('artisan', 'username email artisanProfile')
        .populate('user', 'username email');

      if (!booking) {
        throw new AppError('Booking not found', 404);
      }

      // Check if user is authorized to view booking
      if (booking.artisan.id !== userId && booking.user.id !== userId) {
        throw new AppError('Not authorized to view this booking', 403);
      }

      return booking;
    } catch (error) {
      throw new AppError(error.message, error.statusCode || 500);
    }
  }
};

module.exports = bookingService; 