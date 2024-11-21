const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  raisedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  against: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['quality', 'delivery', 'payment', 'communication', 'other'],
    required: true
  },
  status: {
    type: String,
    enum: ['open', 'under_review', 'resolved', 'closed'],
    default: 'open'
  },
  description: {
    type: String,
    required: true
  },
  evidence: [{
    type: {
      type: String,
      enum: ['image', 'document', 'text'],
      required: true
    },
    url: String,
    description: String
  }],
  resolution: {
    type: {
      type: String,
      enum: ['refund', 'replacement', 'compensation', 'no_action']
    },
    amount: Number,
    description: String,
    resolvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    resolvedAt: Date
  },
  messages: [{
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    message: String,
    attachments: [{
      type: String,
      url: String
    }],
    createdAt: {
      type: Date,
      default: Date.now
    }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Dispute', disputeSchema); 