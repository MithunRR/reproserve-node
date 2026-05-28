const db = require('../models');
const { fn, col, where: sqlWhere, Op } = require('sequelize');
const { collectPhotoPaths } = require('../middleware/upload.middleware');

const { Quote, QuoteResponse, User, Notification, ServiceType } = db;

const PROVIDER_ROLES = ['service_provider', 'realtor'];

// Fresh include objects per call — Sequelize mutates include trees, so a
// shared object reused at two positions (here: provider) breaks aliasing.
const requesterInclude = () => ({
  model: User, as: 'requester',
  attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
});
const providerInclude = () => ({
  model: User, as: 'provider',
  attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'businessName']
});
const responsesInclude = (forProviderId) => ({
  model: QuoteResponse, as: 'responses',
  // When a provider is viewing the list, scope the included responses to
  // their own — providers should not see what other providers quoted.
  where: forProviderId ? { providerId: forProviderId } : undefined,
  required: false,
  include: [{
    model: User, as: 'provider',
    attributes: ['id', 'firstName', 'lastName', 'email', 'role', 'businessName']
  }]
});

// ── Quotes ──────────────────────────────────────────────────────────

exports.create = async (req, res) => {
  try {
    const {
      userId, providerId, name, email, phone,
      propertyType, category, description,
      budgetMin, budgetMax, location, isMeetingRequest
    } = req.body;

    if (!userId || !category || !description || !location) {
      return res.status(400).json({
        success: false,
        message: 'userId, category, description and location are required'
      });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid userId — user not found' });
    }

    if (providerId) {
      const provider = await User.findByPk(providerId);
      if (!provider) {
        return res.status(400).json({ success: false, message: 'Invalid providerId — provider not found' });
      }
    }

    const photos = collectPhotoPaths(req);

    const record = await Quote.create({
      userId,
      providerId: providerId || null,
      name: name || `${user.firstName} ${user.lastName}`.trim(),
      email: email || user.email,
      phone: phone || user.phone || null,
      propertyType: propertyType || null,
      category,
      description,
      budgetMin: budgetMin || null,
      budgetMax: budgetMax || null,
      location,
      photos: photos.length ? photos : null,
      isMeetingRequest: String(isMeetingRequest) === 'true'
    });

    // Notify providers about the incoming request. Best-effort: a notification
    // failure must not fail the quote that was already created.
    //   - If providerId is set, that specific provider/realtor gets a direct ping.
    //   - Additionally, every service_provider whose serviceTypeId matches the
    //     quote's category (looked up case-insensitively against ServiceType.name)
    //     is notified so the request reaches the relevant pool, not just one
    //     hand-picked provider.
    try {
      const isMeeting = record.isMeetingRequest;
      const notifyUserIds = new Set();

      if (record.providerId) {
        notifyUserIds.add(record.providerId);
      }

      if (record.category) {
        const serviceType = await ServiceType.findOne({
          where: sqlWhere(fn('LOWER', col('name')), String(record.category).trim().toLowerCase())
        });
        if (serviceType) {
          const categoryProviders = await User.findAll({
            where: {
              serviceTypeId: serviceType.id,
              role: 'service_provider',
              id: { [Op.ne]: record.userId },
              isActive: true
            },
            attributes: ['id']
          });
          categoryProviders.forEach((p) => notifyUserIds.add(p.id));
        }
      }

      if (notifyUserIds.size > 0) {
        const title = isMeeting ? 'New meeting request' : 'New quote request';
        const message = `${record.name || 'Someone'} posted ${isMeeting ? 'a meeting request' : 'a quote request'}` +
          `${record.category ? ` for ${record.category}` : ''}.`;
        await Notification.bulkCreate(
          Array.from(notifyUserIds).map((uid) => ({
            userId: uid,
            type: isMeeting ? 'meeting_request' : 'quote_request',
            title,
            message,
            link: `/request/${record.id}`
          }))
        );
      }
    } catch (notifyErr) {
      console.error('Quote notification failed:', notifyErr.message);
    }

    return res.status(201).json({ success: true, message: 'Quote request submitted', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const { userId, providerId, status, isMeetingRequest } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (isMeetingRequest !== undefined) where.isMeetingRequest = String(isMeetingRequest) === 'true';

    // For providers, "incoming" requests are:
    //   1. Quotes targeted directly at them (providerId = me), OR
    //   2. Broadcast quotes (providerId = NULL) whose category matches their
    //      registered serviceType — these are the ones the notification fan-out
    //      also reaches, so the Client Requests tab needs to surface them.
    if (providerId) {
      const provider = await User.findByPk(providerId, {
        attributes: ['id', 'serviceTypeId']
      });
      const orClauses = [{ providerId }];
      if (provider && provider.serviceTypeId) {
        const serviceType = await ServiceType.findByPk(provider.serviceTypeId);
        if (serviceType && serviceType.name) {
          orClauses.push({
            providerId: null,
            [Op.and]: [
              sqlWhere(fn('LOWER', col('Quote.category')), String(serviceType.name).trim().toLowerCase())
            ]
          });
        }
      }
      where[Op.or] = orClauses;
    }

    const records = await Quote.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [requesterInclude(), providerInclude(), responsesInclude(providerId)]
    });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const record = await Quote.findByPk(req.params.id, {
      include: [requesterInclude(), providerInclude(), responsesInclude()]
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await Quote.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }

    const prevStatus = record.status;
    const prevProviderCompleted = record.providerCompleted;

    const fields = [
      'name', 'email', 'phone', 'propertyType', 'category',
      'description', 'budgetMin', 'budgetMax', 'location', 'status', 'providerId'
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) record[f] = req.body[f];
    });
    if (req.body.providerCompleted !== undefined) {
      record.providerCompleted = String(req.body.providerCompleted) === 'true';
    }

    const photos = collectPhotoPaths(req);
    if (photos.length) {
      const existing = Array.isArray(record.photos) ? record.photos : [];
      record.photos = String(req.body.replacePhotos) === 'true' ? photos : [...existing, ...photos];
    }

    await record.save();

    // Completion-handshake notifications (best-effort).
    try {
      if (!prevProviderCompleted && record.providerCompleted && record.userId) {
        await Notification.create({
          userId: record.userId,
          type: 'job_update',
          title: 'Work marked as done',
          message: `The provider marked your ${record.category || 'job'} as done — please confirm completion.`,
          link: `/request/${record.id}`
        });
      }
      if (prevStatus !== 'closed' && record.status === 'closed' && record.providerId) {
        await Notification.create({
          userId: record.providerId,
          type: 'job_update',
          title: 'Job completed',
          message: `${record.name || 'The customer'} confirmed completion of the ${record.category || 'job'}.`,
          link: `/request/${record.id}`
        });
      }
    } catch (notifyErr) {
      console.error('Quote update notification failed:', notifyErr.message);
    }

    return res.status(200).json({ success: true, message: 'Quote updated', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await Quote.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Quote deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Quote responses (provider/realtor bids) ─────────────────────────

exports.addResponse = async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }

    const { providerId, amount, message } = req.body;
    if (!providerId || !message) {
      return res.status(400).json({ success: false, message: 'providerId and message are required' });
    }

    const provider = await User.findByPk(providerId);
    if (!provider) {
      return res.status(400).json({ success: false, message: 'Invalid providerId — provider not found' });
    }
    if (!PROVIDER_ROLES.includes(provider.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only service providers and realtors can respond to quotes'
      });
    }

    const record = await QuoteResponse.create({
      quoteId: quote.id,
      providerId,
      amount: amount || null,
      message
    });

    if (quote.status === 'pending') {
      quote.status = 'responded';
      await quote.save();
    }

    // Notify the customer that a quote came back.
    try {
      await Notification.create({
        userId: quote.userId,
        type: 'quote_response',
        title: 'You received a quote',
        message: `A provider responded to your ${quote.category || 'request'}` +
          `${amount ? ` with a quote of $${amount}` : ''}.`,
        link: `/request/${quote.id}`
      });
    } catch (notifyErr) {
      console.error('Quote response notification failed:', notifyErr.message);
    }

    return res.status(201).json({ success: true, message: 'Response submitted', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.listResponses = async (req, res) => {
  try {
    const quote = await Quote.findByPk(req.params.id);
    if (!quote) {
      return res.status(404).json({ success: false, message: 'Quote not found' });
    }
    const records = await QuoteResponse.findAll({
      where: { quoteId: quote.id },
      order: [['createdAt', 'DESC']],
      include: [providerInclude()]
    });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.updateResponse = async (req, res) => {
  try {
    const record = await QuoteResponse.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Response not found' });
    }

    const { amount, message, status } = req.body;
    if (amount !== undefined) record.amount = amount;
    if (message !== undefined) record.message = message;
    if (status !== undefined) record.status = status;
    await record.save();

    // Accepting / declining a response also moves the parent quote.
    if (status === 'accepted' || status === 'declined') {
      const quote = await Quote.findByPk(record.quoteId);
      if (quote) {
        quote.status = status;
        await quote.save();
        try {
          await Notification.create({
            userId: record.providerId,
            type: 'quote_update',
            title: status === 'accepted' ? 'Quote accepted' : 'Quote declined',
            message: status === 'accepted'
              ? `${quote.name || 'The customer'} accepted your quote for ${quote.category || 'the job'}.`
              : `${quote.name || 'The customer'} declined your quote for ${quote.category || 'the job'}.`,
            link: `/request/${quote.id}`
          });
        } catch (notifyErr) {
          console.error('Quote response notification failed:', notifyErr.message);
        }
      }
    }

    return res.status(200).json({ success: true, message: 'Response updated', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
