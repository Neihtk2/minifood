// routes/userRoutes.js
const express = require('express');
const {
  getUserProfile,
  updateUserProfile,
  getUsers, changePassword, saveFcmToken, deleteUser, searchUsers
} = require('../controllers/userController');
// const orderController = require('../controllers/orderController');
// const cartController = require('../controllers/cartController');
const { protect, checkRole } = require('../utils/authMiddleware');
const upload = require('../utils/upload');
const { addToCart, getCart, removeCartItem, updateCartItemQuantity } = require('../controllers/cartController');

const router = express.Router();

router.route('/')
  .get(protect, checkRole('admin'), getUsers);
// Thêm vào giỏ hàng - Xem giỏ hàng - Chỉ user
router.route('/cart').post(
  protect,
  checkRole('user', 'staff'),
  addToCart
).get(
  protect,
  checkRole('user', 'staff'),
  getCart
).delete(
  protect,
  checkRole('user', 'staff'),
  removeCartItem
).patch(
  protect,
  checkRole('user', 'staff'),
  updateCartItemQuantity
);
router.get('/search', protect, checkRole('admin'), searchUsers);
router.delete('/delete-user/:id', protect, checkRole("admin"), deleteUser);
router.post('/change-password', protect, changePassword);
router.route('/profile')
  .get(protect, getUserProfile)
  .put(protect, upload.single('image'), updateUserProfile);
// routes/userRoutes.js
router.post('/save-fcm-token', protect, saveFcmToken);

module.exports = router;