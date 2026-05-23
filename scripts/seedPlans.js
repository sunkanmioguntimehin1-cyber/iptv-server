require('dotenv').config();
const mongoose = require('mongoose');
const Plan     = require('../src/models/Plan');
const logger   = require('../src/utils/logger');

const plans = [
  {
    name:           'Monthly',
    slug:           'monthly',
    description:    'Full access to all channels and VOD — billed monthly',
    price:          12,
    currency:       'USD',
    durationDays:   30,
    maxConnections: 2,
    features: [
      'All 10,000+ channels',
      'Full VOD library',
      '4K streams',
      '2 devices simultaneously',
      'Cancel anytime',
    ],
    stripePriceId: process.env.STRIPE_PRICE_MONTHLY,
    popular:       false,
    savings:       null,
    isActive:      true,
  },
  {
    name:           'Yearly',
    slug:           'yearly',
    description:    'Best value — save 45% with an annual plan',
    price:          79,
    currency:       'USD',
    durationDays:   365,
    maxConnections: 4,
    features: [
      'Everything in Monthly',
      '4 devices simultaneously',
      'Priority support',
      'Early access to new channels',
      'Save 45% vs monthly',
    ],
    stripePriceId: process.env.STRIPE_PRICE_YEARLY,
    popular:       true,
    savings:       '45%',
    isActive:      true,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI);
  logger.info('Connected to MongoDB');

  await Plan.deleteMany({});
  const inserted = await Plan.insertMany(plans);
  logger.info(`Seeded ${inserted.length} plans`);

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  logger.error(err.message);
  process.exit(1);
});
