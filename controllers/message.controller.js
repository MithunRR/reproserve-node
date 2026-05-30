const db = require('../models');
const { Op } = require('sequelize');

const { Message, User } = db;

const userAttrs = ['id', 'firstName', 'lastName', 'email', 'role', 'businessName'];
const senderInclude = { model: User, as: 'sender', attributes: userAttrs };
const receiverInclude = { model: User, as: 'receiver', attributes: userAttrs };

// REST fallback for sending a message. Mirrors the socket path so a client
// without an active socket can still POST. Sender is taken from the JWT,
// never the body, so a user can't impersonate someone else.
exports.create = async (req, res) => {
  try {
    const senderId = req.userId;
    const receiverId = Number(req.body?.receiverId);
    const content = (req.body?.content || '').toString().trim();

    if (!senderId || !receiverId || !content) {
      return res.status(400).json({ success: false, message: 'receiverId and content are required' });
    }
    if (Number(senderId) === receiverId) {
      return res.status(400).json({ success: false, message: 'Cannot send a message to yourself' });
    }

    const receiver = await User.findByPk(receiverId, { attributes: ['id'] });
    if (!receiver) {
      return res.status(400).json({ success: false, message: 'Invalid receiverId' });
    }

    const record = await Message.create({ senderId, receiverId, content });
    const enriched = await Message.findByPk(record.id, {
      include: [senderInclude, receiverInclude]
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`user:${receiverId}`).emit('message:new', enriched);
      io.to(`user:${senderId}`).emit('message:new', enriched);
    }

    return res.status(201).json({ success: true, message: 'Message sent', data: enriched });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /messages?withUserId=<peerId>
//   thread between the authenticated user and the given peer
// GET /messages
//   every message the authenticated user is part of (rarely needed by UI)
exports.findAll = async (req, res) => {
  try {
    const userId = req.userId;
    const { withUserId } = req.query;

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

    // Opening a thread marks the partner's messages as read.
    if (withUserId) {
      await Message.update(
        { isRead: true },
        { where: { senderId: withUserId, receiverId: userId, isRead: false } }
      );
      const io = req.app.get('io');
      if (io) io.to(`user:${withUserId}`).emit('message:read', { by: userId, peerId: Number(withUserId) });
    }

    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /messages/conversations
// One entry per conversation partner with their info, the most recent
// message, and an unread count for the current user.
exports.conversations = async (req, res) => {
  try {
    const uid = Number(req.userId);

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

// GET /messages/unread-count  →  { total }  – used to seed the header badge.
exports.unreadCount = async (req, res) => {
  try {
    const total = await Message.count({
      where: { receiverId: req.userId, isRead: false }
    });
    return res.status(200).json({ success: true, total });
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
    if (Number(record.receiverId) !== Number(req.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
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
    if (Number(record.senderId) !== Number(req.userId) && Number(record.receiverId) !== Number(req.userId)) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
