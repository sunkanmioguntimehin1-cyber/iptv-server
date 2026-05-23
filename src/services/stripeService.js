const Stripe = require('stripe');
const logger  = require('../utils/logger');

const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ─── Create a Stripe checkout session ────────────────────────────────────────
const createCheckoutSession = async ({ userId, planSlug, stripePriceId, userEmail }) => {
  const BASE = process.env.STRIPE_REDIRECT_BASE_URL || `http://localhost:${process.env.PORT || 5001}`;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    mode:                 'subscription',   // use 'subscription' for recurring billing
    customer_email:       userEmail,
    line_items: [
      {
        price:    stripePriceId,
        quantity: 1,
      },
    ],
    metadata: {
      userId,
      planSlug,
    },
    // After payment Stripe redirects here — our backend then redirects to the app
    success_url: `${BASE}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${BASE}/payment/cancel`,
  });

  return session;
};

// ─── Verify a webhook event signature ────────────────────────────────────────
const constructWebhookEvent = (rawBody, signature) =>
  stripe.webhooks.constructEvent(
    rawBody,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );

// ─── Retrieve a checkout session by ID ───────────────────────────────────────
const getCheckoutSession = async (sessionId) =>
  stripe.checkout.sessions.retrieve(sessionId, {
    expand: ['payment_intent'],
  });

module.exports = {
  createCheckoutSession,
  constructWebhookEvent,
  getCheckoutSession,
};
