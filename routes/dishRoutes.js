
// routes/dishRoutes.js
const express = require('express');
const router = express.Router();
const {
  getDishes,
  getDishById,
  createDish,
  updateDish,
  deleteDish,
  getNewDishes
} = require('../controllers/dishController');
const { protect, checkRole } = require('../utils/authMiddleware');
const upload = require('../utils/upload'); // Import middleware upload

// Public routes
router.get('/', getDishes);
router.get('/newDish', getNewDishes);
router.get('/:id', getDishById);


// Admin routes (kèm xử lý upload ảnh)
router.post(
  '/',
  protect,
  checkRole('admin'),
  upload.single('image'), // Thêm middleware upload cho trường 'image'
  createDish
);

router.put(
  '/:id',
  protect,
  checkRole('admin'),
  upload.single('image'), // Thêm middleware upload cho trường 'image'
  updateDish
);

router.delete('/:id', protect, checkRole('admin'), deleteDish);

module.exports = router;