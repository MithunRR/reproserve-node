// ---------------------------------------------------------------------------
// Assistant skills — the "facts" layer.
//
// Plain functions that answer the concrete questions the chatbot supports by
// querying the same data (and applying the same rules: approved-only, rating
// from reviews, expired open houses hidden) the rest of the app uses. These
// are provider-agnostic: the Gemini/Groq/Claude brain just decides which one
// to call with what arguments. Each returns a small, token-cheap shape.
// ---------------------------------------------------------------------------
const db = require('../../models');
const { Op, fn, col } = require('sequelize');

const { User, ServiceType, Review, OpenHouse } = db;

const PROVIDER_ROLES = ['service_provider', 'realtor'];
const clampLimit = (n, def = 5, max = 10) =>
  Math.min(Math.max(parseInt(n, 10) || def, 1), max);

const displayName = (u) =>
  u.businessName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || 'Provider';

// One grouped query for the average rating + review count of many providers,
// so we never fire N+1 review lookups.
async function ratingsFor(ids) {
  if (!ids.length) return {};
  const rows = await Review.findAll({
    where: { providerId: { [Op.in]: ids } },
    attributes: [
      'providerId',
      [fn('AVG', col('rating')), 'avg'],
      [fn('COUNT', col('id')), 'cnt']
    ],
    group: ['providerId']
  });
  const map = {};
  rows.forEach((r) => {
    const j = r.toJSON();
    map[j.providerId] = {
      rating: Number(Number(j.avg).toFixed(2)),
      reviewCount: Number(j.cnt)
    };
  });
  return map;
}

// Haversine distance (km) SQL expression from a fixed point, matching
// provider.controller.js.
const distanceExpr = (lat, lng) =>
  db.sequelize.literal(`
    (6371 * acos(
      cos(radians(${lat})) * cos(radians(latitude)) *
      cos(radians(longitude) - radians(${lng})) +
      sin(radians(${lat})) * sin(radians(latitude))
    ))
  `);

// search_providers — service providers and/or realtors, filterable by service,
// city, minimum rating, and optional distance-from-a-point. Sorted by rating
// (default) or by distance when a location is given.
async function searchProviders({
  serviceType,
  city,
  role,
  minRating,
  nearLat,
  nearLng,
  radiusKm,
  limit
} = {}) {
  const take = clampLimit(limit);

  const where = {
    role: role && PROVIDER_ROLES.includes(role) ? role : { [Op.in]: PROVIDER_ROLES },
    approvalStatus: 'approved',
    isActive: true
  };
  if (city) where.city = { [Op.like]: `%${city}%` };

  const serviceInclude = { model: ServiceType, as: 'serviceType' };
  if (serviceType) {
    serviceInclude.where = { name: { [Op.like]: `%${serviceType}%` } };
    serviceInclude.required = true;
  }

  const lat = parseFloat(nearLat);
  const lng = parseFloat(nearLng);
  const rad = parseFloat(radiusKm) || 50;
  const useDistance = Number.isFinite(lat) && Number.isFinite(lng);

  const COLS = [
    'id', 'firstName', 'lastName', 'businessName', 'city', 'state',
    'businessDesc', 'phone', 'role', 'latitude', 'longitude'
  ];
  const queryOpts = {
    where,
    attributes: COLS.slice(),
    include: [serviceInclude],
    order: [['createdAt', 'DESC']]
  };

  if (useDistance) {
    const dist = distanceExpr(lat, lng);
    queryOpts.attributes = [...COLS, [dist, 'distanceKm']];
    where.latitude = { [Op.ne]: null };
    where.longitude = { [Op.ne]: null };
    queryOpts.having = db.sequelize.where(dist, { [Op.lte]: rad });
    queryOpts.order = [[db.sequelize.literal('distanceKm'), 'ASC']];
    queryOpts.subQuery = false;
  }

  const records = await User.findAll(queryOpts);
  const ratings = await ratingsFor(records.map((r) => r.id));

  let data = records.map((r) => {
    const j = r.toJSON();
    const rt = ratings[r.id] || { rating: 0, reviewCount: 0 };
    return {
      name: displayName(j),
      serviceType: j.serviceType ? j.serviceType.name : null,
      city: j.city || null,
      state: j.state || null,
      rating: rt.rating,
      reviewCount: rt.reviewCount,
      phone: j.phone || null,
      about: j.businessDesc ? String(j.businessDesc).slice(0, 160) : null,
      ...(j.distanceKm != null ? { distanceKm: Number(Number(j.distanceKm).toFixed(1)) } : {})
    };
  });

  if (minRating) {
    const min = parseFloat(minRating);
    if (Number.isFinite(min)) data = data.filter((d) => d.rating >= min);
  }
  // Distance search stays distance-sorted; otherwise best-rated first.
  if (!useDistance) data.sort((a, b) => b.rating - a.rating);

  return data.slice(0, take);
}

// search_open_houses — upcoming/active listings, expired ones hidden (matches
// the front-end rule: an open house whose end date has passed is not shown).
async function searchOpenHouses({ city, propertyType, limit } = {}) {
  const take = clampLimit(limit);
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const where = {
    isActive: true,
    [Op.or]: [
      { toDateAndTime: { [Op.gte]: startOfToday } },
      { toDateAndTime: null, fromDateAndTime: { [Op.gte]: startOfToday } }
    ]
  };
  if (city) where.location = { [Op.like]: `%${city}%` };
  if (propertyType) where.propertyType = { [Op.like]: `%${propertyType}%` };

  const records = await OpenHouse.findAll({
    where,
    order: [['fromDateAndTime', 'ASC']],
    limit: take,
    include: [{ model: User, as: 'user', attributes: ['firstName', 'lastName', 'businessName'] }]
  });

  return records.map((r) => {
    const j = r.toJSON();
    return {
      title: j.title,
      propertyType: j.propertyType,
      location: j.location,
      price: j.price != null ? Number(j.price) : null,
      squareFootage: j.squareFootage || null,
      from: j.fromDateAndTime,
      to: j.toDateAndTime,
      hostedBy: j.user ? displayName(j.user) : null
    };
  });
}

// list_service_types — the catalogue of service categories the platform covers.
async function listServiceTypes() {
  const rows = await ServiceType.findAll({ attributes: ['name'], order: [['name', 'ASC']] });
  return rows.map((r) => r.name);
}

module.exports = { searchProviders, searchOpenHouses, listServiceTypes };
