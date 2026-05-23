const jwt     = require('jsonwebtoken');
const User    = require('../models/User');
const ApiError = require('../utils/ApiError');

// Verify access token and attach user to req
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(ApiError.unauthorized('No token provided'));
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user    = await User.findById(decoded.id).select('-password -refreshToken');

    if (!user) return next(ApiError.unauthorized('User no longer exists'));

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired'));
    }
    return next(ApiError.unauthorized('Invalid token'));
  }
};

// Restrict to specific roles
const restrictTo = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(ApiError.forbidden('You do not have permission'));
  }
  next();
};

module.exports = { protect, restrictTo };
