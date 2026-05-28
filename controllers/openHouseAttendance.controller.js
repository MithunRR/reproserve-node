const db = require('../models');
const { Op, fn, col, where } = require('sequelize');

const { OpenHouseAttendance, OpenHouse, User } = db;

const attendeeInclude = {
  model: User, as: 'user',
  attributes: ['id', 'firstName', 'lastName', 'email', 'role']
};

// POST /open-houses/:id/attendances
exports.create = async (req, res) => {
  try {
    const openHouse = await OpenHouse.findByPk(req.params.id);
    if (!openHouse) {
      return res.status(404).json({ success: false, message: 'Open house not found' });
    }

    const { userId, name, email, phone, message } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'name is required' });
    }

    if (userId) {
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(400).json({ success: false, message: 'Invalid userId — user not found' });
      }
    }

    // The creator of the open house cannot RSVP to their own listing.
    if (userId && openHouse.userId && String(openHouse.userId) === String(userId)) {
      return res.status(403).json({
        success: false,
        message: 'You cannot register attendance for your own open house.'
      });
    }

    // Prevent duplicate RSVPs — match by userId (authoritative) and by email
    // as a fallback for guest submissions.
    const duplicateClauses = [];
    if (userId) duplicateClauses.push({ userId });
    const normalizedEmail = email ? String(email).trim().toLowerCase() : '';
    if (normalizedEmail) {
      duplicateClauses.push(where(fn('LOWER', col('email')), normalizedEmail));
    }
    if (duplicateClauses.length > 0) {
      const existing = await OpenHouseAttendance.findOne({
        where: {
          openHouseId: openHouse.id,
          [Op.or]: duplicateClauses
        }
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: 'You are already registered for this open house using same email.'
        });
      }
    }

    const record = await OpenHouseAttendance.create({
      openHouseId: openHouse.id,
      userId: userId || null,
      name: name.trim(),
      email: email || null,
      phone: phone || null,
      message: message || null
    });

    return res.status(201).json({ success: true, message: 'Attendance registered', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /open-houses/:id/attendances
exports.findAll = async (req, res) => {
  try {
    const openHouse = await OpenHouse.findByPk(req.params.id);
    if (!openHouse) {
      return res.status(404).json({ success: false, message: 'Open house not found' });
    }
    const records = await OpenHouseAttendance.findAll({
      where: { openHouseId: openHouse.id },
      order: [['createdAt', 'DESC']],
      include: [attendeeInclude]
    });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// DELETE /attendances/:id
exports.remove = async (req, res) => {
  try {
    const record = await OpenHouseAttendance.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Attendance record not found' });
    }
    await record.destroy();
    return res.status(200).json({ success: true, message: 'Attendance removed' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
