const ALLOWED_ROLES = ['user', 'service_provider', 'realtor'];

const validateRegister = (req, res, next) => {
  const {
    role, firstName, lastName, email, password, confirmPassword
  } = req.body;

  if (!role || !ALLOWED_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      message: `role is required and must be one of: ${ALLOWED_ROLES.join(', ')}`
    });
  }
  if (!firstName || !lastName || !email || !password) {
    return res.status(400).json({
      success: false,
      message: 'firstName, lastName, email and password are required'
    });
  }
  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      message: 'Password must be at least 6 characters long'
    });
  }
  if (confirmPassword !== undefined && confirmPassword !== password) {
    return res.status(400).json({
      success: false,
      message: 'Password and confirmPassword do not match'
    });
  }
  if ((role === 'service_provider' || role === 'realtor') && !req.body.businessName) {
    return res.status(400).json({
      success: false,
      message: 'businessName is required for service providers and realtors'
    });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, message: 'email and password are required' });
  }
  next();
};

module.exports = { validateRegister, validateLogin, ALLOWED_ROLES };
