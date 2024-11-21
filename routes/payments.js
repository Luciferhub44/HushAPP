const router = require('express').Router();
const { protect } = require('../middleware/auth');
const paymentService = require('../services/payment');
const { AppError } = require('../middleware/error');
const { validatePayment } = require('../validation/paymentValidation');

// Create payment intent for order
router.post('/create-intent', protect, validatePayment, async (req, res, next) => {
  try {
    const { orderId, paymentMethod } = req.body;
    const paymentIntent = await paymentService.createEscrowPayment(orderId, paymentMethod);

    res.status(200).json({
      status: 'success',
      data: paymentIntent
    });
  } catch (err) {
    next(err);
  }
});

// Release escrow payment
router.post('/release/:paymentId', protect, async (req, res, next) => {
  try {
    const payment = await paymentService.releaseEscrowPayment(
      req.params.paymentId,
      req.user.id
    );

    res.status(200).json({
      status: 'success',
      data: { payment }
    });
  } catch (err) {
    next(err);
  }
});

// Process refund
router.post('/refund/:paymentId', protect, async (req, res, next) => {
  try {
    const { reason, amount } = req.body;
    const payment = await paymentService.processRefund(
      req.params.paymentId,
      reason,
      amount
    );

    res.status(200).json({
      status: 'success',
      data: { payment }
    });
  } catch (err) {
    next(err);
  }
});

// Stripe webhook handler
router.post('/webhook', async (req, res, next) => {
  const sig = req.headers['stripe-signature'];
  let event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 