const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { notifications } = require('../utils/notifications');
const paymentService = require('./payment');

const refundProcessor = {
  async processAutomaticRefund(orderId, reason) {
    try {
      const order = await Order.findById(orderId)
        .populate('payment');

      if (!order || !order.payment) {
        throw new Error('Order or payment not found');
      }

      const eligibleForAutoRefund = await this.checkRefundEligibility(order);
      
      if (eligibleForAutoRefund) {
        const refund = await paymentService.processRefund(
          order.payment._id,
          order.payment.amount,
          reason
        );

        await this.handlePostRefundActions(order, refund);
        return refund;
      } else {
        await this.escalateToManualReview(order, reason);
        return null;
      }
    } catch (error) {
      console.error('Refund processing error:', error);
      throw error;
    }
  },

  async checkRefundEligibility(order) {
    // Check various conditions for automatic refund eligibility
    const conditions = {
      isWithinTimeframe: this.isWithinRefundTimeframe(order),
      hasNoDisputes: await this.hasNoActiveDisputes(order),
      isValidReason: this.isValidRefundReason(order),
      isFirstRefund: await this.isFirstRefundRequest(order)
    };

    return Object.values(conditions).every(condition => condition === true);
  },

  isWithinRefundTimeframe(order) {
    const refundWindow = 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    const orderDate = new Date(order.createdAt).getTime();
    const now = Date.now();

    return (now - orderDate) <= refundWindow;
  },

  async hasNoActiveDisputes(order) {
    const activeDisputes = await Dispute.find({
      order: order._id,
      status: { $in: ['open', 'under_review'] }
    });

    return activeDisputes.length === 0;
  },

  isValidRefundReason(order) {
    const validReasons = [
      'service_not_started',
      'artisan_unavailable',
      'customer_request',
      'system_error'
    ];

    return validReasons.includes(order.cancellationReason);
  },

  async isFirstRefundRequest(order) {
    const previousRefunds = await Payment.countDocuments({
      user: order.user,
      'refund.status': 'completed',
      createdAt: {
        $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
      }
    });

    return previousRefunds === 0;
  },

  async handlePostRefundActions(order, refund) {
    // Update order status
    order.status = 'refunded';
    order.refundDetails = {
      refundId: refund._id,
      amount: refund.amount,
      processedAt: new Date()
    };
    await order.save();

    // Notify user
    await notifications.sendNotification(order.user, 'refund_processed', {
      orderId: order._id,
      amount: refund.amount,
      reason: refund.reason
    });

    // Notify artisan
    await notifications.sendNotification(order.artisan, 'order_refunded', {
      orderId: order._id,
      amount: refund.amount,
      reason: refund.reason
    });

    // Log refund for analytics
    await this.logRefundAnalytics(order, refund);
  },

  async escalateToManualReview(order, reason) {
    await notifications.notifyAdmins('refund_review_required', {
      orderId: order._id,
      reason,
      orderDetails: {
        amount: order.payment.amount,
        user: order.user,
        artisan: order.artisan,
        createdAt: order.createdAt
      }
    });

    // Update order status
    order.status = 'refund_review';
    order.reviewDetails = {
      requestedAt: new Date(),
      reason,
      status: 'pending_review'
    };
    await order.save();

    // Notify user of manual review
    await notifications.sendNotification(order.user, 'refund_under_review', {
      orderId: order._id,
      message: 'Your refund request is being reviewed by our team.'
    });
  },

  async logRefundAnalytics(order, refund) {
    // Implementation for logging refund analytics
    // This could be used for fraud detection and business insights
  }
};

module.exports = refundProcessor; 