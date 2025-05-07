const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../utils/authMiddleware');
const { getOrders } = require('../controllers/orderController');


router.route('/allOrders').get(
  protect,
  checkRole('admin', 'staff'),
  getOrders
)
module.exports = router;