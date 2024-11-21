const router = require('express').Router();
const { protect } = require('../middleware/auth');
const Chat = require('../models/Chat');
const { AppError } = require('../middleware/error');
const { upload } = require('../config/cloudinary');
const { io } = require('../server');

// Get all chats for a user
router.get('/', protect, async (req, res, next) => {
  try {
    const chats = await Chat.find({
      participants: req.user.id,
      isActive: true
    })
    .populate('participants', 'username profileImage userType')
    .populate('lastMessage')
    .sort('-updatedAt');

    res.status(200).json({
      status: 'success',
      data: { chats }
    });
  } catch (err) {
    next(err);
  }
});

// Start a new chat
router.post('/start', protect, async (req, res, next) => {
  try {
    const { recipientId, initialMessage, metadata } = req.body;

    // Check if chat already exists
    const existingChat = await Chat.findOne({
      participants: { $all: [req.user.id, recipientId] },
      isActive: true
    });

    if (existingChat) {
      return res.status(200).json({
        status: 'success',
        data: { chat: existingChat }
      });
    }

    // Create new chat
    const chat = await Chat.create({
      participants: [req.user.id, recipientId],
      messages: [{
        sender: req.user.id,
        content: initialMessage
      }],
      metadata
    });

    // Set last message
    chat.lastMessage = chat.messages[0];
    await chat.save();

    // Notify recipient
    io.to(recipientId.toString()).emit('newChat', {
      chat: await chat.populate('participants', 'username profileImage userType')
    });

    res.status(201).json({
      status: 'success',
      data: { chat }
    });
  } catch (err) {
    next(err);
  }
});

// Send message in chat
router.post('/:chatId/messages', protect, upload.array('attachments', 5), async (req, res, next) => {
  try {
    const { content } = req.body;
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id,
      isActive: true
    });

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    // Create message with attachments if any
    const message = {
      sender: req.user.id,
      content,
      attachments: req.files ? req.files.map(file => ({
        type: file.mimetype.startsWith('image/') ? 'image' : 'document',
        url: file.path,
        thumbnail: file.mimetype.startsWith('image/') ? file.path : undefined
      })) : []
    };

    chat.messages.push(message);
    chat.lastMessage = message;
    await chat.save();

    // Notify other participants
    chat.participants
      .filter(p => p.toString() !== req.user.id.toString())
      .forEach(participantId => {
        io.to(participantId.toString()).emit('newMessage', {
          chatId: chat._id,
          message
        });
      });

    res.status(201).json({
      status: 'success',
      data: { message }
    });
  } catch (err) {
    next(err);
  }
});

// Mark messages as read
router.patch('/:chatId/read', protect, async (req, res, next) => {
  try {
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    });

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    // Mark unread messages as read
    const updatedMessages = chat.messages.map(msg => {
      if (msg.sender.toString() !== req.user.id.toString() && 
          !msg.readBy.some(read => read.user.toString() === req.user.id.toString())) {
        msg.readBy.push({
          user: req.user.id,
          readAt: new Date()
        });
      }
      return msg;
    });

    chat.messages = updatedMessages;
    await chat.save();

    res.status(200).json({
      status: 'success',
      data: { chat }
    });
  } catch (err) {
    next(err);
  }
});

// Get chat history
router.get('/:chatId/messages', protect, async (req, res, next) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const chat = await Chat.findOne({
      _id: req.params.chatId,
      participants: req.user.id
    })
    .populate('messages.sender', 'username profileImage')
    .slice('messages', [(page - 1) * limit, limit])
    .sort('-messages.createdAt');

    if (!chat) {
      return next(new AppError('Chat not found', 404));
    }

    res.status(200).json({
      status: 'success',
      data: {
        messages: chat.messages,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: chat.messages.length
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router; 