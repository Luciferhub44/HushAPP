const { notifications } = require('../utils/notifications');
const { io } = require('../server');

const paymentNotifications = {
  async sendPaymentNotification(type, data) {
    try {
      const notificationTypes = {
        payment_received: {
          title: 'Payment Received',
          message: `Payment of ${data.amount} received for order #${data.orderId}`,
          priority: 'high'
        },
        payment_failed: {
          title: 'Payment Failed',
          message: `Payment failed for order #${data.orderId}: ${data.error}`,
          priority: 'high'
        },
        refund_processed: {
          title: 'Refund Processed',
          message: `Refund of ${data.amount} processed for order #${data.orderId}`,
          priority: 'high'
        },
        payout_initiated: {
          title: 'Payout Initiated',
          message: `Payout of ${data.amount} has been initiated`,
          priority: 'normal'
        },
        escrow_released: {
          title: 'Payment Released',
          message: `Payment of ${data.amount} has been released from escrow`,
          priority: 'normal'
        },
        dispute_update: {
          title: 'Payment Dispute Update',
          message: `Update on payment dispute for order #${data.orderId}: ${data.status}`,
          priority: 'high'
        }
      };

      const notificationConfig = notificationTypes[type];
      if (!notificationConfig) {
        throw new Error('Invalid notification type');
      }

      // Create notification record
      const notification = await notifications.create({
        recipient: data.userId,
        type: type,
        title: notificationConfig.title,
        message: notificationConfig.message,
        priority: notificationConfig.priority,
        data: {
          orderId: data.orderId,
          amount: data.amount,
          status: data.status,
          paymentId: data.paymentId
        }
      });

      // Send real-time notification via Socket.IO
      io.to(data.userId.toString()).emit('payment_notification', {
        type,
        ...notification.toObject()
      });

      // Send push notification if enabled
      if (data.pushEnabled) {
        await this.sendPushNotification(data.userId, notificationConfig, data);
      }

      // Send email notification if enabled
      if (data.emailEnabled) {
        await this.sendEmailNotification(data.userId, notificationConfig, data);
      }

      return notification;
    } catch (error) {
      console.error('Payment notification error:', error);
      // Don't throw error to prevent disrupting payment flow
      // but log it for monitoring
    }
  },

  async sendPushNotification(userId, config, data) {
    try {
      const user = await User.findById(userId).select('pushTokens');
      if (!user || !user.pushTokens?.length) return;

      const pushPayload = {
        title: config.title,
        body: config.message,
        data: {
          type: 'payment',
          orderId: data.orderId,
          amount: data.amount,
          status: data.status
        }
      };

      // Send to all user devices
      const pushPromises = user.pushTokens.map(token =>
        notifications.sendPush(token, pushPayload)
      );

      await Promise.allSettled(pushPromises);
    } catch (error) {
      console.error('Push notification error:', error);
    }
  },

  async sendEmailNotification(userId, config, data) {
    try {
      const user = await User.findById(userId).select('email');
      if (!user?.email) return;

      const emailTemplate = await this.getEmailTemplate(config.type, data);
      
      await notifications.sendEmail({
        to: user.email,
        subject: config.title,
        template: emailTemplate,
        data: {
          userName: user.username,
          amount: data.amount,
          orderId: data.orderId,
          status: data.status,
          actionUrl: `${process.env.FRONTEND_URL}/orders/${data.orderId}`
        }
      });
    } catch (error) {
      console.error('Email notification error:', error);
    }
  },

  async getEmailTemplate(type, data) {
    // Implementation for getting email templates
    // This could be stored in the database or as files
    const templates = {
      payment_received: 'payment-received',
      payment_failed: 'payment-failed',
      refund_processed: 'refund-processed',
      payout_initiated: 'payout-initiated',
      escrow_released: 'escrow-released',
      dispute_update: 'dispute-update'
    };

    return templates[type] || 'default-payment';
  },

  // Utility method to track notification delivery and engagement
  async trackNotificationEngagement(notificationId, userId, action) {
    try {
      await notifications.updateOne(
        { _id: notificationId },
        {
          $push: {
            engagement: {
              userId,
              action,
              timestamp: new Date()
            }
          }
        }
      );
    } catch (error) {
      console.error('Notification tracking error:', error);
    }
  }
};

module.exports = paymentNotifications; 