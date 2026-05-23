const router   = require('express').Router();
const { body } = require('express-validator');
const ctrl     = require('../controllers/authController');
const validate = require('../middleware/validate');
const { protect } = require('../middleware/auth');

const registerRules = [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password')
    .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
    .matches(/[A-Z]/).withMessage('Must contain uppercase letter')
    .matches(/[0-9]/).withMessage('Must contain a number'),
];

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('password').notEmpty().withMessage('Password required'),
];

router.post('/register', registerRules, validate, ctrl.register);
router.post('/login',    loginRules,    validate, ctrl.login);
router.post('/refresh',  ctrl.refresh);
router.post('/logout',   protect, ctrl.logout);
router.get('/me',        protect, ctrl.getMe);

module.exports = router;
