const express = require('express');
const router = express.Router();
const { protect, checkRole } = require('../utils/authMiddleware');
const { createOrder, getOrders, cancelOrder, updateOrderStatus, unlockUser, getTopSoldDishes, acceptOrderForDelivery, getPendingDeliveryOrders, getAcceptedDeliveryOrders, createPayment } = require('../controllers/orderController');
// const {checkAccountLocked }= require('../utils/checkAccountLocked');  
// Tạo đơn hàng - Chỉ user
router.route('/').post(
  protect,
  checkRole('user', 'staff'),
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
  checkRole('admin', 'staff', 'shipper'),
  updateOrderStatus
);
router.patch(
  '/unlock/:userId',
  protect,
  checkRole('admin'),
  unlockUser
);
router.get(
  '/accept-delivery',
  protect,
  getPendingDeliveryOrders
);
router.patch(
  '/accept-delivery/:orderId',
  protect,
  acceptOrderForDelivery
);
router.get(
  '/accepted-delivery',
  protect,
  getAcceptedDeliveryOrders
);
router.get('/top-dishes',
  //  protect, 
  getTopSoldDishes);
router.get('/payment', protect, createPayment)
module.exports = router;