
// routes/dishRoutes.js
const express = require('express');
const router = express.Router();
const {
  getDishes,
  getDishById,
  createDish,
  updateDish,
  deleteDish,
  getNewDishes,
  addRating
} = require('../controllers/dishController');
const { protect, checkRole } = require('../utils/authMiddleware');
const upload = require('../utils/upload'); // Import middleware upload

// Public routes
router.get('/', getDishes);
router.get('/newDish', getNewDishes);
router.get('/:id', getDishById);

router.post(
  '/',
  protect,
  checkRole('admin'),
  upload.single('image'),
  createDish
);
router.post('/ratings', protect, addRating);

router.put(
  '/:id',
  protect,
  checkRole('admin'),
  upload.single('image'),
  updateDish
);

router.delete('/:id', protect, checkRole('admin'), deleteDish);

module.exports = router;