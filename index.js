require('dotenv').config();
const path = require('path');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');

const db = require('./models');
const routes = require('./routes');
const { seedServiceTypes } = require('./config/serviceTypeData');
const { bootstrapAdmin } = require('./config/bootstrapAdmin');

const app = express();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/assets', express.static(path.join(__dirname, 'assets')));

// API routes first — anything under /api goes to the backend.
app.use('/api', routes);

// Serve the React production build. In dev (when CLIENT_BUILD_PATH is unset
// and the folder doesn't exist) these middlewares simply no-op, so Vite's
// own dev server on :3003 keeps working untouched.
const CLIENT_BUILD_PATH = process.env.CLIENT_BUILD_PATH
  || path.join(__dirname, '..', 'Reproserve-reactjs', 'build');

app.use(express.static(CLIENT_BUILD_PATH));

// SPA fallback — any non-API GET returns index.html so React Router takes over.
app.get(/^\/(?!api).*/, (req, res, next) => {
  const indexFile = path.join(CLIENT_BUILD_PATH, 'index.html');
  res.sendFile(indexFile, (err) => {
    if (err) next();
  });
});

// 404 for anything that fell through (API misses, missing static asset).
app.use((req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 3000;

const SYNC_MODE = (process.env.DB_SYNC || 'safe').toLowerCase();

const runSync = () => {
  if (SYNC_MODE === 'force') {
    console.log('DB_SYNC=force  →  sequelize.sync({ force: true })  (drops & recreates tables)');
    return db.sequelize.sync({ force: true });
  }
  if (SYNC_MODE === 'alter') {
    console.log('DB_SYNC=alter  →  sequelize.sync({ alter: true })  (alters existing schema)');
    return db.sequelize.sync({ alter: true });
  }
  console.log('DB_SYNC=safe   →  sequelize.sync()  (creates missing tables only — no ALTER)');
  return db.sequelize.sync();
};

db.sequelize
  .authenticate()
  .then(() => {
    console.log('Database connection established successfully.');
    return runSync();
  })
  .then(() => seedServiceTypes(db))
  .then(() => bootstrapAdmin(db))
  .then(() => {
    console.log('Schema sync complete.');
    app.listen(PORT, () => {
      console.log(`ReproServe server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Unable to start server:', err);
    process.exit(1);
  });
