const router = require('express').Router();
const ctrl   = require('../controllers/planController');

router.get('/',    ctrl.getPlans);
router.get('/:id', ctrl.getPlan);

module.exports = router;
