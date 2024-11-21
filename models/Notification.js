const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['booking', 'message', 'payment', 'review', 'system', 'dispute'],
    required: true
  },
  read: {
    type: Boolean,
    default: false
  },
  relatedId: {
    type: mongoose.Schema.ObjectId,
    required: true
  },
  onModel: {
    type: String,
    enum: ['Booking', 'Chat', 'Payment'],
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'medium'
  },
  expiresAt: {
    type: Date,
    default: function() {
      // Default expiration is 30 days from now
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  metadata: {
    type: Map,
    of: String
  },
  actionUrl: String,
  actionText: String
}, {
  timestamps: true
});

// Indexes
notificationSchema.index({ recipient: 1, read: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 }); // TTL index

// Pre-save middleware to populate actionUrl based on type
notificationSchema.pre('save', function(next) {
  if (!this.actionUrl) {
    switch (this.onModel) {
      case 'Booking':
        this.actionUrl = `/bookings/${this.relatedId}`;
        this.actionText = 'View Booking';
        break;
      case 'Chat':
        this.actionUrl = `/chats/${this.relatedId}`;
        this.actionText = 'Open Chat';
        break;
      case 'Payment':
        this.actionUrl = `/payments/${this.relatedId}`;
        this.actionText = 'View Payment';
        break;
    }
  }
  next();
});

// Add method to mark notification as read
notificationSchema.methods.markAsRead = async function() {
  this.read = true;
  return this.save();
};

// Add method to mark multiple notifications as read
notificationSchema.statics.markManyAsRead = async function(recipientId, notificationIds) {
  return this.updateMany(
    {
      recipient: recipientId,
      _id: { $in: notificationIds }
    },
    { read: true }
  );
};

// Add method to clear old notifications
notificationSchema.statics.clearOldNotifications = async function(recipientId, days = 30) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  
  return this.deleteMany({
    recipient: recipientId,
    createdAt: { $lt: date },
    read: true
  });
};

module.exports = mongoose.model('Notification', notificationSchema); 