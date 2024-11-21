const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { AppError } = require('../middleware/error');

const paymentAnalytics = {
  async generateDashboard(userId, timeframe = '30d') {
    try {
      const endDate = new Date();
      const startDate = this.calculateStartDate(timeframe);

      const [
        paymentStats,
        revenueAnalysis,
        paymentMethods,
        trendAnalysis
      ] = await Promise.all([
        this.getPaymentStats(userId, startDate, endDate),
        this.getRevenueAnalysis(userId, startDate, endDate),
        this.getPaymentMethodBreakdown(userId, startDate, endDate),
        this.getTrendAnalysis(userId, startDate, endDate)
      ]);

      return {
        paymentStats,
        revenueAnalysis,
        paymentMethods,
        trendAnalysis,
        timeframe,
        generatedAt: new Date()
      };
    } catch (error) {
      throw new AppError('Error generating payment analytics', 500);
    }
  },

  async getPaymentStats(userId, startDate, endDate) {
    const stats = await Payment.aggregate([
      {
        $match: {
          artisan: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          totalFees: { $sum: '$platformFee' },
          averagePayment: { $avg: '$amount' },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', 'failed'] }, 1, 0] }
          }
        }
      }
    ]);

    return stats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      totalFees: 0,
      averagePayment: 0,
      successfulPayments: 0,
      failedPayments: 0
    };
  },

  async getRevenueAnalysis(userId, startDate, endDate) {
    return await Payment.aggregate([
      {
        $match: {
          artisan: userId,
          status: 'completed',
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: { $subtract: ['$amount', '$platformFee'] } },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);
  },

  async getPaymentMethodBreakdown(userId, startDate, endDate) {
    return await Payment.aggregate([
      {
        $match: {
          artisan: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);
  },

  async getTrendAnalysis(userId, startDate, endDate) {
    const dailyTrends = await Payment.aggregate([
      {
        $match: {
          artisan: userId,
          createdAt: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          revenue: { $sum: { $subtract: ['$amount', '$platformFee'] } },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { '_id': 1 } }
    ]);

    return {
      dailyTrends,
      trend: this.calculateTrend(dailyTrends)
    };
  },

  calculateTrend(dailyData) {
    // Simple linear regression for trend analysis
    const n = dailyData.length;
    if (n < 2) return 'insufficient_data';

    const xSum = dailyData.reduce((sum, _, i) => sum + i, 0);
    const ySum = dailyData.reduce((sum, day) => sum + day.revenue, 0);
    const xySum = dailyData.reduce((sum, day, i) => sum + (day.revenue * i), 0);
    const x2Sum = dailyData.reduce((sum, _, i) => sum + (i * i), 0);

    const slope = (n * xySum - xSum * ySum) / (n * x2Sum - xSum * xSum);

    return {
      direction: slope > 0 ? 'increasing' : slope < 0 ? 'decreasing' : 'stable',
      percentage: Math.abs((slope / (ySum / n)) * 100)
    };
  },

  calculateStartDate(timeframe) {
    const now = new Date();
    switch (timeframe) {
      case '7d':
        return new Date(now.setDate(now.getDate() - 7));
      case '30d':
        return new Date(now.setDate(now.getDate() - 30));
      case '90d':
        return new Date(now.setDate(now.getDate() - 90));
      case '1y':
        return new Date(now.setFullYear(now.getFullYear() - 1));
      default:
        return new Date(now.setDate(now.getDate() - 30));
    }
  }
};

module.exports = paymentAnalytics; 