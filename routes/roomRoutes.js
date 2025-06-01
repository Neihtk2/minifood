const express = require('express');
const Room = require('../models/Room');
const router = express.Router();
const {
    getRoomsByUser,
    endChatRoom
} = require('../controllers/roomController');

router.get('/user/:userId', getRoomsByUser);
router.patch('/:roomId/end', endChatRoom);
router.get('/:id', async (req, res) => {
    try {
        const room = await Room.findById(req.params.id);
        if (!room) return res.status(404).json({ message: 'Room not found' });

        res.json({ room });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi server' });
    }
});


module.exports = router;