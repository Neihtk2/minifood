const Room = require('../models/Room');
const asyncHandler = require('express-async-handler');

// @desc    Lấy danh sách phòng chat của user (khách hoặc nhân viên)
// @route   GET /api/room/user/:userId
// @access  Private
// const getRoomsByUser = asyncHandler(async (req, res) => {
//     try {
//         const userId = req.params.userId;
//         const rooms = await Room.find({
//             $or: [{ customerId: userId }, { staffId: userId }]
//         }).sort({ createdAt: -1 });

//         res.status(200).json({ success: true, rooms });
//     } catch (err) {
//         res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách phòng' });
//     }
// });
const getRoomsByUser = asyncHandler(async (req, res) => {
    try {
        const userId = req.params.userId;
        const rooms = await Room.find({
            $and: [
                { isActive: true }, // CHỈ LẤY PHÒNG ĐANG HOẠT ĐỘNG
                {
                    $or: [{ customerId: userId }, { staffId: userId }]
                }
            ]
        }).sort({ createdAt: -1 });

        res.status(200).json({ success: true, rooms });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi khi lấy danh sách phòng' });
    }
});

// @desc    Kết thúc phòng chat
// @route   PATCH /api/room/:roomId/end
// @access  Private
const endChatRoom = asyncHandler(async (req, res) => {
    try {
        const roomId = req.params.roomId;
        await Room.findByIdAndUpdate(roomId, { isActive: false });

        res.status(200).json({ success: true, message: 'Phòng đã kết thúc' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi khi kết thúc phòng' });
    }
});

module.exports = {
    getRoomsByUser,
    endChatRoom,
};

