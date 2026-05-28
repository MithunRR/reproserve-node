const fs = require('fs');
const path = require('path');
const db = require('../models');
const { PHOTOS_URL_PREFIX, VIDEOS_URL_PREFIX, ASSETS_DIR } = require('../middleware/upload.middleware');

const { OpenHouse, User } = db;

const parseMaybeJson = (value) => {
  if (value === undefined || value === null || value === '') return null;
  if (typeof value === 'object') return value;
  try { return JSON.parse(value); } catch { return value; }
};

const collectUploadedPaths = (req) => {
  const photos = (req.files && req.files.photos)
    ? req.files.photos.map((f) => `${PHOTOS_URL_PREFIX}/${f.filename}`)
    : [];
  const videoFile = req.files && req.files.video ? req.files.video[0] : null;
  const video = videoFile ? `${VIDEOS_URL_PREFIX}/${videoFile.filename}` : null;
  return { photos, video };
};

const deleteFileByPublicPath = (publicPath) => {
  if (!publicPath || typeof publicPath !== 'string') return;
  const rel = publicPath.replace(/^\/assets\//, '');
  const abs = path.join(ASSETS_DIR, rel);
  fs.unlink(abs, () => {});
};

exports.create = async (req, res) => {
  try {
    const {
      userId, role, propertyType, title, description,
      location, price, squareFootage,
      fromDateAndTime, toDateAndTime, specs
    } = req.body;

    if (!userId || !propertyType || !title || !description || !location || !price || !fromDateAndTime) {
      return res.status(400).json({
        success: false,
        message: 'userId, propertyType, title, description, location, price and fromDateAndTime are required'
      });
    }

    const userExists = await User.findByPk(userId);
    if (!userExists) {
      return res.status(400).json({ success: false, message: 'Invalid userId — user not found' });
    }

    const { photos, video } = collectUploadedPaths(req);

    const record = await OpenHouse.create({
      userId,
      role: role || userExists.role || 'user',
      propertyType,
      title,
      description,
      specs: parseMaybeJson(specs),
      location,
      price,
      squareFootage: squareFootage || null,
      fromDateAndTime,
      toDateAndTime: toDateAndTime || null,
      photos: photos.length ? photos : null,
      video
    });

    return res.status(201).json({ success: true, message: 'Open house created', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findAll = async (req, res) => {
  try {
    const records = await OpenHouse.findAll({
      order: [['createdAt', 'DESC']],
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }]
    });
    return res.status(200).json({ success: true, count: records.length, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.findOne = async (req, res) => {
  try {
    const record = await OpenHouse.findByPk(req.params.id, {
      include: [{ model: User, as: 'user', attributes: ['id', 'firstName', 'lastName', 'email', 'role'] }]
    });
    if (!record) {
      return res.status(404).json({ success: false, message: 'Open house not found' });
    }
    return res.status(200).json({ success: true, data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.update = async (req, res) => {
  try {
    const record = await OpenHouse.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Open house not found' });
    }

    const {
      role, propertyType, title, description,
      location, price, squareFootage,
      fromDateAndTime, toDateAndTime, specs,
      isActive, replacePhotos
    } = req.body;

    if (role !== undefined) record.role = role;
    if (propertyType !== undefined) record.propertyType = propertyType;
    if (title !== undefined) record.title = title;
    if (description !== undefined) record.description = description;
    if (location !== undefined) record.location = location;
    if (price !== undefined) record.price = price;
    if (squareFootage !== undefined) record.squareFootage = squareFootage || null;
    if (fromDateAndTime !== undefined) record.fromDateAndTime = fromDateAndTime;
    if (toDateAndTime !== undefined) record.toDateAndTime = toDateAndTime || null;
    if (specs !== undefined) record.specs = parseMaybeJson(specs);
    if (isActive !== undefined) record.isActive = !!isActive;

    const { photos: newPhotos, video: newVideo } = collectUploadedPaths(req);

    if (newPhotos.length) {
      if (String(replacePhotos) === 'true') {
        if (Array.isArray(record.photos)) record.photos.forEach(deleteFileByPublicPath);
        record.photos = newPhotos;
      } else {
        const existing = Array.isArray(record.photos) ? record.photos : [];
        record.photos = [...existing, ...newPhotos];
      }
    }

    if (newVideo) {
      if (record.video) deleteFileByPublicPath(record.video);
      record.video = newVideo;
    }

    await record.save();
    return res.status(200).json({ success: true, message: 'Open house updated', data: record });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.remove = async (req, res) => {
  try {
    const record = await OpenHouse.findByPk(req.params.id);
    if (!record) {
      return res.status(404).json({ success: false, message: 'Open house not found' });
    }

    if (Array.isArray(record.photos)) record.photos.forEach(deleteFileByPublicPath);
    if (record.video) deleteFileByPublicPath(record.video);

    await record.destroy();
    return res.status(200).json({ success: true, message: 'Open house deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
