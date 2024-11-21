const Payment = require('../models/Payment');
const Order = require('../models/Order');
const { notifications } = require('./notifications');

const handleStripeEvent = async (event) => {
  switch (event.type) {
    case 'payment_intent.succeeded':
      await handlePaymentSuccess(event.data.object);
      break;
      
    case 'payment_intent.payment_failed':
      await handlePaymentFailure(event.data.object);
      break;
      
    case 'charge.dispute.created':
      await handleDisputeCreated(event.data.object);
      break;
      
    case 'transfer.paid':
      await handleTransferSuccess(event.data.object);
      break;
      
    case 'transfer.failed':
      await handleTransferFailure(event.data.object);
      break;
  }
};

const handlePaymentSuccess = async (paymentIntent) => {
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id
  });

  if (!payment) return;

  payment.status = 'in_escrow';
  await payment.save();

  // Update order status
  await Order.findByIdAndUpdate(payment.order, {
    paymentStatus: 'paid'
  });

  // Notify parties
  await notifications.sendNotification(payment.user, 'payment_success', {
    orderId: payment.order,
    amount: payment.amount
  });

  await notifications.sendNotification(payment.artisan, 'new_payment', {
    orderId: payment.order,
    amount: payment.amount
  });
};

const handlePaymentFailure = async (paymentIntent) => {
  const payment = await Payment.findOne({
    stripePaymentIntentId: paymentIntent.id
  });

  if (!payment) return;

  payment.status = 'failed';
  await payment.save();

  // Update order status
  await Order.findByIdAndUpdate(payment.order, {
    paymentStatus: 'failed'
  });

  // Notify user
  await notifications.sendNotification(payment.user, 'payment_failed', {
    orderId: payment.order,
    error: paymentIntent.last_payment_error?.message
  });
};

module.exports = {
  handleStripeEvent
}; 