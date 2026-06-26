require('dotenv').config();
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Server } = require('socket.io');

const db = require('./models');
const routes = require('./routes');
const { seedServiceTypes } = require('./config/serviceTypeData');
const { bootstrapAdmin } = require('./config/bootstrapAdmin');
const { initChatSocket } = require('./sockets/chat');
const { systemLock, isLocked } = require('./middleware/systemLock');

const app = express();

app.use(cors());

// System lock — must run BEFORE any route, static file, or SPA fallback so a
// locked app serves only the "contact the developer" notice. See
// middleware/systemLock.js. Reversible via LOCK_DATE / LOCK_ENABLED in .env.
app.use(systemLock);

app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));

app.use('/assets', express.static(path.join(__dirname, 'assets')));

// Profile photos are written to the shared assets/photos folder but exposed
// under the same-origin /uploads/<file> path the frontend expects (see
// POST /api/profile/photo). Points at the same physical dir as /assets/photos.
app.use('/uploads', express.static(path.join(__dirname, 'assets', 'photos')));

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

// Wrap Express in an HTTP server so Socket.IO can share the same port.
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: true, credentials: true },
  // Allow same-origin in prod (Express serves the SPA) and the Vite dev
  // origin (vite.config proxies /socket.io through to here).
  path: '/socket.io'
});

// Make the io instance reachable from REST controllers, e.g.
// req.app.get('io').to(`user:${id}`).emit(...)
app.set('io', io);

// Socket.IO handles /socket.io itself, before Express middleware runs, so the
// lock has to be re-checked here to refuse realtime connections when locked.
io.use((socket, next) => {
  if (isLocked()) return next(new Error('Service unavailable'));
  next();
});

initChatSocket(io, db);

// Real-time notifications. A single Sequelize hook covers every place that
// calls `Notification.create(...)` — controllers, scripts, future code paths
// — so we never have to remember to emit manually. (bulkCreate is not used,
// but if added it must pass `individualHooks: true` to trigger this.)
db.Notification.addHook('afterCreate', (notification) => {
  if (!notification?.userId) return;
  io.to(`user:${notification.userId}`).emit('notification:new', notification);
});

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
    server.listen(PORT, () => {
      console.log(`ReproServe server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Unable to start server:', err);
    process.exit(1);
  });
