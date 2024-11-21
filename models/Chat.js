const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true
  },
  content: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['text', 'system', 'quick_reply', 'file'],
    default: 'text'
  },
  status: {
    type: String,
    enum: ['sent', 'delivered', 'read'],
    default: 'sent'
  },
  deliveredTo: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    at: Date
  }],
  readBy: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    at: Date
  }],
  attachments: [{
    type: {
      type: String,
      enum: ['image', 'document', 'audio', 'video'],
      required: true
    },
    url: {
      type: String,
      required: true
    },
    public_id: String,
    filename: String,
    size: Number,
    mimeType: String,
    duration: Number, // For audio/video
    dimensions: {
      width: Number,
      height: Number
    }, // For images/videos
    thumbnail: String
  }],
  metadata: {
    type: Map,
    of: String
  },
  reactions: [{
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: true
    },
    emoji: {
      type: String,
      required: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  edited: {
    type: Boolean,
    default: false
  },
  editHistory: [{
    content: String,
    editedAt: {
      type: Date,
      default: Date.now
    }
  }],
  replyTo: {
    messageId: mongoose.Schema.ObjectId,
    content: String,
    sender: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  forwarded: {
    type: Boolean,
    default: false
  },
  forwardedFrom: {
    chat: {
      type: mongoose.Schema.ObjectId,
      ref: 'Chat'
    },
    message: mongoose.Schema.ObjectId
  },
  encrypted: {
    type: Boolean,
    default: true
  },
  encryptedContent: {
    type: String,
    select: false
  },
  expiresAt: Date,
  preview: {
    type: {
      type: String,
      enum: ['link', 'image', 'video', 'document']
    },
    title: String,
    description: String,
    url: String,
    thumbnail: String
  }
}, {
  timestamps: true
});

const chatSchema = new mongoose.Schema({
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
  messages: [messageSchema],
  lastMessage: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['active', 'archived', 'blocked'],
    default: 'active'
  },
  settings: {
    encryption: {
      type: Boolean,
      default: true
    },
    messageExpiration: {
      enabled: {
        type: Boolean,
        default: false
      },
      duration: {
        type: Number,
        default: 24 // hours
      }
    },
    notifications: {
      enabled: {
        type: Boolean,
        default: true
      },
      sound: {
        type: Boolean,
        default: true
      }
    }
  },
  metadata: {
    type: Map,
    of: String
  }
}, {
  timestamps: true
});

// Indexes
chatSchema.index({ booking: 1 });
chatSchema.index({ user: 1, artisan: 1 });
chatSchema.index({ lastMessage: -1 });
chatSchema.index({ 'messages.createdAt': 1 });
chatSchema.index({ status: 1 });

// Methods
chatSchema.methods.markMessagesAsRead = async function(userId) {
  const unreadMessages = this.messages.filter(
    msg => !msg.readBy.some(read => read.user.toString() === userId.toString())
  );

  unreadMessages.forEach(msg => {
    msg.readBy.push({
      user: userId,
      at: new Date()
    });
  });

  await this.save();
  return unreadMessages.length;
};

chatSchema.methods.addMessage = async function(messageData) {
  this.messages.push(messageData);
  this.lastMessage = new Date();
  return this.save();
};

chatSchema.methods.getUnreadCount = function(userId) {
  return this.messages.filter(
    msg => !msg.readBy.some(read => read.user.toString() === userId.toString())
  ).length;
};

// Middleware
chatSchema.pre(/^find/, function(next) {
  this.populate({
    path: 'user',
    select: 'username avatar'
  }).populate({
    path: 'artisan',
    select: 'username artisanProfile.businessName avatar'
  });
  next();
});

module.exports = mongoose.model('Chat', chatSchema); 