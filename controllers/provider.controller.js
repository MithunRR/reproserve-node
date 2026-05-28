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

// GET /providers?role=&serviceTypeId=&search=&city=&state=&lat=&lng=&radius=
// When lat+lng+radius are supplied, providers further than `radius` km from
// (lat, lng) are excluded (Haversine in SQL) and each record carries a
// `distanceKm` field. Without those params, behaviour is unchanged.
exports.findAll = async (req, res) => {
  try {
    const { role, serviceTypeId, search, city, state, lat, lng, radius } = req.query;

    const where = {
      role: role && PROVIDER_ROLES.includes(role) ? role : { [Op.in]: PROVIDER_ROLES },
      // Public listings only ever show admin-approved providers/realtors.
      approvalStatus: 'approved'
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

    // Optional radius search (Haversine, km). Only kicks in when caller sent
    // a usable lat/lng/radius triple; anything else falls through to the
    // ordinary listing query above.
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    const useRadius =
      Number.isFinite(latNum) && Number.isFinite(lngNum) && Number.isFinite(radiusKm) && radiusKm > 0;

    const queryOpts = {
      where,
      attributes: { exclude: ['password'] },
      order: [['createdAt', 'DESC']],
      include: [{ model: ServiceType, as: 'serviceType' }]
    };

    if (useRadius) {
      // Earth radius 6371 km. acos(...) gives the angle in radians; multiplied
      // by the radius it yields surface distance in km. Providers with NULL
      // coords are excluded since the column comparison would be NULL.
      const distanceExpr = db.sequelize.literal(`
        (6371 * acos(
          cos(radians(${latNum})) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(${lngNum})) +
          sin(radians(${latNum})) * sin(radians(latitude))
        ))
      `);

      queryOpts.attributes = {
        exclude: ['password'],
        include: [[distanceExpr, 'distanceKm']]
      };
      where.latitude  = { [Op.ne]: null };
      where.longitude = { [Op.ne]: null };
      queryOpts.having = db.sequelize.where(distanceExpr, { [Op.lte]: radiusKm });
      queryOpts.order = [[db.sequelize.literal('distanceKm'), 'ASC']];
    }

    const records = await User.findAll(queryOpts);

    // Attach rating summary to each provider.
    const data = await Promise.all(
      records.map(async (provider) => {
        const json = provider.toJSON();
        if (json.distanceKm != null) {
          json.distanceKm = Number(Number(json.distanceKm).toFixed(2));
        }
        return {
          ...json,
          ...(await ratingSummary(provider.id)),
          completedJobs: await completedJobsCount(provider.id)
        };
      })
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

    if (!provider || !PROVIDER_ROLES.includes(provider.role) || provider.approvalStatus !== 'approved') {
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
