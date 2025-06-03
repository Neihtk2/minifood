const express = require('express');
const router = express.Router();
const { getMessagesByRoom, sendMessage } = require('../controllers/messageController');

router.get('/room/:roomId', getMessagesByRoom);
router.post('/', sendMessage);

module.exports = router;