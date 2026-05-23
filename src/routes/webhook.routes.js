const router = require('express').Router();
const ctrl   = require('../controllers/webhookController');

// Raw body needed for Stripe signature verification
// Configured in server.js with express.raw()
router.post('/stripe', ctrl.stripeWebhook);

module.exports = router;
