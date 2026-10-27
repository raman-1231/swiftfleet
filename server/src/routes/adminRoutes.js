const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

// All admin routes strictly guarded
router.use(verifyToken);
router.use(requireRole('admin'));

router.get('/metrics', adminController.getMetrics);
router.get('/partners', adminController.getPartners);
router.get('/partners/:partnerId/decrypt-kyc', adminController.decryptPartnerKYC);
router.put('/partners/:partnerId/verify', adminController.reviewPartnerVerification);
router.get('/fleet-live', adminController.getFleetLive);
router.get('/disputes', adminController.getDisputes);
router.post('/disputes', adminController.createDispute);
router.put('/disputes/:disputeId', adminController.resolveDispute);
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
