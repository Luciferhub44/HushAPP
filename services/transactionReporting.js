const Payment = require('../models/Payment');
const User = require('../models/User');
const { AppError } = require('../middleware/error');

const transactionReporting = {
  async generateTransactionReport(userId, startDate, endDate, type = 'all') {
    try {
      const matchStage = {
        $or: [{ user: userId }, { artisan: userId }],
        createdAt: {
          $gte: new Date(startDate),
          $lte: new Date(endDate)
        }
      };

      if (type !== 'all') {
        matchStage.type = type;
      }

      const transactions = await Payment.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: 'orders',
            localField: 'order',
            foreignField: '_id',
            as: 'orderDetails'
          }
        },
        { $unwind: '$orderDetails' },
        {
          $project: {
            transactionId: '$_id',
            date: '$createdAt',
            type: 1,
            amount: 1,
            status: 1,
            platformFee: 1,
            netAmount: { $subtract: ['$amount', '$platformFee'] },
            orderNumber: '$orderDetails.orderNumber',
            paymentMethod: 1
          }
        },
        { $sort: { date: -1 } }
      ]);

      // Calculate summaries
      const summary = {
        totalTransactions: transactions.length,
        totalAmount: transactions.reduce((sum, t) => sum + t.amount, 0),
        totalFees: transactions.reduce((sum, t) => sum + t.platformFee, 0),
        netAmount: transactions.reduce((sum, t) => sum + t.netAmount, 0)
      };

      return {
        transactions,
        summary,
        period: { startDate, endDate }
      };
    } catch (error) {
      throw new AppError('Error generating transaction report', 500);
    }
  },

  async generateCSV(reportData) {
    // Implementation for CSV generation
  },

  async generatePDF(reportData) {
    // Implementation for PDF generation
  }
};

module.exports = transactionReporting; 