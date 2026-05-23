const router = require('express').Router();

const DEEP_LINK_BASE = process.env.APP_DEEP_LINK || 'smartiptv://';

router.get('/success', (req, res) => {
  const { session_id } = req.query;
  const redirectUrl = session_id
    ? `${DEEP_LINK_BASE}payment/success?session_id=${session_id}`
    : `${DEEP_LINK_BASE}payment/success`;
  res.redirect(302, redirectUrl);
});

router.get('/cancel', (req, res) => {
  res.redirect(302, `${DEEP_LINK_BASE}payment/cancel`);
});

module.exports = router;
