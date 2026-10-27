const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authLimiter, forgotPasswordLimiter, resetPasswordLimiter } = require('../middleware/rateLimiter');

router.post('/register-business', authLimiter, authController.registerBusiness);
router.post('/register-partner', authLimiter, authController.registerPartner);
router.post('/login', authLimiter, authController.login);
router.get('/me', verifyToken, authController.getMe);

// Secure Password Reset Workflow
router.post('/forgot-password', forgotPasswordLimiter, authController.forgotPassword);
router.get('/validate-reset-token/:token', resetPasswordLimiter, authController.validateResetToken);
router.post('/reset-password', resetPasswordLimiter, authController.resetPassword);

module.exports = router;
