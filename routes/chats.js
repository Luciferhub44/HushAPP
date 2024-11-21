const router = require('express').Router();
const { protect } = require('../middleware/auth');
const { AppError } = require('../middleware/error');
const Chat = require('../models/Chat');
const Booking = require('../models/Booking');
const { upload } = require('../config/cloudinary');
const { encryptMessage, decryptMessage } = require('../utils/encryption');
const { generatePreview } = require('../utils/filePreview');

// @desc    Get all chats for a user
// @route   GET /api/chats
// @access  Private
router.get('/', protect, async (req, res, next) => {
  try {
    const chats = await Chat.find({
      $or: [
        { user: req.user._id },
        { artisan: req.user._id }
      ]
    })
    .populate('user', 'username avatar')
    .populate('artisan', 'username artisanProfile.businessName avatar')
    .populate('booking', 'service scheduledDate status')
    .sort('-lastMessage');

    res.status(200).json({
      status: 'success',
      results: chats.length,
      data: { chats }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Get chat messages
// @route   GET /api/chats/:chatId/messages
// @access  Private
router.get('/:chatId/messages', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      $or: [
        { user: req.user._id },
        { artisan: req.user._id }
      ]
    }).select('+messages.encryptedContent');

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    // Decrypt messages
    const decryptedMessages = chat.messages.map(msg => {
      if (msg.encrypted && msg.encryptedContent) {
        try {
          msg.content = decryptMessage(msg.encryptedContent);
        } catch (error) {
          msg.content = 'Message decryption failed';
        }
      }
      return msg;
    });

    res.status(200).json({
      status: 'success',
      data: { messages: decryptedMessages }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Create new chat for booking
// @route   POST /api/chats/booking/:bookingId
// @access  Private
router.post('/booking/:bookingId', protect, async (req, res, next) => {
  try {
    const booking = await Booking.findById(req.params.bookingId);
    if (!booking) {
      return next(new AppError('Booking not found', 404));
    }

    // Check if chat already exists
    let chat = await Chat.findOne({ booking: booking._id });
    if (chat) {
      return next(new AppError('Chat already exists for this booking', 400));
    }

    // Create new chat
    chat = await Chat.create({
      booking: booking._id,
      user: booking.user,
      artisan: booking.artisan,
      messages: [{
        sender: req.user._id,
        content: req.body.message
      }]
    });

    res.status(201).json({
      status: 'success',
      data: { chat }
    });
  } catch (err) {
    next(err);
  }
});

// Add this new route for file uploads
router.post('/:chatId/upload', protect, upload.single('file'), async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      $or: [
        { user: req.user._id },
        { artisan: req.user._id }
      ]
    });

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    if (!req.file) {
      return next(new AppError('Please upload a file', 400));
    }

    const preview = generatePreview(req.file);
    const message = {
      sender: req.user._id,
      content: req.body.message || `Shared a ${preview.type}`,
      attachments: [{
        type: preview.type,
        url: preview.url,
        public_id: req.file.filename,
        filename: req.file.originalname,
        size: req.file.size,
        mimeType: req.file.mimetype
      }],
      preview
    };

    if (req.body.expirationHours) {
      message.expiresAt = new Date(Date.now() + req.body.expirationHours * 60 * 60 * 1000);
    }

    chat.messages.push(message);
    chat.lastMessage = new Date();
    await chat.save();

    // Emit socket event with preview
    io.to(chat.user.toString())
      .to(chat.artisan.toString())
      .emit('newMessage', {
        chatId: chat._id,
        message: chat.messages[chat.messages.length - 1]
      });

    res.status(200).json({
      status: 'success',
      data: { message: chat.messages[chat.messages.length - 1] }
    });
  } catch (err) {
    next(err);
  }
});

// Add this route for setting message expiration
router.patch('/:chatId/messages/:messageId/expiration', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      $or: [
        { user: req.user._id },
        { artisan: req.user._id }
      ]
    });

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    const message = chat.messages.id(req.params.messageId);
    if (!message) {
      return next(new AppError('Message not found', 404));
    }

    // Only message sender can set expiration
    if (message.sender.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to modify this message', 403));
    }

    message.expiresAt = new Date(Date.now() + req.body.expirationHours * 60 * 60 * 1000);
    await chat.save();

    res.status(200).json({
      status: 'success',
      data: { message }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Add reaction to message
// @route   POST /api/chats/:chatId/messages/:messageId/react
// @access  Private
router.post('/:chatId/messages/:messageId/react', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      $or: [
        { user: req.user._id },
        { artisan: req.user._id }
      ]
    });

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    const message = chat.messages.id(req.params.messageId);
    if (!message) {
      return next(new AppError('Message not found', 404));
    }

    // Remove existing reaction from same user if exists
    const existingReactionIndex = message.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );

    if (existingReactionIndex > -1) {
      message.reactions.splice(existingReactionIndex, 1);
    }

    // Add new reaction
    message.reactions.push({
      user: req.user._id,
      emoji: req.body.emoji
    });

    await chat.save();

    // Emit reaction update
    io.to(chat.user.toString())
      .to(chat.artisan.toString())
      .emit('messageReaction', {
        chatId: chat._id,
        messageId: message._id,
        reaction: {
          user: req.user._id,
          emoji: req.body.emoji
        }
      });

    res.status(200).json({
      status: 'success',
      data: { message }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Edit message
// @route   PATCH /api/chats/:chatId/messages/:messageId
// @access  Private
router.patch('/:chatId/messages/:messageId', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      $or: [
        { user: req.user._id },
        { artisan: req.user._id }
      ]
    });

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    const message = chat.messages.id(req.params.messageId);
    if (!message) {
      return next(new AppError('Message not found', 404));
    }

    // Check if user is the message sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return next(new AppError('Not authorized to edit this message', 403));
    }

    // Check if message is too old to edit (e.g., 24 hours)
    const messageAge = Date.now() - message.createdAt.getTime();
    if (messageAge > 24 * 60 * 60 * 1000) {
      return next(new AppError('Message is too old to edit', 400));
    }

    // Store original content in edit history
    message.editHistory.push({
      content: message.content,
      editedAt: new Date()
    });

    // Update message content
    if (req.body.content) {
      if (message.encrypted) {
        message.encryptedContent = encryptMessage(req.body.content);
        message.content = 'Encrypted message';
      } else {
        message.content = req.body.content;
      }
    }

    message.edited = true;
    await chat.save();

    // Emit message update
    io.to(chat.user.toString())
      .to(chat.artisan.toString())
      .emit('messageEdited', {
        chatId: chat._id,
        messageId: message._id,
        message
      });

    res.status(200).json({
      status: 'success',
      data: { message }
    });
  } catch (err) {
    next(err);
  }
});

// @desc    Remove reaction from message
// @route   DELETE /api/chats/:chatId/messages/:messageId/react
// @access  Private
router.delete('/:chatId/messages/:messageId/react', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      $or: [
        { user: req.user._id },
        { artisan: req.user._id }
      ]
    });

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    const message = chat.messages.id(req.params.messageId);
    if (!message) {
      return next(new AppError('Message not found', 404));
    }

    // Remove reaction
    const reactionIndex = message.reactions.findIndex(
      r => r.user.toString() === req.user._id.toString()
    );

    if (reactionIndex > -1) {
      message.reactions.splice(reactionIndex, 1);
      await chat.save();

      // Emit reaction removal
      io.to(chat.user.toString())
        .to(chat.artisan.toString())
        .emit('messageReactionRemoved', {
          chatId: chat._id,
          messageId: message._id,
          userId: req.user._id
        });
    }

    res.status(200).json({
      status: 'success',
      data: { message }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 