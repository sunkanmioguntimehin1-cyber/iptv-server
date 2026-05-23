const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
    },
    plan: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'Plan',
      required: true,
    },
    status: {
      type:    String,
      enum:    ['pending', 'active', 'expired', 'cancelled'],
      default: 'pending',
    },
    startDate:  Date,
    endDate:    Date,

    // Stripe fields
    stripeSessionId:      String,
    stripePaymentIntentId: String,
    stripeCustomerId:      String,
  },
  { timestamps: true }
);

// Convenience: check if subscription is currently active
subscriptionSchema.methods.isActive = function () {
  return this.status === 'active' && this.endDate > new Date();
};

module.exports = mongoose.model('Subscription', subscriptionSchema);
