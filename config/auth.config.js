require('dotenv').config();

module.exports = {
  secret: process.env.JWT_SECRET || 'reproserve-super-secret-key-change-me',
  // Session tokens never expire by default — users stay signed in until they
  // log out themselves (like most social apps). Set JWT_EXPIRES_IN (e.g. '7d',
  // '12h') if you ever want sessions to expire automatically again.
  expiresIn: process.env.JWT_EXPIRES_IN || null
};
