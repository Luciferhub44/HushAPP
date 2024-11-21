const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const Payment = require('../models/Payment');
const Order = require('../models/Order');
const Wallet = require('../models/Wallet');
const { AppError } = require('../middleware/error');
const { notifications } = require('../utils/notifications');

const paymentService = {
  async createEscrowPayment(orderId, paymentMethod) {
    try {
      const order = await Order.findById(orderId)
        .populate('artisan', 'stripeAccountId');

      if (!order) {
        throw new AppError('Order not found', 404);
      }

      const platformFee = Math.floor(order.totalAmount * 0.05); // 5% platform fee

      // Create payment record
      const payment = await Payment.create({
        order: orderId,
        user: order.user,
        artisan: order.artisan._id,
        amount: order.totalAmount,
        platformFee,
        paymentMethod,
        status: 'pending',
        escrow: {
          conditions: ['service_completed', 'customer_approved']
        }
      });

      // Create Stripe payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: order.totalAmount * 100, // Convert to cents
        currency: 'usd',
        application_fee_amount: platformFee * 100,
        transfer_data: {
          destination: order.artisan.stripeAccountId,
        },
        metadata: {
          orderId,
          paymentId: payment._id.toString(),
          type: 'escrow'
        }
      });

      // Update payment with Stripe ID
      payment.stripePaymentIntentId = paymentIntent.id;
      payment.status = 'processing';
      await payment.save();

      return {
        payment,
        clientSecret: paymentIntent.client_secret
      };
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  },

  async releaseEscrowPayment(paymentId, releasedBy) {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment || payment.status !== 'in_escrow') {
        throw new AppError('Payment not found or not in escrow', 404);
      }

      // Transfer funds to artisan
      const transfer = await stripe.transfers.create({
        amount: (payment.amount - payment.platformFee) * 100,
        currency: 'usd',
        destination: payment.artisan.stripeAccountId,
        transfer_group: `ORDER_${payment.order}`
      });

      // Update payment status
      payment.status = 'released';
      payment.stripeTransferId = transfer.id;
      payment.escrow.releasedAt = new Date();
      payment.escrow.releasedBy = releasedBy;
      await payment.save();

      // Update artisan's wallet
      await Wallet.findOneAndUpdate(
        { user: payment.artisan },
        { 
          $inc: { balance: payment.amount - payment.platformFee },
          $push: {
            transactions: {
              type: 'credit',
              amount: payment.amount - payment.platformFee,
              reference: payment._id,
              description: `Payment for order #${payment.order}`
            }
          }
        },
        { upsert: true }
      );

      // Send notifications
      await notifications.sendNotification(payment.artisan, 'payment_released', {
        orderId: payment.order,
        amount: payment.amount - payment.platformFee
      });

      return payment;
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  },

  async processRefund(paymentId, reason, amount) {
    try {
      const payment = await Payment.findById(paymentId);
      
      if (!payment) {
        throw new AppError('Payment not found', 404);
      }

      // Create refund in Stripe
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentIntentId,
        amount: amount * 100,
        reason: reason
      });

      // Update payment record
      payment.status = 'refunded';
      payment.refund = {
        amount,
        reason,
        status: refund.status,
        refundedAt: new Date()
      };
      await payment.save();

      // Update order status
      await Order.findByIdAndUpdate(payment.order, {
        status: 'refunded'
      });

      // Send notifications
      await notifications.sendNotification(payment.user, 'refund_processed', {
        orderId: payment.order,
        amount
      });

      return payment;
    } catch (error) {
      throw new AppError(error.message, 400);
    }
  }
};

module.exports = paymentService; 