const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../models');
const authConfig = require('../config/auth.config');
const { sendMail, verificationEmailTemplate } = require('../services/mailer');

const { User, ServiceType } = db;
const { resolveServiceTypeId } = require('../config/serviceTypeData');

const VERIFICATION_TTL_HOURS = 24;
const RESEND_COOLDOWN_S      = 60;
const FRONTEND_URL           = process.env.FRONTEND_URL || 'http://localhost:3003';

const generateVerificationToken = () => crypto.randomBytes(32).toString('hex');

// Sends the verification email to the user. Returns { ok, message }. Errors
// during send do not throw — the caller decides what to do (e.g. roll back
// the account creation).
async function sendVerificationLink(account) {
  const link = `${FRONTEND_URL}/verify-email?token=${account.verificationToken}`;
  const { subject, html, text } = verificationEmailTemplate({
    link,
    firstName: account.firstName,
    hours: VERIFICATION_TTL_HOURS
  });
  try {
    await sendMail({ to: account.email, subject, html, text });
    return { ok: true };
  } catch (err) {
    console.error('verification email send failed:', err.message);
    return { ok: false, message: err.message };
  }
}

const sanitize = (instance) => {
  const obj = instance.toJSON();
  delete obj.password;
  return obj;
};

const signToken = (account) =>
  jwt.sign(
    { id: account.id, email: account.email, role: account.role },
    authConfig.secret,
    { expiresIn: authConfig.expiresIn }
  );

// Sanitises the "Register as -" radio value. Falls back to deriving it from
// role so legacy callers (or missing field) still produce a sensible value.
const resolveRegisterAs = (raw, role) => {
  const v = String(raw || '').toLowerCase();
  if (v === 'individual' || v === 'business') return v;
  return role === 'user' ? 'individual' : 'business';
};

const buildPayloadForRole = (role, body, hashedPassword, serviceTypeId) => {
  const base = {
    role,
    registerAs: resolveRegisterAs(body.registerAs, role),
    firstName: body.firstName,
    lastName: body.lastName,
    email: body.email,
    phone: body.phone || null,
    password: hashedPassword,
    streetAddress: body.streetAddress || null,
    city: body.city || null,
    state: body.state || null,
    zipCode: body.zipCode || null
  };

  if (role === 'service_provider' || role === 'realtor') {
    return {
      ...base,
      businessName: body.businessName || null,
      serviceTypeId,
      businessDesc: body.businessDesc || null,
      licenseNumber: body.licenseNumber || null
    };
  }
  return base;
};

