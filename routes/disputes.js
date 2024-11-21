const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Dispute = require('../models/Dispute');
const { AppError } = require('../middleware/error');
const { upload } = require('../config/cloudinary');
const { notifications } = require('../utils/notifications');

// Create new dispute
router.post('/', protect, upload.array('evidence', 5), async (req, res, next) => {
  try {
    const { orderId, type, description } = req.body;
    const order = await Order.findById(orderId);

    if (!order) {
      return next(new AppError('Order not found', 404));
    }

    // Determine who's raising the dispute and against whom
    const isUser = order.user.toString() === req.user.id;
    const dispute = await Dispute.create({
      order: orderId,
      raisedBy: req.user.id,
      against: isUser ? order.artisan : order.user,
      type,
      description,
      evidence: req.files ? req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
        url: file.path,
        description: file.originalname
      })) : []
    });

    // Notify the other party
    await notifications.sendNotification(dispute.against, 'dispute_opened', {
      disputeId: dispute._id,
      orderId: order._id,
      type
    });

    res.status(201).json({
      status: 'success',
      data: { dispute }
    });
  } catch (err) {
    next(err);
  }
});

// Add message to dispute
router.post('/:id/messages', protect, upload.array('attachments', 3), async (req, res, next) => {
  try {
    const { message } = req.body;
    const dispute = await Dispute.findById(req.params.id);

    if (!dispute) {
      return next(new AppError('Dispute not found', 404));
    }

    // Verify user is involved in dispute
    if (![dispute.raisedBy.toString(), dispute.against.toString()].includes(req.user.id)) {
      return next(new AppError('Not authorized', 403));
    }

    const newMessage = {
      sender: req.user.id,
      message,
      attachments: req.files ? req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
        url: file.path
      })) : []
    };

    dispute.messages.push(newMessage);
    await dispute.save();

    // Notify other party
    const recipientId = dispute.raisedBy.toString() === req.user.id ? 
      dispute.against : dispute.raisedBy;
    
    await notifications.sendNotification(recipientId, 'dispute_message', {
      disputeId: dispute._id,
      message: message.substring(0, 50) + (message.length > 50 ? '...' : '')
    });

    res.status(200).json({
      status: 'success',
      data: { message: newMessage }
    });
  } catch (err) {
    next(err);
  }
});

// Get user's disputes
router.get('/my-disputes', protect, async (req, res, next) => {
  try {
    const disputes = await Dispute.find({
      $or: [
        { raisedBy: req.user.id },
        { against: req.user.id }
      ]
    })
    .populate('order', 'orderNumber totalAmount')
    .populate('raisedBy', 'username')
    .populate('against', 'username')
    .sort('-createdAt');

    res.status(200).json({
      status: 'success',
      results: disputes.length,
      data: { disputes }
    });
  } catch (err) {
    next(err);
  }
});

// Get single dispute
router.get('/:id', protect, async (req, res, next) => {
  try {
    const dispute = await Dispute.findById(req.params.id)
      .populate('order')
      .populate('raisedBy', 'username profileImage')
      .populate('against', 'username profileImage')
      .populate('messages.sender', 'username profileImage');

    if (!dispute) {
      return next(new AppError('Dispute not found', 404));
    }

    // Check if user is involved in dispute
    if (![dispute.raisedBy.toString(), dispute.against.toString()].includes(req.user.id)) {
      return next(new AppError('Not authorized', 403));
    }

    res.status(200).json({
      status: 'success',
      data: { dispute }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 