const Plan         = require('../models/Plan');
const Subscription = require('../models/Subscription');
const IptvAccount  = require('../models/IptvAccount');
const ApiError     = require('../utils/ApiError');
const { success }  = require('../utils/response');
const stripeService = require('../services/stripeService');

// ─── POST /api/subscriptions/checkout ────────────────────────────────────────
// Create a Stripe checkout session and return the URL to the app
exports.createCheckout = async (req, res) => {
  const { planId } = req.body;

  const plan = await Plan.findById(planId);
  if (!plan || !plan.isActive) throw ApiError.notFound('Plan not found');
  if (!plan.stripePriceId) throw ApiError.internal('Plan not configured for payments');

  // Check if user already has an active subscription
  const existingSub = await Subscription.findOne({
    user:   req.user._id,
    status: 'active',
  });
  if (existingSub) throw ApiError.conflict('You already have an active subscription');

  // Create a pending subscription record — will be activated by webhook
  const subscription = await Subscription.create({
    user:   req.user._id,
    plan:   plan._id,
    status: 'pending',
  });

  const session = await stripeService.createCheckoutSession({
    userId:        req.user._id.toString(),
    planSlug:      plan.slug,
    stripePriceId: plan.stripePriceId,
    userEmail:     req.user.email,
  });

  // Store the Stripe session ID for the webhook to reference
  subscription.stripeSessionId = session.id;
  await subscription.save();

  return success(res, { checkoutUrl: session.url, sessionId: session.id });
};

// ─── GET /api/subscriptions/status ───────────────────────────────────────────
// App polls this after payment to know when IPTV creds are ready
exports.getStatus = async (req, res) => {
  const subscription = await Subscription.findOne({
    user: req.user._id,
  })
    .sort({ createdAt: -1 })
    .populate('plan', 'name slug durationDays price');

  const iptvAccount = await IptvAccount.findOne({ user: req.user._id });

  return success(res, {
    subscription: subscription ?? null,
    iptvCredentials: iptvAccount?.isActive
      ? {
          portalUrl:    iptvAccount.portalUrl,
          iptvUsername: iptvAccount.iptvUsername,
          iptvPassword: iptvAccount.iptvPassword,
          expiresAt:    iptvAccount.expiresAt,
        }
      : null,
  });
};

// ─── POST /api/subscriptions/cancel ──────────────────────────────────────────
exports.cancelSubscription = async (req, res) => {
  const subscription = await Subscription.findOne({
    user:   req.user._id,
    status: 'active',
  });
  if (!subscription) throw ApiError.notFound('No active subscription found');

  subscription.status = 'cancelled';
  await subscription.save();

  // Deactivate IPTV account — imported here to avoid circular deps
  const { deactivateSubscriber } = require('../services/xuioneService');
  const iptvAccount = await IptvAccount.findOne({ user: req.user._id });
  if (iptvAccount?.xuiUserId) {
    await deactivateSubscriber(iptvAccount.xuiUserId);
    iptvAccount.isActive = false;
    await iptvAccount.save();
  }

  return success(res, {}, 'Subscription cancelled');
};
