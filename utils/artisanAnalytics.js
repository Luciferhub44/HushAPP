const Booking = require('../models/Booking');
const Payment = require('../models/Payment');

const artisanAnalytics = {
  async getBookingStats(artisanId, startDate, endDate) {
    const matchStage = {
      artisan: artisanId,
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    return await Booking.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalEarnings: {
            $sum: {
              $cond: [{ $eq: ['$status', 'completed'] }, '$price', 0]
            }
          }
        }
      }
    ]);
  },

  async getMonthlyEarnings(artisanId, year) {
    return await Payment.aggregate([
      {
        $match: {
          artisan: artisanId,
          status: 'completed',
          createdAt: {
            $gte: new Date(`${year}-01-01`),
            $lte: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$createdAt' },
          earnings: { $sum: '$amount' },
          bookings: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);
  },

  async getServicePerformance(artisanId) {
    return await Booking.aggregate([
      {
        $match: {
          artisan: artisanId,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$service',
          bookings: { $sum: 1 },
          totalEarnings: { $sum: '$price' },
          averageRating: { $avg: '$rating' }
        }
      }
    ]);
  },

  async getCustomerRetention(artisanId) {
    const bookings = await Booking.aggregate([
      {
        $match: {
          artisan: artisanId,
          status: 'completed'
        }
      },
      {
        $group: {
          _id: '$user',
          bookingCount: { $sum: 1 },
          firstBooking: { $min: '$createdAt' },
          lastBooking: { $max: '$createdAt' },
          totalSpent: { $sum: '$price' }
        }
      }
    ]);

    const retention = {
      oneTime: 0,
      returning: 0,
      loyal: 0 // 3 or more bookings
    };

    bookings.forEach(customer => {
      if (customer.bookingCount === 1) retention.oneTime++;
      else if (customer.bookingCount === 2) retention.returning++;
      else retention.loyal++;
    });

    return retention;
  },

  async getPerformanceMetrics(artisanId) {
    const completedBookings = await Booking.find({
      artisan: artisanId,
      status: 'completed'
    });

    const metrics = {
      responseRate: 0,
      completionRate: 0,
      onTimeRate: 0,
      averageResponseTime: 0
    };

    if (completedBookings.length > 0) {
      // Calculate response rate
      const totalBookings = await Booking.countDocuments({ artisan: artisanId });
      metrics.responseRate = (completedBookings.length / totalBookings) * 100;

      // Calculate on-time rate
      const onTimeBookings = completedBookings.filter(booking => {
        const completionTime = booking.updatedAt - booking.createdAt;
        const estimatedDuration = booking.estimatedDuration || 24 * 60 * 60 * 1000; // 24 hours default
        return completionTime <= estimatedDuration;
      });
      metrics.onTimeRate = (onTimeBookings.length / completedBookings.length) * 100;

      // Calculate average response time
      const totalResponseTime = completedBookings.reduce((acc, booking) => {
        return acc + (booking.acceptedAt ? booking.acceptedAt - booking.createdAt : 0);
      }, 0);
      metrics.averageResponseTime = totalResponseTime / completedBookings.length;
    }

    return metrics;
  }
};

module.exports = artisanAnalytics; 