const db = require('../models');
const { resolveServiceTypeId } = require('../config/serviceTypeData');
const { geocode } = require('../services/geocoder');
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
      businessName, businessDesc, licenseNumber,
      latitude, longitude
    } = req.body;
    if (firstName !== undefined) record.firstName = firstName;
    if (lastName !== undefined) record.lastName = lastName;
    if (email !== undefined) record.email = email;
    if (phone !== undefined) record.phone = phone;

    // Track whether any address field actually changed — if so we re-geocode
    // (unless the caller also supplied explicit coords, in which case those win).
    const addressChanged =
      (streetAddress !== undefined && streetAddress !== record.streetAddress) ||
      (city !== undefined && city !== record.city) ||
      (state !== undefined && state !== record.state) ||
      (zipCode !== undefined && zipCode !== record.zipCode);

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

    // Explicit coordinates (e.g. from the profile's "Use my GPS" button) win
    // over address geocoding because they came directly from the user's device.
    const latNum = parseFloat(latitude);
    const lngNum = parseFloat(longitude);
    const hasExplicitCoords = Number.isFinite(latNum) && Number.isFinite(lngNum);

    if (hasExplicitCoords) {
      record.latitude = latNum;
      record.longitude = lngNum;
    } else if (addressChanged && (record.role === 'service_provider' || record.role === 'realtor')) {
      // Best-effort geocode — non-blocking failure leaves old coords in place.
      const coords = await geocode({
        streetAddress: record.streetAddress,
        city: record.city,
        state: record.state,
        zipCode: record.zipCode
      });
      if (coords) {
        record.latitude = coords.lat;
        record.longitude = coords.lng;
      }
    }

    await record.save();
    return res.status(200).json({ success: true, message: 'User updated successfully', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
