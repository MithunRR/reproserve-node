const db = require('../models');
const { collectPhotoPaths } = require('../middleware/upload.middleware');

const { Project, User } = db;

const ownerInclude = {
  model: User, as: 'user',
  attributes: ['id', 'firstName', 'lastName', 'email', 'role']
};

exports.create = async (req, res) => {
  try {
    const {
      userId, title, category, description,
      location, budgetMin, budgetMax, timeline, status
    } = req.body;

    if (!userId || !title || !description) {
      return res.status(400).json({
        success: false,
        message: 'userId, title and description are required'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid userId — user not found' });
    }

    const photos = collectPhotoPaths(req);

    const record = await Project.create({
      userId,
      title,
      category: category || null,
      description,
      location: location || null,
      budgetMin: budgetMin || null,
      budgetMax: budgetMax || null,
      timeline: timeline || null,
      photos: photos.length ? photos : null,
      status: status || 'open'
    });

    return res.status(201).json({ success: true, message: 'Project created', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { userId, status } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;

    const records = await Project.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [ownerInclude]
    });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const record = await Project.findByPk(req.params.id, { include: [ownerInclude] });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await Project.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }

    const fields = ['title', 'category', 'description', 'location', 'budgetMin', 'budgetMax', 'timeline', 'status'];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) record[f] = req.body[f];
    });

    const photos = collectPhotoPaths(req);
    if (photos.length) {
      const existing = Array.isArray(record.photos) ? record.photos : [];
      record.photos = String(req.body.replacePhotos) === 'true' ? photos : [...existing, ...photos];
    }

    await record.save();
    return res.status(200).json({ success: true, message: 'Project updated', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await Project.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Project not found' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Project deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
