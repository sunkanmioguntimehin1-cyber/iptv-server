const User         = require('../models/User');
const IptvAccount  = require('../models/IptvAccount');
const Subscription = require('../models/Subscription');
const ApiError     = require('../utils/ApiError');
const { success, created } = require('../utils/response');
const {
  generateAccessToken,
  generateRefreshToken,
  saveRefreshToken,
  verifyRefreshToken,
} = require('../services/tokenService');

// ─── Helper: build the auth payload returned to the app ──────────────────────
const buildAuthPayload = async (user) => {
  const accessToken  = generateAccessToken(user._id);
  const refreshToken = generateRefreshToken(user._id);
  await saveRefreshToken(user._id, refreshToken);

  // Check if user has active IPTV credentials
  const iptvAccount = await IptvAccount.findOne({ user: user._id, isActive: true });

  // Check latest subscription so frontend can distinguish pending vs no subscription
  const subscription = await Subscription.findOne({ user: user._id })
    .sort({ createdAt: -1 })
    .populate('plan', 'slug');

  return {
    accessToken,
    refreshToken,
    user: {
      id:    user._id,
      name:  user.name,
      email: user.email,
      role:  user.role,
      subscriptionStatus: subscription?.status || null,
      planSlug:          subscription?.plan?.slug || null,
      expiresAt:         subscription?.endDate || null,
    },
    // Return IPTV creds if active — app uses these to connect straight to channels
    iptvCredentials: iptvAccount
      ? {
          portalUrl:    iptvAccount.portalUrl,
          iptvUsername: iptvAccount.iptvUsername,
          iptvPassword: iptvAccount.iptvPassword,
          expiresAt:    iptvAccount.expiresAt,
        }
      : null,
  };
};

// ─── POST /api/auth/register ──────────────────────────────────────────────────
exports.register = async (req, res, next) => {
  const { name, email, password } = req.body;

  const existing = await User.findOne({ email });
  if (existing) throw ApiError.conflict('Email already registered');

  const user    = await User.create({ name, email, password });
  const payload = await buildAuthPayload(user);

  return created(res, payload, 'Account created successfully');
};

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  // Explicitly select password (excluded by default)
  const user = await User.findOne({ email }).select('+password');
  if (!user) throw ApiError.unauthorized('Invalid credentials');

  const isMatch = await user.comparePassword(password);
  if (!isMatch) throw ApiError.unauthorized('Invalid credentials');

  const payload = await buildAuthPayload(user);
  return success(res, payload, 'Login successful');
};

// ─── POST /api/auth/refresh ───────────────────────────────────────────────────
exports.refresh = async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) throw ApiError.badRequest('Refresh token required');

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw ApiError.unauthorized('Invalid or expired refresh token');
  }

  const user = await User.findById(decoded.id).select('+refreshToken');
  if (!user || user.refreshToken !== refreshToken) {
    throw ApiError.unauthorized('Refresh token revoked');
  }

  const accessToken     = generateAccessToken(user._id);
  const newRefreshToken = generateRefreshToken(user._id);
  await saveRefreshToken(user._id, newRefreshToken);

  return success(res, { accessToken, refreshToken: newRefreshToken });
};

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
exports.logout = async (req, res) => {
  await User.findByIdAndUpdate(req.user._id, { refreshToken: null });
  return success(res, {}, 'Logged out successfully');
};

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
exports.getMe = async (req, res) => {
  const user        = await User.findById(req.user._id);
  const iptvAccount = await IptvAccount.findOne({ user: req.user._id, isActive: true });
  const subscription = await Subscription.findOne({
    user:   req.user._id,
    status: 'active',
  }).populate('plan', 'name slug durationDays');

  return success(res, {
    user,
    subscription: subscription ?? null,
    iptvCredentials: iptvAccount
      ? {
          portalUrl:    iptvAccount.portalUrl,
          iptvUsername: iptvAccount.iptvUsername,
          iptvPassword: iptvAccount.iptvPassword,
          expiresAt:    iptvAccount.expiresAt,
        }
      : null,
  });
};
