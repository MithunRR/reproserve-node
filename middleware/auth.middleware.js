const jwt = require('jsonwebtoken');
const authConfig = require('../config/auth.config');

const verifyToken = (req, res, next) => {
  const authHeader = req.headers['authorization'] || req.headers['x-access-token'];

  if (!authHeader) {
    return res.status(403).json({ success: false, message: 'No token provided' });
  }

  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7).trim()
    : authHeader;

  jwt.verify(token, authConfig.secret, (err, decoded) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Unauthorized — invalid or expired token' });
    }
    req.userId = decoded.id;
    req.role = decoded.role;
    req.email = decoded.email;
    next();
  });
};

const requireRole = (...roles) => (req, res, next) => {
  if (!roles.includes(req.role)) {
    return res.status(403).json({ success: false, message: 'Forbidden — role not permitted' });
  }
  next();
};

module.exports = { verifyToken, requireRole };
