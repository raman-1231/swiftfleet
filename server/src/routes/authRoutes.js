const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');

router.post('/register-business', authLimiter, authController.registerBusiness);
router.post('/register-partner', authLimiter, authController.registerPartner);
router.post('/login', authLimiter, authController.login);
router.get('/me', verifyToken, authController.getMe);

module.exports = router;
