const router      = require('express').Router();
const { body }    = require('express-validator');
const ctrl        = require('../controllers/subscriptionController');
const validate    = require('../middleware/validate');
const { protect } = require('../middleware/auth');

router.use(protect); // all subscription routes require login

router.post(
  '/checkout',
  [body('planId').notEmpty().withMessage('Plan ID required')],
  validate,
  ctrl.createCheckout
);

router.get('/status', ctrl.getStatus);
router.post('/cancel', ctrl.cancelSubscription);

module.exports = router;
