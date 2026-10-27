const express = require('express');
const router = express.Router();
const trackingController = require('../controllers/trackingController');
const { trackingLimiter, pinRegenLimiter } = require('../middleware/rateLimiter');

// Public customer tracking endpoints (authorized strictly via cryptographic trackingToken)
router.get('/:token', trackingLimiter, trackingController.getOrderTracking);
router.post('/:token/regenerate-pin', pinRegenLimiter, trackingController.regeneratePin);

module.exports = router;
