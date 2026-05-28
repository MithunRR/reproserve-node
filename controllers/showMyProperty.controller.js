const db = require('../models');
const { collectPhotoPaths } = require('../middleware/upload.middleware');

const { ShowMyProperty, User, Notification } = db;

const ownerInclude = {
  model: User, as: 'user',
  attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role']
};

const agentInclude = {
  model: User, as: 'agent',
  attributes: ['id', 'firstName', 'lastName', 'email', 'phone', 'role', 'businessName']
};

const labelFor = (record) =>
  record.title || record.address || `Property #${record.id}`;

const safeNotify = async (payload) => {
  try {
    await Notification.create(payload);
  } catch (err) {
    console.error('ShowMyProperty notification failed:', err.message);
  }
};

// POST /show-my-property
// Body (multipart/form-data): userId, propertyType, title, address, city, state,
//   zipCode, description, preferredDate, preferredDateTo, price, payoutPerHour, photos[]
exports.create = async (req, res) => {
  try {
    const {
      userId, propertyType, title, address, city, state,
      zipCode, description, preferredDate, preferredDateTo, price, payoutPerHour
    } = req.body;

    if (!userId || !address) {
      return res.status(400).json({ success: false, message: 'userId and address are required' });
    }

    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid userId — user not found' });
    }

    const photos = collectPhotoPaths(req);

    const record = await ShowMyProperty.create({
      userId,
      propertyType: propertyType || null,
      title: title || null,
      address,
      city: city || null,
      state: state || null,
      zipCode: zipCode || null,
      description: description || null,
      preferredDate: preferredDate || null,
      preferredDateTo: preferredDateTo || null,
      price: price || null,
      payoutPerHour: payoutPerHour || null,
      photos: photos.length ? photos : null
    });

    // Fan-out notification: every realtor sees the new opportunity.
    const realtors = await User.findAll({ where: { role: 'realtor' }, attributes: ['id'] });
    await Promise.all(realtors.map((r) => safeNotify({
      userId: r.id,
      type: 'show_request_new',
      title: 'New showing opportunity',
      message: `${user.firstName || 'A customer'} posted a showing for ${labelFor(record)}.`,
      link: `/show-request/${record.id}`
    })));

    return res.status(201).json({ success: true, message: 'Show-my-property request created', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /show-my-property?userId=&status=&assignedAgentId=&unassigned=true
exports.findAll = async (req, res) => {
  try {
    const { userId, status, assignedAgentId, unassigned } = req.query;
    const where = {};
    if (userId) where.userId = userId;
    if (status) where.status = status;
    if (assignedAgentId) where.assignedAgentId = assignedAgentId;
    if (String(unassigned) === 'true') where.assignedAgentId = null;

    const records = await ShowMyProperty.findAll({
      where,
      order: [['createdAt', 'DESC']],
      include: [ownerInclude, agentInclude]
    });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const record = await ShowMyProperty.findByPk(req.params.id, {
      include: [ownerInclude, agentInclude]
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /show-my-property/:id
// Generic edit endpoint — the dedicated claim / complete actions below are the
// preferred way to drive the lifecycle so they can fire the right notifications.
exports.update = async (req, res) => {
  try {
    const record = await ShowMyProperty.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }

    const fields = [
      'propertyType', 'title', 'address', 'city', 'state', 'zipCode',
      'description', 'preferredDate', 'preferredDateTo', 'price',
      'payoutPerHour', 'status'
    ];
    fields.forEach((f) => {
      if (req.body[f] !== undefined) record[f] = req.body[f];
    });

    const photos = collectPhotoPaths(req);
    if (photos.length) {
      const existing = Array.isArray(record.photos) ? record.photos : [];
      record.photos = String(req.body.replacePhotos) === 'true' ? photos : [...existing, ...photos];
    }

    await record.save();
    return res.status(200).json({ success: true, message: 'Request updated', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /show-my-property/:id/claim
// Body: { agentId }
// A realtor claims a pending listing. First-come-first-served — once claimed
// it disappears from the available pool. Notifies the customer.
exports.claim = async (req, res) => {
  try {
    const record = await ShowMyProperty.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (record.status !== 'pending' || record.assignedAgentId) {
      return res.status(409).json({ success: false, message: 'This showing has already been claimed.' });
    }

    const agentId = Number(req.body.agentId);
    if (!agentId) {
      return res.status(400).json({ success: false, message: 'agentId is required' });
    }
    const agent = await User.findByPk(agentId);
    if (!agent || agent.role !== 'realtor') {
      return res.status(400).json({ success: false, message: 'Only realtors can claim showings.' });
    }

    record.assignedAgentId = agentId;
    record.assignedAt = new Date();
    record.status = 'scheduled';
    await record.save();

    await safeNotify({
      userId: record.userId,
      type: 'show_request_claimed',
      title: 'Your showing has been picked up',
      message: `${agent.businessName || `${agent.firstName || ''} ${agent.lastName || ''}`.trim() || 'A realtor'} will host the showing for ${labelFor(record)}.`,
      link: `/show-request/${record.id}`
    });

    const refreshed = await ShowMyProperty.findByPk(record.id, { include: [ownerInclude, agentInclude] });
    return res.status(200).json({ success: true, message: 'Showing claimed', data: refreshed });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /show-my-property/:id/complete
// Body: { agentId }   — must match the realtor who claimed it.
// Marks the showing as done and notifies the customer.
exports.complete = async (req, res) => {
  try {
    const record = await ShowMyProperty.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    if (record.status !== 'scheduled') {
      return res.status(409).json({ success: false, message: 'Only scheduled showings can be completed.' });
    }

    const agentId = Number(req.body.agentId);
    if (!agentId || agentId !== record.assignedAgentId) {
      return res.status(403).json({ success: false, message: 'Only the assigned realtor can mark this showing complete.' });
    }

    record.status = 'completed';
    record.completedAt = new Date();
    await record.save();

    await safeNotify({
      userId: record.userId,
      type: 'show_request_completed',
      title: 'Showing completed',
      message: `Your showing for ${labelFor(record)} has been completed.`,
      link: `/show-request/${record.id}`
    });

    const refreshed = await ShowMyProperty.findByPk(record.id, { include: [ownerInclude, agentInclude] });
    return res.status(200).json({ success: true, message: 'Showing marked complete', data: refreshed });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /show-my-property/:id
exports.remove = async (req, res) => {
  try {
    const record = await ShowMyProperty.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Request not found' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Request deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