exports.register = async (req, res) => {
  try {
    const { role, email, password } = req.body;

    // Hard guard: admin accounts can never be created via the public signup
    // form. They are bootstrapped from .env on server start.
    if (role === 'admin') {
      return res.status(403).json({ success: false, message: 'Invalid account type.' });
    }

    const existing = await User.findOne({ where: { email } });
    if (existing) {
      // If the existing record was never verified, treat this submit as a
      // "resend" instead of a hard 409 — the user is trying again to finish
      // signup. We refresh the token and re-send the email, leaving the row.
      if (!existing.emailVerified) {
        existing.verificationToken = generateVerificationToken();
        existing.verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
        await existing.save();
        const r = await sendVerificationLink(existing);
        if (!r.ok) {
          return res.status(502).json({ success: false, message: 'Could not send the verification email. Please try again.' });
        }
        return res.status(200).json({
          success: true,
          requiresEmailVerification: true,
          message: 'Account already started — we just resent the verification link to your email.',
          data: { email: existing.email }
        });
      }
      return res.status(409).json({ success: false, message: 'An account with this email already exists' });
    }

    // The register form sends serviceType as a name (e.g. "Plumber"); resolve
    // it to a service_types id, creating the row if it does not exist yet.
    const serviceTypeId = await resolveServiceTypeId(db, req.body.serviceType);

    const hashed = bcrypt.hashSync(password, 10);
    const payload = buildPayloadForRole(role, req.body, hashed, serviceTypeId);
    // Account is created unverified; flips to verified when the user clicks
    // the link in the email.
    payload.emailVerified = false;
    payload.verificationToken = generateVerificationToken();
    payload.verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
    const account = await User.create(payload);

    const sent = await sendVerificationLink(account);
    if (!sent.ok) {
      // Roll back so the user can retry with the same email.
      await account.destroy();
      return res.status(502).json({
        success: false,
        message: 'Account created but the verification email could not be sent. Please try again in a moment.'
      });
    }

    // No JWT yet — user must click the link before they can log in.
    return res.status(201).json({
      success: true,
      requiresEmailVerification: true,
      message: 'Account created. Please check your email and click the verification link to activate your account.',
      data: { email: account.email, firstName: account.firstName }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// GET /api/auth/verify-email/:token
// Marks the account verified, clears the token, and issues a JWT so the user
// is logged in immediately.
exports.verifyEmail = async (req, res) => {
  try {
    const token = String(req.params.token || '').trim();
    if (!token) {
      return res.status(400).json({ success: false, message: 'Verification token is required.' });
    }

    const account = await User.findOne({ where: { verificationToken: token } });
    if (!account) {
      // Could be already-verified (token cleared) or fully invalid. We don't
      // disclose which to avoid an enumeration oracle.
      return res.status(400).json({
        success: false,
        message: 'This verification link is invalid or has already been used.'
      });
    }

    if (account.verificationExpiresAt && new Date(account.verificationExpiresAt).getTime() < Date.now()) {
      return res.status(410).json({
        success: false,
        message: 'This verification link has expired. Please request a new one.',
        expired: true,
        email: account.email
      });
    }

    account.emailVerified = true;
    account.verificationToken = null;
    account.verificationExpiresAt = null;
    await account.save();

    const accessToken = signToken(account);
    return res.status(200).json({
      success: true,
      message: 'Email verified successfully.',
      data: { account: sanitize(account), accessToken }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/resend-verification  { email }
// Rate-limited resend for users whose token expired or who lost the email.
exports.resendVerification = async (req, res) => {
  try {
    const email = String(req.body.email || '').trim().toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'email is required' });
    }

    const account = await User.findOne({ where: { email } });
    // Always 200-style response so an attacker can't enumerate emails.
    if (!account || account.emailVerified) {
      return res.status(200).json({
        success: true,
        message: 'If an unverified account exists for that email, a new verification link has been sent.'
      });
    }

    if (account.verificationExpiresAt) {
      const issuedAtMs = new Date(account.verificationExpiresAt).getTime()
                       - VERIFICATION_TTL_HOURS * 60 * 60 * 1000;
      const elapsedS = Math.floor((Date.now() - issuedAtMs) / 1000);
      if (elapsedS < RESEND_COOLDOWN_S) {
        const retryIn = RESEND_COOLDOWN_S - elapsedS;
        return res.status(429).json({
          success: false,
          message: `Please wait ${retryIn} seconds before requesting another email.`,
          retryIn
        });
      }
    }

    account.verificationToken = generateVerificationToken();
    account.verificationExpiresAt = new Date(Date.now() + VERIFICATION_TTL_HOURS * 60 * 60 * 1000);
    await account.save();

    const r = await sendVerificationLink(account);
    if (!r.ok) {
      return res.status(502).json({ success: false, message: 'Could not send the verification email. Please try again.' });
    }
    return res.status(200).json({
      success: true,
      message: 'Verification link sent. Check your email.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.login = async (req, res) => {
  try {
    const { password } = req.body;
    // Normalise the incoming email so a stray leading space or different
    // case (typed via mobile autocomplete) doesn't surface as 404.
    const email = String(req.body.email || '').trim().toLowerCase();

    const account = await User.findOne({ where: { email } });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    if (account.isActive === false) {
      return res.status(403).json({ success: false, message: 'Account is inactive' });
    }

    const valid = bcrypt.compareSync(password, account.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid password' });
    }

    if (!account.emailVerified) {
      return res.status(403).json({
        success: false,
        message: 'Please verify your email first. Check your inbox for the verification link or request a new one.',
        requiresEmailVerification: true,
        email: account.email
      });
    }

    const token = signToken(account);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: { account: sanitize(account), accessToken: token }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

exports.me = async (req, res) => {
  try {
    const account = await User.findByPk(req.userId, {
      include: [{ model: ServiceType, as: 'serviceType' }]
    });
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    return res.status(200).json({ success: true, data: { account: sanitize(account) } });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/forgot-password  { email }
// No mail service is configured, so the generated temporary password is
// returned in the response for development use.
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'email is required' });
    }

    const account = await User.findOne({ where: { email } });
    if (!account) {
      return res.status(404).json({ success: false, message: 'No account found with this email' });
    }

    const tempPassword = Math.random().toString(36).slice(-10);
    account.password = bcrypt.hashSync(tempPassword, 10);
    await account.save();

    return res.status(200).json({
      success: true,
      message: 'A temporary password has been generated. Log in with it, then change your password.',
      data: { temporaryPassword: tempPassword }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};

// POST /api/auth/change-password  (requires a valid token)
// Accepts both snake_case and camelCase field names for convenience.
exports.changePassword = async (req, res) => {
  try {
    const currentPassword = req.body.current_password || req.body.currentPassword;
    const newPassword = req.body.password || req.body.newPassword;
    const confirmation = req.body.password_confirmation || req.body.confirmPassword;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'currentPassword and newPassword are required'
      });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long' });
    }
    if (confirmation !== undefined && confirmation !== newPassword) {
      return res.status(400).json({ success: false, message: 'New password and confirmation do not match' });
    }

    const account = await User.findByPk(req.userId);
    if (!account) {
      return res.status(404).json({ success: false, message: 'Account not found' });
    }
    if (!bcrypt.compareSync(currentPassword, account.password)) {
      return res.status(401).json({ success: false, message: 'Current password is incorrect' });
    }

    account.password = bcrypt.hashSync(newPassword, 10);
    await account.save();

    return res.status(200).json({ success: true, message: 'Password changed successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
};
