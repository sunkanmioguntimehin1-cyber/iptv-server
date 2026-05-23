const mongoose = require('mongoose');

const planSchema = new mongoose.Schema(
  {
    name: {
      type:     String,
      required: true,
      trim:     true,
    },
    slug: {
      type:     String,
      required: true,
      unique:   true,
      lowercase: true,
      // e.g. 'monthly', 'yearly'
    },
    description: String,
    price: {
      type:     Number,
      required: true,
      min:      0,
    },
    currency: {
      type:    String,
      default: 'usd',
      uppercase: true,
    },
    // Duration in days — 30 for monthly, 365 for yearly
    durationDays: {
      type:     Number,
      required: true,
    },
    // Max simultaneous streams per subscriber
    maxConnections: {
      type:    Number,
      default: 1,
    },
    features: [String], // ['All channels', '4K streams', 'VOD library']
    stripePriceId: {
      type: String, // links to Stripe price object
    },
    popular: {
      type:    Boolean,
      default: false,
    },
    savings: {
      type:   String,
      default: null, // e.g. "45%"
    },
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Plan', planSchema);
