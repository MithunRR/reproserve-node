// ---------------------------------------------------------------------------
// System lock (maintenance gate)
//
// On or after LOCK_DATE the whole application is sealed *at the server*:
//   - every /api request is refused with HTTP 503,
//   - every page / manual URL / static asset returns the "contact the
//     developer" notice instead of the app,
//   - new socket connections are rejected.
//
// Nothing is ever deleted or altered. The database, the code, the uploads are
// all untouched. To restore the site you (and only you, since the server
// credentials changed) edit LOCK_DATE / LOCK_ENABLED in .env and restart:
//     pm2 restart reproserve
//
// Enforcement is server-time based, so a visitor changing their own computer
// clock cannot bypass it, and because the lock page is served *instead of*
// index.html the React bundle never loads to be tampered with.
// ---------------------------------------------------------------------------

// Default trigger: midnight IST on 1 July 2026 — i.e. once 30 June 2026 has
// passed. The explicit +05:30 offset makes it deterministic no matter what
// timezone the server runs in. Override with LOCK_DATE in .env if needed.
const LOCK_DATE = new Date(process.env.LOCK_DATE || '2026-07-01T00:00:00+05:30');

// Manual override knob:
//   LOCK_ENABLED=true   → locked right now, ignoring the date
//   LOCK_ENABLED=false  → never locked (kill switch off), ignoring the date
//   (unset)             → automatic: locked once LOCK_DATE passes
const FORCE = (process.env.LOCK_ENABLED || '').trim().toLowerCase();

const LOCK_CONTACT = process.env.LOCK_CONTACT || 'the developer';

const isLocked = () => {
  if (FORCE === 'true') return true;
  if (FORCE === 'false') return false;
  const target = LOCK_DATE.getTime();
  if (Number.isNaN(target)) return false; // bad date → fail open, never lock by accident
  return Date.now() >= target;
};

const LOCK_MESSAGE = `This service is currently unavailable. Please contact ${LOCK_CONTACT} to restore access.`;

// Standalone HTML — no external assets, no scripts, no dependency on the build.
const lockHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<meta name="robots" content="noindex, nofollow" />
<title>Service Unavailable</title>
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { height: 100%; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    background: linear-gradient(135deg, #0f172a 0%, #1e3a8a 100%);
    color: #f8fafc;
    display: flex; align-items: center; justify-content: center;
    min-height: 100vh; padding: 24px; text-align: center;
  }
  .card {
    max-width: 520px; width: 100%;
    background: rgba(255,255,255,0.06);
    border: 1px solid rgba(255,255,255,0.12);
    border-radius: 18px; padding: 40px 32px;
    backdrop-filter: blur(6px);
  }
  .icon { font-size: 56px; line-height: 1; margin-bottom: 18px; }
  h1 { font-size: 24px; font-weight: 700; margin-bottom: 14px; }
  p { font-size: 16px; line-height: 1.6; color: #cbd5e1; }
  .contact { margin-top: 22px; font-size: 15px; color: #93c5fd; word-break: break-word; }
  .foot { margin-top: 28px; font-size: 13px; color: #64748b; }
</style>
</head>
<body>
  <div class="card">
    <div class="icon">&#128274;</div>
    <h1>Service Temporarily Unavailable</h1>
    <p>This application has been locked. Please contact ${LOCK_CONTACT} to fix this and restore access.</p>
    <div class="contact">${process.env.LOCK_CONTACT ? process.env.LOCK_CONTACT : ''}</div>
    <div class="foot">If you believe this is an error, reach out to the developer.</div>
  </div>
</body>
</html>`;

// Express middleware — mount this FIRST, before any routes or static serving.
function systemLock(req, res, next) {
  if (!isLocked()) return next();

  // Never let a proxy or browser cache the locked response.
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');

  // API + realtime → hard JSON failure (also kills any already-loaded/cached SPA).
  if (req.path.startsWith('/api') || req.path.startsWith('/socket.io')) {
    return res.status(503).json({ success: false, locked: true, message: LOCK_MESSAGE });
  }

  // Pages, manual URLs, static assets → the lock page instead of the app.
  return res.status(503).type('html').send(lockHtml);
}

module.exports = { systemLock, isLocked, LOCK_MESSAGE };
