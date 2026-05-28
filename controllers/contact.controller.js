const db = require('../models');
const { ContactMessage, User, Notification } = db;
const { sendMail, contactMessageEmailTemplate } = require('../services/mailer');

// Notifies every admin about a new contact submission — fan-out in parallel.
// Always returns: failures here must NOT break the public submit response.
async function notifyAdminsOfContact(record) {
  try {
    const admins = await User.findAll({ where: { role: 'admin' } });
    if (!admins.length) {
      console.warn('[contact] no admin users to notify');
      return;
    }

    const truncated = String(record.message || '').slice(0, 140);
    const previewMessage =
      `${record.name} (${record.email})` +
      (record.phone ? ` · ${record.phone}` : '') +
      `: ${truncated}${(record.message || '').length > 140 ? '…' : ''}`;

    const { subject, html, text } = contactMessageEmailTemplate({
      name: record.name,
      email: record.email,
      phone: record.phone,
      subject: record.subject,
      userType: record.userType,
      message: record.message,
      submittedAt: record.createdAt
    });

    await Promise.all(admins.map(async (admin) => {
      // In-app notification (always created).
      try {
        await Notification.create({
          userId: admin.id,
          type: 'contact_message',
          title: `New contact message from ${record.name}`,
          message: previewMessage,
          link: `/profile#contact-messages`
        });
      } catch (e) {
        console.error('[contact] notification create failed for admin', admin.id, e.message);
      }
      // Email (fail-soft — SMTP outage shouldn't block the in-app notice).
      try {
        await sendMail({ to: admin.email, subject, html, text });
      } catch (e) {
        console.error('[contact] email send failed for admin', admin.email, e.message);
      }
    }));
  } catch (err) {
    console.error('[contact] notifyAdminsOfContact failed:', err.message);
  }
}

// POST /api/contact   (public)
// Anyone can submit a contact form. Returns the saved row id.
exports.create = async (req, res) => {
  try {
    const { name, email, phone, subject, userType, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'name, email and message are required.' });
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'A valid email is required.' });
    }
    const record = await ContactMessage.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      phone: phone ? String(phone).trim() : null,
      subject: subject || null,
      userType: userType || null,
      message: message.trim()
    });

    // Fan out to admins (in-app notification + email) — non-blocking. If we
    // awaited this and SMTP was down, the public submit would visibly hang;
    // running it after we've already written the row keeps the form snappy
    // while still firing both side-effects.
    notifyAdminsOfContact(record);

    return res.status(201).json({
      success: true,
      message: "Thanks — we'll get back to you within 24 hours.",
      data: { id: record.id }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/contact?status=new|read|replied|archived   (admin)
exports.findAll = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    const records = await ContactMessage.findAll({
      where,
      order: [['createdAt', 'DESC']]
    });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const record = await ContactMessage.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Message not found' });
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// PUT /api/contact/:id   (admin)   body: { status }
exports.update = async (req, res) => {
  try {
    const record = await ContactMessage.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Message not found' });
    const valid = ['new', 'read', 'replied', 'archived'];
    if (req.body.status && !valid.includes(req.body.status)) {
      return res.status(400).json({ success: false, message: 'Invalid status' });
    }
    if (req.body.status) record.status = req.body.status;
    await record.save();
    return res.status(200).json({ success: true, message: 'Message updated', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /api/contact/:id   (admin)
exports.remove = async (req, res) => {
  try {
    const record = await ContactMessage.findByPk(req.params.id);
    if (!record) return res.status(404).json({ success: false, message: 'Message not found' });
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Message deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
