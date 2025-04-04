// routes/userRoutes.js
const express = require('express');
const { 
  getUserProfile, 
  updateUserProfile,
  getUsers
} = require('../controllers/userController');
// const orderController = require('../controllers/orderController');
// const cartController = require('../controllers/cartController');
const { protect, checkRole } = require('../utils/authMiddleware');
const{addToCart, getCart, removeCartItem} = require('../controllers/cartController');

const router = express.Router();

router.route('/')
  .get(protect, checkRole('admin'), getUsers);
// Thêm vào giỏ hàng - Xem giỏ hàng - Chỉ user
router.route('/cart').post(
  protect, 
  checkRole('user'), 
  addToCart
).get( 
  protect, 
  checkRole('user'), 
  getCart
).delete(
  protect,
  checkRole('user'),
  removeCartItem
);

router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, updateUserProfile);

module.exports = router;