const db = require('../models');

const { Review, User, Quote, Notification } = db;

const PROVIDER_ROLES = ['service_provider', 'realtor'];

const reviewerInclude = {
  model: User, as: 'reviewer',
  attributes: ['id', 'firstName', 'lastName', 'role']
};
const providerInclude = {
  model: User, as: 'provider',
  attributes: ['id', 'firstName', 'lastName', 'role', 'businessName']
};

exports.create = async (req, res) => {
  try {
    const { providerId, userId, rating, title, comment } = req.body;

    if (!providerId || !userId || rating === undefined) {
      return res.status(400).json({
        success: false,
        message: 'providerId, userId and rating are required'
      });
    }
    const numericRating = Number(rating);
    if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
      return res.status(400).json({ success: false, message: 'rating must be a number between 1 and 5' });
    }

    const [provider, reviewer] = await Promise.all([
      User.findByPk(providerId),
      User.findByPk(userId)
    ]);
    if (!provider || !PROVIDER_ROLES.includes(provider.role)) {
      return res.status(400).json({ success: false, message: 'Invalid providerId — not a provider/realtor' });
    }
    if (!reviewer) {
      return res.status(400).json({ success: false, message: 'Invalid userId — reviewer not found' });
    }

    // A review is allowed only after a completed job with this provider.
    const completedJob = await Quote.findOne({
      where: { userId, providerId, status: 'closed' }
    });
    if (!completedJob) {
      return res.status(403).json({
        success: false,
        message: 'You can review a provider only after completing a job with them.'
      });
    }

    // One review per provider per customer.
    const existingReview = await Review.findOne({ where: { userId, providerId } });
    if (existingReview) {
      return res.status(409).json({ success: false, message: 'You have already reviewed this provider.' });
    }

    const record = await Review.create({
      providerId,
      userId,
      rating: numericRating,
      title: title || null,
      comment: comment || null
    });

    // Notify the provider of the new review.
    try {
      await Notification.create({
        userId: providerId,
        type: 'review',
        title: 'New review received',
        message: `${reviewer.firstName || 'A customer'} left you a ${numericRating}-star review.`,
        link: '/profile'
      });
    } catch (notifyErr) {
      console.error('Review notification failed:', notifyErr.message);
    }

    return res.status(201).json({ success: true, message: 'Review submitted', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /reviews?providerId=&userId=
exports.findAll = async (req, res) => {
  try {
    const { providerId, userId } = req.query;
    const where = {};
    if (providerId) where.providerId = providerId;
    if (userId) where.userId = userId;

    const records = await Review.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [reviewerInclude, providerInclude]
    });

    const reviewCount = records.length;
    const averageRating = reviewCount
      ? Number((records.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2))
      : 0;

    return res.status(200).json({
      success: true,
      count: reviewCount,
      averageRating,
      data: records
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const record = await Review.findByPk(req.params.id, {
      include: [reviewerInclude, providerInclude]
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await Review.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    const { rating, title, comment } = req.body;
    if (rating !== undefined) {
      const numericRating = Number(rating);
      if (Number.isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
        return res.status(400).json({ success: false, message: 'rating must be a number between 1 and 5' });
      }
      record.rating = numericRating;
    }
    if (title !== undefined) record.title = title;
    if (comment !== undefined) record.comment = comment;

    await record.save();
    return res.status(200).json({ success: true, message: 'Review updated', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await Review.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Review not found' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Review deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
