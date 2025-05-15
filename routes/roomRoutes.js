const express = require('express');
const router = express.Router();
const { createRoom, getAllRooms, getRoomByStaffId } = require('../controllers/roomController');

// Route to create a room
router.post('/', createRoom);

// Route to get all rooms
router.get('/', getAllRooms);

// Route to get rooms by staff ID
router.get('/staff/:staffId', getRoomByStaffId);

module.exports = router;