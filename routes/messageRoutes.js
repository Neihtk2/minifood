const express = require('express');
const router = express.Router();
const {
  getMessagesByRoomId,
  getAllMessages,
  getMessagesByUserId,
  saveMessage
} = require('../controllers/messageController');

// Route to get messages by room ID
router.get('/room/:roomId', getMessagesByRoomId);

// Route to get all messages
router.get('/', getAllMessages);

// Route to get messages by user ID
router.get('/user/:userId', getMessagesByUserId);
// Route to save a message
router.post('/save', saveMessage);

module.exports = router;