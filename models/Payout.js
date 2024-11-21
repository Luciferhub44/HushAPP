const mongoose = require('mongoose');

const payoutSchema = new mongoose.Schema({
  artisan: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd'
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'paid', 'failed'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  stripePayoutId: String,
  stripeTransferId: String,
  paymentPeriod: {
    startDate: Date,
    endDate: Date
  },
  payments: [{
    type: mongoose.Schema.ObjectId,
    ref: 'Payment'
  }],
  metadata: {
    type: Map,
    of: String
  },
  failureReason: String,
  processingFee: Number,
  netAmount: Number
}, {
  timestamps: true
});

// Indexes
payoutSchema.index({ artisan: 1, status: 1 });
payoutSchema.index({ 'paymentPeriod.startDate': 1, 'paymentPeriod.endDate': 1 });

module.exports = mongoose.model('Payout', payoutSchema); 