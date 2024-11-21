const Notification = require('../models/Notification');
const { io } = require('../server');

const notifications = {
  async sendNotification(userId, type, data) {
    try {
      const notification = await Notification.create({
        user: userId,
        type,
        data,
        read: false
      });

      // Send real-time notification
      io.to(userId.toString()).emit('notification', {
        type,
        data,
        createdAt: notification.createdAt
      });

      return notification;
    } catch (error) {
      console.error('Notification error:', error);
    }
  },

  // Notification types
  types: {
    NEW_ORDER: 'new_order',
    ORDER_STATUS_CHANGE: 'order_status_change',
    NEW_REVIEW: 'new_review',
    PRICE_ALERT: 'price_alert',
    STOCK_ALERT: 'stock_alert',
    CUSTOM_REQUEST: 'custom_request'
  }
};

module.exports = notifications; 