/**
 * Admin-only endpoints. Gated by verifyToken + requireRole('admin') in routes.
 */
const db = require('../models');
const { Op } = require('sequelize');
const { User, Quote, ShowMyProperty, OpenHouse, Review, ContactMessage, ServiceType } = db;

const PROVIDER_ROLES = ['service_provider', 'realtor'];
const APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

const userPublicAttrs = ['id', 'role', 'firstName', 'lastName', 'email', 'createdAt'];

// GET /api/admin/stats
// Aggregates the numbers + recent activity feeds the dashboard renders.
exports.stats = async (req, res) => {
  try {
    const [
      totalUsers, totalProviders, totalRealtors, totalAdmins,
      totalQuotes, totalListings, totalOpenHouses, totalReviews,
      totalMessages, unreadMessages
    ] = await Promise.all([
      User.count({ where: { role: 'user' } }),
      User.count({ where: { role: 'service_provider' } }),
      User.count({ where: { role: 'realtor' } }),
      User.count({ where: { role: 'admin' } }),
      Quote.count(),
      ShowMyProperty.count(),
      OpenHouse.count(),
      Review.count(),
      ContactMessage.count(),
      ContactMessage.count({ where: { status: 'new' } })
    ]);

    const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [signupsLast24h, quotesLast24h] = await Promise.all([
      User.count({ where: { createdAt: { [db.Sequelize.Op.gte]: since24h } } }),
      Quote.count({ where: { createdAt: { [db.Sequelize.Op.gte]: since24h } } })
    ]);

    const [recentSignups, recentQuotes, recentListings, recentMessages] = await Promise.all([
      User.findAll({ order: [['createdAt', 'DESC']], limit: 5, attributes: userPublicAttrs }),
      Quote.findAll({
        order: [['createdAt', 'DESC']], limit: 5,
        include: [
          { model: User, as: 'requester', attributes: ['id', 'firstName', 'lastName', 'email'] },
          { model: User, as: 'provider',  attributes: ['id', 'firstName', 'lastName', 'businessName'] }
        ]
      }),
      ShowMyProperty.findAll({
        order: [['createdAt', 'DESC']], limit: 5,
        include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName'] }]
      }),
      ContactMessage.findAll({ order: [['createdAt', 'DESC']], limit: 5 })
    ]);

    return res.status(200).json({
      success: true,
      data: {
        counts: {
          users: totalUsers,
          providers: totalProviders,
          realtors: totalRealtors,
          admins: totalAdmins,
          quotes: totalQuotes,
          listings: totalListings,
          openHouses: totalOpenHouses,
          reviews: totalReviews,
          messages: totalMessages,
          unreadMessages
        },
        last24h: { signups: signupsLast24h, quotes: quotesLast24h },
        recent: {
          signups: recentSignups,
          quotes: recentQuotes,
          listings: recentListings,
          messages: recentMessages
        }
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/users  — list every account (for "View All Users" later)
exports.listUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      order: [['createdAt', 'DESC']],
      attributes: { exclude: ['password', 'verificationToken'] }
    });
    return res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/admin/pending-approvals?role=service_provider|realtor
// Returns provider/realtor accounts whose approvalStatus is 'pending'. With no
// `role` query, returns both, separated under data.serviceProviders and
// data.realtors so the dashboard can render them side-by-side.
exports.listPendingApprovals = async (req, res) => {
  try {
    const { role } = req.query;
    const roleFilter = role && PROVIDER_ROLES.includes(role)
      ? role
      : { [Op.in]: PROVIDER_ROLES };

    const rows = await User.findAll({
      where: { role: roleFilter, approvalStatus: 'pending' },
      attributes: { exclude: ['password', 'verificationToken'] },
      include: [{ model: ServiceType, as: 'serviceType' }],
      order: [['createdAt', 'DESC']]
    });

    const data = {
      serviceProviders: rows.filter((u) => u.role === 'service_provider'),
      realtors:         rows.filter((u) => u.role === 'realtor')
    };
    return res.status(200).json({
      success: true,
      count: rows.length,
      data
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/admin/users/:id/approval  { status: 'approved' | 'rejected' }
// Flips the approvalStatus on a single user. Only provider/realtor rows are
// targetable — users and admins do not go through approval.
exports.setApprovalStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body || {};

    if (!APPROVAL_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of ${APPROVAL_STATUSES.join(', ')}`
      });
    }

    const user = await User.findByPk(id);
    if (!user || !PROVIDER_ROLES.includes(user.role)) {
      return res.status(404).json({ success: false, message: 'Provider/realtor account not found' });
    }

    user.approvalStatus = status;
    await user.save();

    const sanitised = user.toJSON();
    delete sanitised.password;
    delete sanitised.verificationToken;

    return res.status(200).json({
      success: true,
      message: `Account ${status}`,
      data: sanitised
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
