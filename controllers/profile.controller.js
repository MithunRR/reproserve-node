const db = require('../models');
const { resolveServiceTypeId } = require('../config/serviceTypeData');
const { User, ServiceType } = db;

exports.findOne = async (req, res) => {
  try {
    const record = await User.findByPk(req.params.id, {
      include: [{ model: ServiceType, as: 'serviceType' }]
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await User.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const {
      firstName, lastName, email, phone,
      streetAddress, city, state, zipCode,
      businessName, businessDesc, licenseNumber
    } = req.body;
    if (firstName !== undefined) record.firstName = firstName;
    if (lastName !== undefined) record.lastName = lastName;
    if (email !== undefined) record.email = email;
    if (phone !== undefined) record.phone = phone;
    if (streetAddress !== undefined) record.streetAddress = streetAddress;
    if (city !== undefined) record.city = city;
    if (state !== undefined) record.state = state;
    if (zipCode !== undefined) record.zipCode = zipCode;
    if (businessName !== undefined) record.businessName = businessName;
    if (businessDesc !== undefined) record.businessDesc = businessDesc;
    if (licenseNumber !== undefined) record.licenseNumber = licenseNumber || null;

    // Accept the service type as either an id or a name; a blank value clears it.
    if (req.body.serviceTypeId !== undefined || req.body.serviceType !== undefined) {
      const raw = req.body.serviceTypeId !== undefined
        ? req.body.serviceTypeId
        : req.body.serviceType;
      record.serviceTypeId = await resolveServiceTypeId(db, raw);
    }

    await record.save();
    return res.status(200).json({ success: true, message: 'User updated successfully', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
