const db = require('../models');

const { Favorite, User, ServiceType } = db;

const providerInclude = {
  model: User, as: 'provider',
  attributes: { exclude: ['password'] },
  include: [{ model: ServiceType, as: 'serviceType' }]
};

exports.create = async (req, res) => {
  try {
    const { userId, providerId } = req.body;
    if (!userId || !providerId) {
      return res.status(400).json({ success: false, message: 'userId and providerId are required' });
    }
    if (Number(userId) === Number(providerId)) {
      return res.status(400).json({ success: false, message: 'Cannot favorite yourself' });
    }

    const [user, provider] = await Promise.all([
      User.findByPk(userId),
      User.findByPk(providerId)
    ]);
    if (!user || !provider) {
      return res.status(400).json({ success: false, message: 'Invalid userId or providerId' });
    }

    // Idempotent — favoriting twice returns the existing row.
    const [record, created] = await Favorite.findOrCreate({
      where: { userId, providerId },
      defaults: { userId, providerId }
    });

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Added to favorites' : 'Already in favorites',
      data: record
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /favorites?userId=
exports.findAll = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ success: false, message: 'userId query param is required' });
    }
    const records = await Favorite.findAll({
      where: { userId },
      order: [['createdAt', 'DESC']],
      include: [providerInclude]
    });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /favorites/:id  — or  DELETE /favorites?userId=&providerId=
exports.remove = async (req, res) => {
  try {
    let record;
    if (req.params.id && req.params.id !== 'undefined') {
      record = await Favorite.findByPk(req.params.id);
    } else if (req.query.userId && req.query.providerId) {
      record = await Favorite.findOne({
        where: { userId: req.query.userId, providerId: req.query.providerId }
      });
    }
    if (!record) {
      return res.status(404).json({ success: false, message: 'Favorite not found' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Removed from favorites' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
