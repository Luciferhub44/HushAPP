const Chat = require('../models/Chat');
const { encryptMessage } = require('./encryption');
const messageTemplates = require('./messageTemplates');

const chatUtils = {
  async createSystemMessage(chatId, template, data) {
    const chat = await Chat.findById(chatId);
    if (!chat) return null;

    const message = messageTemplates[template.type][template.action](data);
    chat.messages.push({
      type: 'system',
      content: message.content,
      metadata: message.metadata,
      encrypted: false
    });

    await chat.save();
    return chat.messages[chat.messages.length - 1];
  },

  async sendEncryptedMessage(chatId, content, sender, attachments = []) {
    const chat = await Chat.findById(chatId);
    if (!chat) return null;

    const encryptedContent = encryptMessage(content);
    const message = {
      sender,
      content: 'Encrypted message',
      encryptedContent,
      encrypted: true,
      attachments,
      status: 'sent'
    };

    chat.messages.push(message);
    chat.lastMessage = new Date();
    await chat.save();

    return chat.messages[chat.messages.length - 1];
  },

  async markMessagesAsRead(chatId, userId) {
    const chat = await Chat.findById(chatId);
    if (!chat) return null;

    const unreadMessages = chat.messages.filter(
      msg => !msg.readBy.some(read => read.user.toString() === userId.toString())
    );

    unreadMessages.forEach(msg => {
      msg.readBy.push({
        user: userId,
        at: new Date()
      });
    });

    await chat.save();
    return unreadMessages.length;
  },

  async getUnreadCount(chatId, userId) {
    const chat = await Chat.findById(chatId);
    if (!chat) return 0;

    return chat.messages.filter(
      msg => !msg.readBy.some(read => read.user.toString() === userId.toString())
    ).length;
  },

  async addReaction(chatId, messageId, userId, emoji) {
    const chat = await Chat.findById(chatId);
    if (!chat) return null;

    const message = chat.messages.id(messageId);
    if (!message) return null;

    // Remove existing reaction from same user
    const existingReactionIndex = message.reactions.findIndex(
      r => r.user.toString() === userId.toString()
    );

    if (existingReactionIndex > -1) {
      message.reactions.splice(existingReactionIndex, 1);
    }

    message.reactions.push({
      user: userId,
      emoji,
      createdAt: new Date()
    });

    await chat.save();
    return message;
  },

  async removeReaction(chatId, messageId, userId) {
    const chat = await Chat.findById(chatId);
    if (!chat) return null;

    const message = chat.messages.id(messageId);
    if (!message) return null;

    const reactionIndex = message.reactions.findIndex(
      r => r.user.toString() === userId.toString()
    );

    if (reactionIndex > -1) {
      message.reactions.splice(reactionIndex, 1);
      await chat.save();
    }

    return message;
  },

  getQuickReplies(userType) {
    return messageTemplates.quickReplies[userType];
  },

  async deleteExpiredMessages() {
    const chats = await Chat.find({
      'messages.expiresAt': { $lt: new Date() }
    });

    for (const chat of chats) {
      chat.messages = chat.messages.filter(msg => {
        return !msg.expiresAt || msg.expiresAt > new Date();
      });
      await chat.save();
    }
  }
};

module.exports = chatUtils; 