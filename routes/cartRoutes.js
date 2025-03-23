// const express = require('express');
// const router = express.Router();
// const cartController = require('../controllers/cartController');
// const { protect, checkRole } = require('../utils/authMiddleware');

// // Thêm vào giỏ hàng - Chỉ user
// router.post('/add',
//   protect,
//   checkRole('user'),
//   cartController.addToCart
// );

// // Xem giỏ hàng - Chỉ user
// router.get('/',
//   protect,
//   checkRole('user'),
//   cartController.getCart
// );
// module.exports = router;