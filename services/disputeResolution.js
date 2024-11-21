const Dispute = require('../models/Dispute');
const Payment = require('../models/Payment');
const { notifications } = require('../utils/notifications');

const disputeResolution = {
  async initiateDispute(orderId, userId, type, description, evidence) {
    try {
      const payment = await Payment.findOne({ order: orderId });
      
      if (!payment) {
        throw new Error('Payment not found');
      }

      const dispute = await Dispute.create({
        order: orderId,
        payment: payment._id,
        raisedBy: userId,
        against: userId === payment.user.toString() ? payment.artisan : payment.user,
        type,
        description,
        evidence,
        status: 'open'
      });

      // Hold any pending payouts
      await Payment.findByIdAndUpdate(payment._id, {
        'escrow.holdReason': 'dispute_pending',
        'escrow.holdUntil': new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days hold
      });

      // Notify relevant parties
      await this.notifyDisputeParties(dispute);

      return dispute;
    } catch (error) {
      throw new Error(`Failed to initiate dispute: ${error.message}`);
    }
  },

  async resolveDispute(disputeId, resolution, resolvedBy) {
    try {
      const dispute = await Dispute.findById(disputeId);
      
      if (!dispute) {
        throw new Error('Dispute not found');
      }

      dispute.resolution = {
        type: resolution.type,
        amount: resolution.amount,
        description: resolution.description,
        resolvedBy,
        resolvedAt: new Date()
      };
      dispute.status = 'resolved';
      await dispute.save();

      // Handle resolution actions
      await this.handleResolutionActions(dispute, resolution);

      return dispute;
    } catch (error) {
      throw new Error(`Failed to resolve dispute: ${error.message}`);
    }
  },

  async handleResolutionActions(dispute, resolution) {
    const payment = await Payment.findOne({ order: dispute.order });

    switch (resolution.type) {
      case 'refund':
        await paymentService.processRefund(
          payment._id,
          resolution.amount,
          'dispute_resolution'
        );
        break;

      case 'partial_refund':
        await paymentService.processRefund(
          payment._id,
          resolution.amount,
          'dispute_partial_resolution'
        );
        break;

      case 'release_payment':
        await paymentService.releaseEscrowPayment(
          payment._id,
          'DISPUTE_RESOLVED'
        );
        break;

      case 'split_payment':
        await this.handleSplitPayment(payment, resolution);
        break;
    }

    // Notify parties of resolution
    await this.sendResolutionNotifications(dispute, resolution);
  },

  async escalateDispute(disputeId, reason) {
    try {
      const dispute = await Dispute.findById(disputeId);
      
      if (!dispute) {
        throw new Error('Dispute not found');
      }

      dispute.status = 'escalated';
      dispute.escalation = {
        reason,
        escalatedAt: new Date()
      };
      await dispute.save();

      // Notify admin team
      await notifications.notifyAdmins('dispute_escalated', {
        disputeId: dispute._id,
        orderId: dispute.order,
        reason
      });

      return dispute;
    } catch (error) {
      throw new Error(`Failed to escalate dispute: ${error.message}`);
    }
  },

  async addDisputeMessage(disputeId, userId, message, attachments = []) {
    try {
      const dispute = await Dispute.findById(disputeId);
      
      if (!dispute) {
        throw new Error('Dispute not found');
      }

      dispute.messages.push({
        sender: userId,
        message,
        attachments,
        createdAt: new Date()
      });
      await dispute.save();

      // Notify other party
      const recipientId = dispute.raisedBy.toString() === userId ? 
        dispute.against : dispute.raisedBy;
      
      await notifications.sendNotification(recipientId, 'dispute_message', {
        disputeId: dispute._id,
        message: message.substring(0, 100)
      });

      return dispute;
    } catch (error) {
      throw new Error(`Failed to add dispute message: ${error.message}`);
    }
  }
};

module.exports = disputeResolution; 