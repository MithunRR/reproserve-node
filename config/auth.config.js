require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'reproserve-super-secret-key-change-me',
  expiresIn: process.env.JWT_EXPIRES_IN || '1d'
};
