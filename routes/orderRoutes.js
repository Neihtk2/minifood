const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, checkRole } = require('../utils/authMiddleware');
const {createOrder, getOrders} = require('../controllers/orderController');

// Tạo đơn hàng - Chỉ user
router.route('/').post(
  protect, 
  checkRole('user'), 
  createOrder
).get(
  protect, 
  checkRole('user'), 
  getOrders
);
module.exports = router;