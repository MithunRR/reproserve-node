const db = require('../models');

const { Notification, User } = db;

// GET /notifications?userId=&isRead=
exports.findAll = async (req, res) => {
  try {
    const { userId, isRead } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId query param is required' });
    }
    const where = { userId };
    if (isRead !== undefined) where.isRead = String(isRead) === 'true';

    const records = await Notification.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    const unreadCount = records.filter((n) => !n.isRead).length;

    return res.status(200).json({
      success: true,
      count: records.length,
      unreadCount,
      data: records
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.create = async (req, res) => {
  try {
    const { userId, type, title, message, link } = req.body;
    if (!userId || !title) {
      return res.status(400).json({ success: false, message: 'userId and title are required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid userId — user not found' });
    }

    const record = await Notification.create({
      userId,
      type: type || 'general',
      title,
      message: message || null,
      link: link || null
    });
    return res.status(201).json({ success: true, message: 'Notification created', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.markRead = async (req, res) => {
  try {
    const record = await Notification.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    record.isRead = true;
    await record.save();
    return res.status(200).json({ success: true, message: 'Notification marked as read', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /notifications/read-all  { userId }
exports.markAllRead = async (req, res) => {
  try {
    const userId = req.body.userId || req.query.userId;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId is required' });
    }
    const [updated] = await Notification.update(
      { isRead: true },
      { where: { userId, isRead: false } }
    );
    return res.status(200).json({ success: true, message: `${updated} notification(s) marked as read` });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await Notification.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Notification deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
