const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../utils/authMiddleware');
const orderController = require('../controllers/orderController');


router.route('/allOrders').get(
  protect, 
  checkRole('admin', 'staff'),
  orderController.getAllOrders 
)
module.exports = router;