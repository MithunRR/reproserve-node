const db = require('../models');
const { Op } = require('sequelize');

const { Message, User } = db;

const userAttrs = ['id', 'firstName', 'lastName', 'email', 'role', 'businessName'];
const senderInclude = { model: User, as: 'sender', attributes: userAttrs };
const receiverInclude = { model: User, as: 'receiver', attributes: userAttrs };

exports.create = async (req, res) => {
  try {
    const { senderId, receiverId, content } = req.body;
    if (!senderId || !receiverId || !content || !content.trim()) {
      return res.status(400).json({
        success: false,
        message: 'senderId, receiverId and content are required'
      });
    }
    if (Number(senderId) === Number(receiverId)) {
      return res.status(400).json({ success: false, message: 'Cannot send a message to yourself' });
    }

    const [sender, receiver] = await Promise.all([
      User.findByPk(senderId),
      User.findByPk(receiverId)
    ]);
    if (!sender || !receiver) {
      return res.status(400).json({ success: false, message: 'Invalid senderId or receiverId' });
    }

    const record = await Message.create({ senderId, receiverId, content: content.trim() });
    return res.status(201).json({ success: true, message: 'Message sent', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /messages?userId=&withUserId=
// With both params → the conversation thread between the two users.
// With only userId → every message the user is part of.
exports.findAll = async (req, res) => {
  try {
    const { userId, withUserId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId query param is required' });
    }

    let where;
    if (withUserId) {
      where = {
        [Op.or]: [
          { senderId: userId, receiverId: withUserId },
          { senderId: withUserId, receiverId: userId }
        ]
      };
    } else {
      where = { [Op.or]: [{ senderId: userId }, { receiverId: userId }] };
    }

    const records = await Message.findAll({
      where,
      order: [['createdAt', 'ASC']],
      include: [senderInclude, receiverInclude]
    });

    // Reading a thread marks the partner's messages as read.
    if (withUserId) {
      await Message.update(
        { isRead: true },
        { where: { senderId: withUserId, receiverId: userId, isRead: false } }
      );
    }

    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /messages/conversations?userId=
// One entry per conversation partner: their info, the last message, unread count.
exports.conversations = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId query param is required' });
    }
    const uid = Number(userId);

    const records = await Message.findAll({
      where: { [Op.or]: [{ senderId: uid }, { receiverId: uid }] },
      order: [['createdAt', 'DESC']],
      include: [senderInclude, receiverInclude]
    });

    const threads = new Map();
    for (const msg of records) {
      const partner = msg.senderId === uid ? msg.receiver : msg.sender;
      if (!partner) continue;
      if (!threads.has(partner.id)) {
        threads.set(partner.id, { partner, lastMessage: msg, unreadCount: 0 });
      }
      if (msg.receiverId === uid && !msg.isRead) {
        threads.get(partner.id).unreadCount += 1;
      }
    }

    return res.status(200).json({
      success: true,
      count: threads.size,
      data: Array.from(threads.values())
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const record = await Message.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    record.isRead = true;
    await record.save();
    return res.status(200).json({ success: true, message: 'Message marked as read', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await Message.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Message not found' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
