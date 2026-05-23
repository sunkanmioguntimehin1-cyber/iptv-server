const Subscription   = require('../models/Subscription');
const Plan           = require('../models/Plan');
const IptvAccount    = require('../models/IptvAccount');
const User           = require('../models/User');
const ApiError       = require('../utils/ApiError');
const logger         = require('../utils/logger');
const stripeService  = require('../services/stripeService');
const xuioneService  = require('../services/xuioneService');

// ─── POST /api/webhooks/stripe ────────────────────────────────────────────────
// Stripe sends events here after payment — this is the most critical endpoint
// Raw body is required for signature verification (configured in server.js)
exports.stripeWebhook = async (req, res) => {
  const signature = req.headers['stripe-signature'];

  let event;
  try {
    event = stripeService.constructWebhookEvent(req.rawBody, signature);
  } catch (err) {
    logger.error(`Webhook signature verification failed: ${err.message}`);
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  logger.info(`Stripe event received: ${event.type}`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object);
        break;

      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object);
        break;

      default:
        logger.info(`Unhandled event type: ${event.type}`);
    }
  } catch (err) {
    logger.error(`Webhook handler error [${event.type}]: ${err.message}`, { err });
    // Return 200 so Stripe doesn't keep retrying — log and investigate manually
  }

  // Always respond 200 to Stripe immediately
  res.status(200).json({ received: true });
};

// ─── Handle successful payment → provision IPTV account ──────────────────────
async function handleCheckoutCompleted(session) {
  const { userId, planSlug } = session.metadata;

  if (!userId || !planSlug) {
    logger.error('Webhook missing metadata', { sessionId: session.id });
    return;
  }

  const [user, plan] = await Promise.all([
    User.findById(userId),
    Plan.findOne({ slug: planSlug }),
  ]);

  if (!user || !plan) {
    logger.error(`Webhook: user or plan not found`, { userId, planSlug });
    return;
  }

  // Activate the subscription
  const startDate = new Date();
  const endDate   = new Date();
  endDate.setDate(endDate.getDate() + plan.durationDays);

  await Subscription.findOneAndUpdate(
    { user: userId, stripeSessionId: session.id },
    {
      status:                'active',
      startDate,
      endDate,
      stripePaymentIntentId: session.payment_intent,
      stripeCustomerId:      session.customer,
    }
  );

  // Check if user already has an IPTV account (e.g. renewal)
  const existingIptvAccount = await IptvAccount.findOne({ user: userId });

  if (existingIptvAccount) {
    // Extend existing account
    const newExpiry = await xuioneService.extendSubscriber(
      existingIptvAccount.xuiUserId,
      plan.durationDays
    );
    existingIptvAccount.expiresAt = newExpiry;
    existingIptvAccount.isActive  = true;
    await existingIptvAccount.save();
    logger.info(`Renewed IPTV account for user ${userId}`);
  } else {
    // Create brand new IPTV account on XUI.ONE
    const xuiAccount = await xuioneService.createSubscriber({
      userName:       user.name,
      durationDays:   plan.durationDays,
      maxConnections: plan.maxConnections,
    });

    await IptvAccount.create({
      user:           userId,
      xuiUserId:      xuiAccount.xuiUserId,
      iptvUsername:   xuiAccount.iptvUsername,
      iptvPassword:   xuiAccount.iptvPassword,
      portalUrl:      process.env.IPTV_PORTAL_URL,
      maxConnections: plan.maxConnections,
      expiresAt:      xuiAccount.expiresAt,
      isActive:       true,
    });

    logger.info(`New IPTV account provisioned for user ${userId}: ${xuiAccount.iptvUsername}`);
  }
}

// ─── Handle failed payment ────────────────────────────────────────────────────
async function handlePaymentFailed(paymentIntent) {
  logger.warn(`Payment failed: ${paymentIntent.id}`);
  // You can notify the user by email here
}
