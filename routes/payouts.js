const router = require('express').Router();
const stripe = require('../config/stripe');
const { protect, restrictTo } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const Payout = require('../models/Payout');
const Payment = require('../models/Payment');
const User = require('../models/User');

// @desc    Get artisan payout history
// @route   GET /api/payouts/history
// @access  Private/Artisan
router.get('/history', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const payouts = await Payout.find({ artisan: req.user.id })
      .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: payouts.length,
      data: { payouts }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get payout analytics
// @route   GET /api/payouts/analytics
// @access  Private/Artisan
router.get('/analytics', protect, restrictTo('artisan'), async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;
    const query = {
      artisan: req.user.id,
      status: 'completed'
    };

    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const payments = await Payment.find(query);

    // Calculate analytics
    const analytics = {
      totalEarnings: 0,
      totalPayouts: 0,
      pendingPayouts: 0,
      completedJobs: 0,
      averageJobValue: 0,
      monthlyEarnings: {},
      serviceTypeBreakdown: {}
    };

    payments.forEach(payment => {
      analytics.totalEarnings += payment.amount;
      analytics.completedJobs++;

      // Monthly breakdown
      const month = payment.createdAt.toLocaleString('default', { month: 'long', year: 'numeric' });
      analytics.monthlyEarnings[month] = (analytics.monthlyEarnings[month] || 0) + payment.amount;

      // Service type breakdown
      const booking = payment.booking;
      if (booking && booking.service) {
        analytics.serviceTypeBreakdown[booking.service] = 
          (analytics.serviceTypeBreakdown[booking.service] || 0) + payment.amount;
      }
    });

    analytics.averageJobValue = analytics.totalEarnings / analytics.completedJobs || 0;

    // Get payout information
    const payouts = await Payout.find({ artisan: req.user.id });
    analytics.totalPayouts = payouts
      .filter(p => p.status === 'paid')
      .reduce((sum, p) => sum + p.amount, 0);

    analytics.pendingPayouts = payouts
      .filter(p => p.status === 'pending')
      .reduce((sum, p) => sum + p.amount, 0);

    res.status(200).json({
      status: 'success',
      data: { analytics }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Process automatic payouts (Cron job endpoint)
// @route   POST /api/payouts/process
// @access  Private/Admin
router.post('/process', protect, restrictTo('admin'), async (req, res, next) => {
  try {
    // Get all artisans with pending payments
    const artisans = await User.find({ userType: 'artisan' });

    for (const artisan of artisans) {
      // Get completed payments not yet included in a payout
      const payments = await Payment.find({
        artisan: artisan._id,
        status: 'completed',
        payout: { $exists: false }
      });

      if (payments.length === 0) continue;

      const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);
      const processingFee = totalAmount * 0.029 + 0.30; // Example fee calculation
      const netAmount = totalAmount - processingFee;

      // Create payout in Stripe
      const stripePayout = await stripe.transfers.create({
        amount: Math.round(netAmount * 100), // Convert to cents
        currency: 'usd',
        destination: artisan.stripeAccountId,
        transfer_group: `payout_${Date.now()}`
      });

      // Create payout record
      const payout = await Payout.create({
        artisan: artisan._id,
        amount: totalAmount,
        netAmount,
        processingFee,
        status: 'processing',
        paymentMethod: 'stripe',
        stripePayoutId: stripePayout.id,
        paymentPeriod: {
          startDate: payments[0].createdAt,
          endDate: payments[payments.length - 1].createdAt
        },
        payments: payments.map(p => p._id)
      });

      // Update payments with payout reference
      await Payment.updateMany(
        { _id: { $in: payments.map(p => p._id) } },
        { payout: payout._id }
      );

      // Notify artisan
      io.to(artisan._id.toString()).emit('payoutProcessed', {
        payout,
        amount: netAmount
      });
    }

    res.status(200).json({
      status: 'success',
      message: 'Payouts processed successfully'
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 