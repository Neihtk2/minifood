const express = require('express');
const router = express.Router();
const restaurantController = require('../controllers/restaurantController');

// GET /api/restaurant
router.get('/', restaurantController.getRestaurant);

// POST /api/restaurant (chỉ tạo 1 lần)
router.post('/', restaurantController.createRestaurant);

// PUT /api/restaurant
router.put('/', restaurantController.updateRestaurant);

module.exports = router;
