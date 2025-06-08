// File: controllers/messageController.js
const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Lấy danh sách tin nhắn theo room
// @route   GET /api/message/room/:roomId
// @access  Private
const getMessagesByRoom = asyncHandler(async (req, res) => {
    try {
        const roomId = req.params.roomId;
        const messages = await Message.find({ roomId })
            .sort({ createdAt: 1 })
            .lean();

        for (const msg of messages) {
            const sender = await User.findById(msg.senderId).lean();
            msg.sender = sender ? { name: sender.name } : null;
        }

        res.status(200).json({ success: true, messages });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy tin nhắn' });
    }
});

// @desc    Gửi tin nhắn (qua REST API nếu cần)
// @route   POST /api/message
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    try {
        const { roomId, senderId, senderRole, message } = req.body;

        if (!roomId || !senderId || !senderRole || !message) {
            return res.status(400).json({ success: false, message: 'Thiếu dữ liệu gửi tin nhắn' });
        }

        const newMsg = await Message.create({
            roomId,
            senderId,
            senderRole,
            message: message.trim(),
        });

        res.status(201).json({ success: true, message: newMsg });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server khi gửi tin nhắn' });
    }
});

module.exports = {
    getMessagesByRoom,
    sendMessage,
};