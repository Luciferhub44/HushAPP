const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  artisan: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  platformFee: {
    type: Number,
    required: true
  },
  currency: {
    type: String,
    default: 'usd',
    enum: ['usd', 'eur', 'gbp']
  },
  paymentMethod: {
    type: String,
    required: true,
    enum: ['card', 'wallet', 'bank_transfer']
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'in_escrow', 'released', 'refunded', 'failed'],
    default: 'pending'
  },
  escrow: {
    releasedAt: Date,
    releasedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    conditions: [{
      type: String,
      enum: ['service_completed', 'customer_approved', 'dispute_resolved'],
      required: true
    }]
  },
  stripePaymentIntentId: String,
  stripeTransferId: String,
  refund: {
    amount: Number,
    reason: String,
    status: String,
    refundedAt: Date
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
paymentSchema.index({ order: 1, status: 1 });
paymentSchema.index({ user: 1, artisan: 1 });
paymentSchema.index({ 'escrow.releasedAt': 1 }, { sparse: true });

module.exports = mongoose.model('Payment', paymentSchema); 