const Chat = require('../models/Chat');
const User = require('../models/User');
const Notification = require('../models/Notification');

class SocketHandler {
  constructor(io) {
    this.io = io;
    this.onlineUsers = new Map();
  }

  initialize() {
    this.io.on('connection', (socket) => {
      this.handleConnection(socket);
      this.setupEventHandlers(socket);
    });
  }

  handleConnection(socket) {
    console.log('User connected:', socket.user.username);
    
    // Join user to their personal room
    socket.join(socket.user._id.toString());
    
    // Set user as online
    this.onlineUsers.set(socket.user._id.toString(), socket.id);
    this.io.emit('userOnline', socket.user._id);
  }

  setupEventHandlers(socket) {
    // Chat events
    this.handleChatEvents(socket);
    
    // Booking events
    this.handleBookingEvents(socket);
    
    // Payment events
    this.handlePaymentEvents(socket);
    
    // Notification events
    this.handleNotificationEvents(socket);
    
    // Disconnect event
    socket.on('disconnect', () => this.handleDisconnect(socket));
  }

  handleChatEvents(socket) {
    socket.on('sendMessage', async (data) => {
      try {
        const { chatId, content, attachments } = data;
        const chat = await Chat.findById(chatId);
        
        if (!chat) return;

        const message = {
          sender: socket.user._id,
          content,
          attachments,
          status: 'sent',
          createdAt: new Date()
        };

        chat.messages.push(message);
        chat.lastMessage = new Date();
        await chat.save();

        const savedMessage = chat.messages[chat.messages.length - 1];

        // Send message to both user and artisan
        this.io.to(chat.user.toString())
          .to(chat.artisan.toString())
          .emit('newMessage', {
            chatId,
            message: savedMessage
          });

        // Create notification for recipient
        const recipientId = socket.user._id.equals(chat.user) ? chat.artisan : chat.user;
        await this.createNotification({
          recipient: recipientId,
          title: 'New Message',
          message: `New message from ${socket.user.username}`,
          type: 'message',
          relatedId: chat._id,
          onModel: 'Chat'
        });
      } catch (error) {
        console.error('Message error:', error);
      }
    });

    socket.on('typing', (data) => {
      const { chatId, isTyping } = data;
      socket.to(chatId).emit('userTyping', {
        chatId,
        userId: socket.user._id,
        isTyping
      });
    });

    socket.on('messageDelivered', async (data) => {
      try {
        const { chatId, messageId } = data;
        const chat = await Chat.findById(chatId);
        
        if (!chat) return;

        const message = chat.messages.id(messageId);
        if (!message) return;

        message.status = 'delivered';
        await chat.save();

        this.io.to(message.sender.toString()).emit('messageStatus', {
          chatId,
          messageId,
          status: 'delivered'
        });
      } catch (error) {
        console.error('Message delivery error:', error);
      }
    });
  }

  handleBookingEvents(socket) {
    socket.on('bookingUpdate', async (data) => {
      const { bookingId, status } = data;
      // Emit to relevant users based on booking status change
      // Implementation details will depend on your booking model
    });
  }

  handlePaymentEvents(socket) {
    socket.on('paymentUpdate', async (data) => {
      const { paymentId, status } = data;
      // Handle payment status updates
      // Implementation details will depend on your payment model
    });
  }

  handleNotificationEvents(socket) {
    socket.on('markNotificationRead', async (notificationId) => {
      try {
        const notification = await Notification.findOne({
          _id: notificationId,
          recipient: socket.user._id
        });

        if (notification) {
          notification.read = true;
          await notification.save();
        }
      } catch (error) {
        console.error('Notification error:', error);
      }
    });
  }

  handleDisconnect(socket) {
    this.onlineUsers.delete(socket.user._id.toString());
    this.io.emit('userOffline', socket.user._id);
    console.log('User disconnected:', socket.user.username);
  }

  async createNotification(data) {
    try {
      const notification = await Notification.create(data);
      this.io.to(data.recipient.toString()).emit('notification', notification);
      return notification;
    } catch (error) {
      console.error('Create notification error:', error);
    }
  }

  // Helper method to check if user is online
  isUserOnline(userId) {
    return this.onlineUsers.has(userId.toString());
  }

  // Helper method to get user's socket id
  getUserSocketId(userId) {
    return this.onlineUsers.get(userId.toString());
  }

  // Helper method to broadcast to multiple users
  broadcastToUsers(userIds, event, data) {
    userIds.forEach(userId => {
      const socketId = this.getUserSocketId(userId);
      if (socketId) {
        this.io.to(socketId).emit(event, data);
      }
    });
  }
}

module.exports = SocketHandler; 