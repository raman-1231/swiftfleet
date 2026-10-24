const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { verifyToken, requireRole } = require('../middleware/authMiddleware');

router.post('/estimate', verifyToken, orderController.estimateOrder);
router.post('/', verifyToken, requireRole('business', 'admin'), orderController.createOrder);
router.get('/', verifyToken, orderController.getOrders);
router.get('/:id', verifyToken, orderController.getOrderById);
router.post('/:id/cancel', verifyToken, orderController.cancelOrder);

module.exports = router;
