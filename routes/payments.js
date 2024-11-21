const router = require('express').Router();
const stripe = require('../config/stripe');
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const Payment = require('../models/Payment');
const Booking = require('../models/Booking');
const User = require('../models/User');
const Notification = require('../models/Notification');
const upload = require('../middleware/multer');

// @desc    Create payment intent
// @route   POST /api/payments/create-payment-intent
// @access  Private
router.post('/create-payment-intent', protect, async (req, res, next) => {
  try {
    const { bookingId } = req.body;

    const booking = await Booking.findById(bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    if (booking.user.toString() !== req.user.id) {
      return next(new AppError('Not authorized', 401));
    }

    // Create or get Stripe customer
    let customer;
    const user = await User.findById(req.user.id);
    if (user.stripeCustomerId) {
      customer = await stripe.customers.retrieve(user.stripeCustomerId);
    } else {
      customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user._id.toString()
        }
      });
      user.stripeCustomerId = customer.id;
      await user.save();
    }

    // Create payment intent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: booking.price * 100, // Convert to cents
      currency: 'usd',
      customer: customer.id,
      metadata: {
        bookingId: booking._id.toString(),
        userId: req.user.id,
        artisanId: booking.artisan.toString()
      }
    });

    // Create payment record
    await Payment.create({
      booking: booking._id,
      user: req.user.id,
      artisan: booking.artisan,
      amount: booking.price,
      paymentMethod: 'card',
      stripePaymentId: paymentIntent.id,
      stripeCustomerId: customer.id
    });

    res.status(200).json({
      status: 'success',
      clientSecret: paymentIntent.client_secret
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Webhook handler for Stripe events
// @route   POST /api/payments/webhook
// @access  Public
router.post('/webhook', async (req, res) => {
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
  switch (event.type) {
    case 'payment_intent.succeeded':
      const paymentIntent = event.data.object;
      await handlePaymentSuccess(paymentIntent);
      break;
    case 'payment_intent.payment_failed':
      const failedPayment = event.data.object;
      await handlePaymentFailure(failedPayment);
      break;
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  res.json({ received: true });
});

// @desc    Get payment history
// @route   GET /api/payments/history
// @access  Private
router.get('/history', protect, async (req, res, next) => {
  try {
    const payments = await Payment.find({
      $or: [
        { user: req.user.id },
        { artisan: req.user.id }
      ]
    })
    .populate('booking', 'service scheduledDate')
    .populate('user', 'username')
    .populate('artisan', 'username artisanProfile.businessName');

    res.status(200).json({
      status: 'success',
      results: payments.length,
      data: { payments }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Request refund
// @route   POST /api/payments/:id/refund
// @access  Private
router.post('/:id/refund', protect, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: 'completed'
    });

    if (!payment) {
      return next(new AppError('Payment not found or not eligible for refund', 404));
    }

    // Check if refund already requested
    if (payment.refund) {
      return next(new AppError('Refund already requested for this payment', 400));
    }

    // Check if within refund window (e.g., 7 days)
    const refundWindow = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds
    if (Date.now() - payment.createdAt > refundWindow) {
      return next(new AppError('Refund window has expired', 400));
    }

    // Create refund in Stripe
    const refund = await stripe.refunds.create({
      payment_intent: payment.stripePaymentId,
      reason: req.body.reason
    });

    // Update payment record
    payment.refund = {
      amount: payment.amount,
      reason: req.body.reason,
      status: 'pending',
      requestedAt: new Date(),
      stripeRefundId: refund.id
    };

    await payment.save();

    // Notify artisan
    io.to(payment.artisan.toString()).emit('refundRequested', {
      paymentId: payment._id,
      amount: payment.amount,
      reason: req.body.reason
    });

    res.status(200).json({
      status: 'success',
      data: { payment }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Open payment dispute
// @route   POST /api/payments/:id/dispute
// @access  Private
router.post('/:id/dispute', protect, async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      user: req.user.id,
      status: 'completed'
    });

    if (!payment) {
      return next(new AppError('Payment not found', 404));
    }

    if (payment.dispute) {
      return next(new AppError('Dispute already exists for this payment', 400));
    }

    // Create dispute record
    payment.dispute = {
      reason: req.body.reason,
      description: req.body.description,
      status: 'open',
      evidence: {
        explanation: req.body.explanation,
        serviceDate: payment.createdAt
      },
      openedAt: new Date()
    };

    await payment.save();

    // Notify artisan
    io.to(payment.artisan.toString()).emit('disputeOpened', {
      paymentId: payment._id,
      reason: req.body.reason
    });

    // Create admin notification
    await Notification.create({
      recipient: await User.findOne({ role: 'admin' }),
      title: 'New Payment Dispute',
      message: `A new dispute has been opened for payment ${payment._id}`,
      type: 'dispute',
      relatedId: payment._id,
      onModel: 'Payment'
    });

    res.status(200).json({
      status: 'success',
      data: { payment }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Submit dispute evidence (Artisan only)
// @route   POST /api/payments/:id/dispute/evidence
// @access  Private/Artisan
router.post('/:id/dispute/evidence', protect, restrictTo('artisan'), upload.array('documents', 5), async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      artisan: req.user.id,
      'dispute.status': 'open'
    });

    if (!payment) {
      return next(new AppError('Payment or dispute not found', 404));
    }

    // Upload evidence documents
    const documents = req.files.map(file => ({
      url: file.path,
      public_id: file.filename
    }));

    payment.dispute.evidence.serviceDocuments = documents;
    payment.dispute.evidence.explanation = req.body.explanation;
    payment.dispute.status = 'under_review';

    await payment.save();

    // Notify user
    io.to(payment.user.toString()).emit('disputeEvidenceSubmitted', {
      paymentId: payment._id
    });

    res.status(200).json({
      status: 'success',
      data: { payment }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Resolve dispute (Admin only)
// @route   PATCH /api/payments/:id/dispute/resolve
// @access  Private/Admin
router.patch('/:id/dispute/resolve', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    const payment = await Payment.findOne({
      _id: req.params.id,
      'dispute.status': { $in: ['open', 'under_review'] }
    });

    if (!payment) {
      return next(new AppError('Payment or dispute not found', 404));
    }

    payment.dispute.status = 'resolved';
    payment.dispute.resolvedAt = new Date();

    // If dispute is resolved in favor of user, process refund
    if (req.body.refund) {
      const refund = await stripe.refunds.create({
        payment_intent: payment.stripePaymentId,
        reason: 'requested_by_customer'
      });

      payment.refund = {
        amount: payment.amount,
        reason: 'Dispute resolution',
        status: 'approved',
        processedAt: new Date(),
        stripeRefundId: refund.id
      };
    }

    await payment.save();

    // Notify both parties
    io.to(payment.user.toString()).emit('disputeResolved', {
      paymentId: payment._id,
      resolution: req.body.refund ? 'refunded' : 'denied'
    });

    io.to(payment.artisan.toString()).emit('disputeResolved', {
      paymentId: payment._id,
      resolution: req.body.refund ? 'refunded' : 'denied'
    });

    res.status(200).json({
      status: 'success',
      data: { payment }
    });
  } catch (err) {
    next(err);
  }
});

// Helper functions for webhook handlers
async function handlePaymentSuccess(paymentIntent) {
  const payment = await Payment.findOne({ stripePaymentId: paymentIntent.id });
  if (payment) {
    payment.status = 'completed';
    payment.receipt_url = paymentIntent.charges.data[0].receipt_url;
    await payment.save();

    const booking = await Booking.findById(payment.booking);
    booking.paid = true;
    await booking.save();

    // Notify artisan of payment
    io.to(payment.artisan.toString()).emit('paymentReceived', {
      bookingId: payment.booking,
      amount: payment.amount
    });
  }
}

async function handlePaymentFailure(paymentIntent) {
  const payment = await Payment.findOne({ stripePaymentId: paymentIntent.id });
  if (payment) {
    payment.status = 'failed';
    await payment.save();
  }
}

module.exports = router; 