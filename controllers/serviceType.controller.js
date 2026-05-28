const db = require('../models');
const { ServiceType } = db;

exports.create = async (req, res) => {
  try {
    const { name, description, isActive } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }
    const existing = await ServiceType.findOne({ where: { name: name.trim() } });
    if (existing) {
      return res.status(409).json({ success: false, message: 'Service type with this name already exists' });
    }
    const record = await ServiceType.create({
      name: name.trim(),
      description: description || null,
      isActive: isActive !== undefined ? !!isActive : true
    });
    return res.status(201).json({ success: true, message: 'Service type created', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const records = await ServiceType.findAll({ order: [['name', 'ASC']] });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const record = await ServiceType.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Service type not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await ServiceType.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Service type not found' });
    }
    const { name, description, isActive } = req.body;
    if (name !== undefined) record.name = name.trim();
    if (description !== undefined) record.description = description;
    if (isActive !== undefined) record.isActive = !!isActive;
    await record.save();
    return res.status(200).json({ success: true, message: 'Service type updated', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await ServiceType.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Service type not found' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Service type deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
