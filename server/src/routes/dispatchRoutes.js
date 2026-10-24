const express = require('express');
const router = express.Router();
const dispatchController = require('../controllers/dispatchController');
const { verifyToken, requireRole, requireApprovedPartner } = require('../middleware/authMiddleware');

router.get('/offers', verifyToken, requireRole('partner'), dispatchController.getOffers);
router.post('/accept/:orderId', verifyToken, requireRole('partner'), requireApprovedPartner, dispatchController.acceptOffer);
router.post('/reject/:orderId', verifyToken, requireRole('partner'), dispatchController.rejectOffer);
router.post('/status-update', verifyToken, requireRole('partner'), dispatchController.updateDeliveryState);
router.post('/availability', verifyToken, requireRole('partner'), dispatchController.toggleAvailability);
router.post('/location', verifyToken, requireRole('partner'), dispatchController.updateLocation);

module.exports = router;
