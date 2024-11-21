const cron = require('node-cron');
const Payment = require('../models/Payment');
const User = require('../models/User');
const { notifications } = require('../utils/notifications');
const paymentService = require('./payment');

const payoutScheduler = {
  // Schedule daily payouts at midnight
  init() {
    cron.schedule('0 0 * * *', async () => {
      console.log('Running daily payout schedule...');
      await this.processPendingPayouts();
    });

    // Schedule weekly reconciliation
    cron.schedule('0 0 * * 0', async () => {
      console.log('Running weekly reconciliation...');
      await this.reconcilePayouts();
    });
  },

  async processPendingPayouts() {
    try {
      // Get all artisans with pending payouts
      const pendingPayments = await Payment.find({
        status: 'in_escrow',
        'escrow.releasedAt': {
          $lte: new Date(Date.now() - process.env.ESCROW_HOLD_DAYS * 24 * 60 * 60 * 1000)
        }
      }).populate('artisan');

      for (const payment of pendingPayments) {
        try {
          // Check if all conditions are met
          const conditionsMet = await this.verifyPayoutConditions(payment);
          
          if (conditionsMet) {
            await paymentService.releaseEscrowPayment(
              payment._id,
              'SYSTEM_AUTOMATIC_RELEASE'
            );

            await notifications.sendNotification(payment.artisan._id, 'payout_processed', {
              amount: payment.amount - payment.platformFee,
              paymentId: payment._id
            });
          }
        } catch (error) {
          console.error(`Error processing payout for payment ${payment._id}:`, error);
          // Log error for manual review
          await this.logPayoutError(payment, error);
        }
      }
    } catch (error) {
      console.error('Error in payout processing:', error);
    }
  },

  async verifyPayoutConditions(payment) {
    // Check all required conditions
    const conditions = {
      serviceCompleted: await this.checkServiceCompletion(payment),
      noDisputes: await this.checkForDisputes(payment),
      fundsAvailable: await this.checkFundsAvailability(payment)
    };

    return Object.values(conditions).every(condition => condition === true);
  },

  async reconcilePayouts() {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const payouts = await Payment.aggregate([
        {
          $match: {
            status: 'released',
            'escrow.releasedAt': { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$artisan',
            totalAmount: { $sum: '$amount' },
            totalFees: { $sum: '$platformFee' },
            paymentCount: { $sum: 1 }
          }
        }
      ]);

      // Generate reconciliation report
      const report = await this.generateReconciliationReport(payouts);
      
      // Send report to admins
      await this.sendReconciliationReport(report);
    } catch (error) {
      console.error('Error in payout reconciliation:', error);
    }
  }
};

module.exports = payoutScheduler; 