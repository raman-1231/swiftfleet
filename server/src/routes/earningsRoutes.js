const express = require('express');
const router = express.Router();
const earningsController = require('../controllers/earningsController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.get('/partner', verifyToken, requireRole('partner'), earningsController.getPartnerEarnings);
router.get('/business', verifyToken, requireRole('business', 'admin'), earningsController.getBusinessAnalytics);

module.exports = router;
