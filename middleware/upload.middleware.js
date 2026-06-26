const fs = require('fs');
const path = require('path');
const multer = require('multer');

const ASSETS_DIR = path.join(__dirname, '..', 'assets');
const PHOTOS_DIR = path.join(ASSETS_DIR, 'photos');
const VIDEOS_DIR = path.join(ASSETS_DIR, 'videos');

[ASSETS_DIR, PHOTOS_DIR, VIDEOS_DIR].forEach((dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

const PHOTOS_URL_PREFIX = '/assets/photos';
const VIDEOS_URL_PREFIX = '/assets/videos';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, PHOTOS_DIR);
    if (file.mimetype.startsWith('video/')) return cb(null, VIDEOS_DIR);
    return cb(new Error('Unsupported file type'));
  },
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${unique}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/') || file.mimetype.startsWith('video/')) {
    return cb(null, true);
  }
  return cb(new Error('Only image and video files are allowed'), false);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 } // 100 MB per file
});

const openHouseUpload = upload.fields([
  { name: 'photos', maxCount: 10 },
  { name: 'video', maxCount: 1 }
]);

// Profile-photo upload — single image field "photo", reuses the same on-disk
// PHOTOS_DIR as every other photo upload but enforces an image-only filter and
// a tighter 5 MB size limit. Files land in the same folder, exposed at the
// /uploads/<file> same-origin path (see index.js static mount).
const UPLOADS_URL_PREFIX = '/uploads';

const profilePhotoUpload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) return cb(null, true);
    return cb(new Error('Only image files are allowed'), false);
  },
  limits: { fileSize: 5 * 1024 * 1024 } // 5 MB
}).single('photo');

// Generic photo-only upload — reused by quotes, projects and show-my-property.
const photosUpload = upload.fields([
  { name: 'photos', maxCount: 10 }
]);

// Collects uploaded photo files into public URL paths (e.g. /assets/photos/x.jpg).
const collectPhotoPaths = (req) =>
  (req.files && req.files.photos)
    ? req.files.photos.map((f) => `${PHOTOS_URL_PREFIX}/${f.filename}`)
    : [];

const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError || err) {
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

module.exports = {
  upload,
  openHouseUpload,
  photosUpload,
  profilePhotoUpload,
  collectPhotoPaths,
  handleUploadError,
  PHOTOS_URL_PREFIX,
  VIDEOS_URL_PREFIX,
  UPLOADS_URL_PREFIX,
  PHOTOS_DIR,
  ASSETS_DIR
};
