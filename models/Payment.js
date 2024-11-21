const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  booking: {
    type: mongoose.Schema.ObjectId,
    ref: 'Booking',
    required: true
  },
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
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
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  stripePaymentId: String,
  stripeCustomerId: String,
  receipt_url: String,
  refundReason: String,
  metadata: {
    type: Map,
    of: String
  },
  refund: {
    amount: Number,
    reason: String,
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    requestedAt: Date,
    processedAt: Date,
    stripeRefundId: String
  },
  dispute: {
    reason: String,
    description: String,
    status: {
      type: String,
      enum: ['open', 'under_review', 'resolved', 'closed'],
      default: 'open'
    },
    evidence: {
      explanation: String,
      serviceDate: Date,
      serviceDocuments: [{
        url: String,
        public_id: String
      }]
    },
    openedAt: Date,
    resolvedAt: Date,
    stripeDisputeId: String
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ booking: 1, status: 1 });
paymentSchema.index({ user: 1, artisan: 1 });

module.exports = mongoose.model('Payment', paymentSchema); 