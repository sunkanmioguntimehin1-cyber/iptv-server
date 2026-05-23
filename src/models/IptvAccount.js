const mongoose = require('mongoose');

const iptvAccountSchema = new mongoose.Schema(
  {
    user: {
      type:     mongoose.Schema.Types.ObjectId,
      ref:      'User',
      required: true,
      unique:   true, // one IPTV account per user
    },
    subscription: {
      type: mongoose.Schema.Types.ObjectId,
      ref:  'Subscription',
    },
    // Credentials on XUI.ONE panel
    xuiUserId:    String,  // XUI.ONE internal user ID
    iptvUsername: {
      type:   String,
      unique: true,
    },
    iptvPassword: String,
    portalUrl: {
      type:    String,
      default: () => process.env.IPTV_PORTAL_URL,
    },
    maxConnections: {
      type:    Number,
      default: 1,
    },
    expiresAt: Date,
    isActive: {
      type:    Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('IptvAccount', iptvAccountSchema);
