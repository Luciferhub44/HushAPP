const router = require('express').Router();
const { protect, restrictTo } = require('../middleware/auth');
const disputeResolution = require('../services/disputeResolution');
const { AppError } = require('../middleware/error');
const { upload } = require('../config/cloudinary');
const { 
  validateDispute, 
  validateDisputeMessage, 
  validateDisputeResolution 
} = require('../validation/disputeValidation');
const Dispute = require('../models/Dispute');

// Create new dispute
router.post('/', 
  protect, 
  upload.array('evidence', 5), 
  validateDispute, 
  async (req, res, next) => {
    try {
      const { orderId, type, description } = req.body;
      const evidence = req.files ? req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
        url: file.path,
        description: file.originalname
      })) : [];

      const dispute = await disputeResolution.initiateDispute(
        orderId,
        req.user.id,
        type,
        description,
        evidence
      );

      res.status(201).json({
        status: 'success',
        data: { dispute }
      });
    } catch (err) {
      next(err);
    }
});

// Get user's disputes
router.get('/my-disputes', protect, async (req, res, next) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;
    const skip = (page - 1) * limit;

    const query = {
      $or: [
        { raisedBy: req.user.id },
        { against: req.user.id }
      ]
    };

    if (status) {
      query.status = status;
    }

    const disputes = await Dispute.find(query)
      .populate('order', 'orderNumber totalAmount status')
      .populate('raisedBy', 'username profileImage')
      .populate('against', 'username profileImage')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit));

    const total = await Dispute.countDocuments(query);

    res.status(200).json({
      status: 'success',
      results: disputes.length,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page: parseInt(page),
        limit: parseInt(limit)
      },
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

// Add message to dispute
router.post('/:id/messages', 
  protect, 
  upload.array('attachments', 3),
  validateDisputeMessage,
  async (req, res, next) => {
    try {
      const { message } = req.body;
      const attachments = req.files ? req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
        url: file.path
      })) : [];

      const updatedDispute = await disputeResolution.addDisputeMessage(
        req.params.id,
        req.user.id,
        message,
        attachments
      );

      res.status(200).json({
        status: 'success',
        data: { dispute: updatedDispute }
      });
    } catch (err) {
      next(err);
    }
});

// Escalate dispute
router.post('/:id/escalate', protect, async (req, res, next) => {
  try {
    const { reason } = req.body;
    const dispute = await disputeResolution.escalateDispute(
      req.params.id,
      reason
    );

    res.status(200).json({
      status: 'success',
      data: { dispute }
    });
  } catch (err) {
    next(err);
  }
});

// Resolve dispute (Admin only)
router.post('/:id/resolve', 
  protect, 
  restrictTo('admin'), 
  validateDisputeResolution,
  async (req, res, next) => {
    try {
      const { resolution } = req.body;
      const dispute = await disputeResolution.resolveDispute(
        req.params.id,
        resolution,
        req.user.id
      );

      res.status(200).json({
        status: 'success',
        data: { dispute }
      });
    } catch (err) {
      next(err);
    }
});

module.exports = router; 