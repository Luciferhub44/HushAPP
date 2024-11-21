const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'location'],
      required: true
    },
    url: String,
    thumbnail: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    }
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    readAt: {
      type: Date,
      default: Date.now
    }
  }],
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  }
}, { timestamps: true });

const chatSchema = new mongoose.Schema({
  participants: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  messages: [messageSchema],
  lastMessage: {
    type: messageSchema,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  },
  metadata: {
    productInquiry: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    orderDiscussion: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }
}, { timestamps: true });

module.exports = mongoose.model('Chat', chatSchema); 