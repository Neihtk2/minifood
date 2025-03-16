const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../utils/authMiddleware');
const {createOrder, getOrders, cancelOrder, updateOrderStatus, unlockUser} = require('../controllers/orderController');
// const {checkAccountLocked }= require('../utils/checkAccountLocked');  
// Tạo đơn hàng - Chỉ user
router.route('/').post(
  protect, 
  checkRole('user'), 
  // checkAccountLocked,
  createOrder
).get(
  protect,  
  getOrders
);
router.route('/cancel/:id').patch(
  protect, 
  checkRole('user', 'admin', 'staff'), 
  cancelOrder
);
router.patch(
  '/status/:id',
  protect,
  checkRole('admin', 'staff'),
  updateOrderStatus
);
router.patch(
  '/unlock/:userId',
  protect,
  checkRole('admin'),
  unlockUser
);
module.exports = router;