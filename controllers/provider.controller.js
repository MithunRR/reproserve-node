const db = require('../models');
const { Op } = require('sequelize');

const { User, ServiceType, Review, Quote } = db;

const PROVIDER_ROLES = ['service_provider', 'realtor'];

// Computes { averageRating, reviewCount } for a provider.
const ratingSummary = async (providerId) => {
  const reviews = await Review.findAll({ where: { providerId }, attributes: ['rating'] });
  const reviewCount = reviews.length;
  const averageRating = reviewCount
    ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount).toFixed(2))
    : 0;
  return { averageRating, reviewCount };
};

// Counts a provider's completed (status = 'closed') jobs.
const completedJobsCount = (providerId) =>
  Quote.count({ where: { providerId, status: 'closed' } });

// GET /providers?role=&serviceTypeId=&search=&city=&state=
exports.findAll = async (req, res) => {
  try {
    const { role, serviceTypeId, search, city, state } = req.query;

    const where = {
      role: role && PROVIDER_ROLES.includes(role) ? role : { [Op.in]: PROVIDER_ROLES }
    };
    if (serviceTypeId) where.serviceTypeId = serviceTypeId;
    if (city) where.city = { [Op.like]: `%${city}%` };
    if (state) where.state = { [Op.like]: `%${state}%` };
    if (search) {
      where[Op.or] = [
        { firstName: { [Op.like]: `%${search}%` } },
        { lastName: { [Op.like]: `%${search}%` } },
        { businessName: { [Op.like]: `%${search}%` } },
        { businessDesc: { [Op.like]: `%${search}%` } }
      ];
    }

    const records = await User.findAll({
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      include: [{ model: ServiceType, as: 'serviceType' }]
    });

    // Attach rating summary to each provider.
    const data = await Promise.all(
      records.map(async (provider) => ({
        ...provider.toJSON(),
        ...(await ratingSummary(provider.id)),
        completedJobs: await completedJobsCount(provider.id)
      }))
    );

    return res.status(200).json({ success: true, count: data.length, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /providers/:id
exports.findOne = async (req, res) => {
  try {
    const provider = await User.findByPk(req.params.id, {
      attributes: { exclude: ['password'] },
      include: [{ model: ServiceType, as: 'serviceType' }]
    });

    if (!provider || !PROVIDER_ROLES.includes(provider.role)) {
      return res.status(404).json({ success: false, message: 'Provider not found' });
    }

    const reviews = await Review.findAll({
      where: { providerId: provider.id },
      order: [['createdAt', 'DESC']],
      include: [{
        model: User, as: 'reviewer',
        attributes: ['id', 'firstName', 'lastName', 'role']
      }]
    });

    const data = {
      ...provider.toJSON(),
      ...(await ratingSummary(provider.id)),
      completedJobs: await completedJobsCount(provider.id),
      reviews
    };

    return res.status(200).json({ success: true, data });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
