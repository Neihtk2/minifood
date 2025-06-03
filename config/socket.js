// File: socket.js
const User = require('../models/User');
const Room = require('../models/Room');
const Message = require('../models/Message');

const onlineUsers = new Map();
const socketToUser = new Map();

function socketHandler(io) {
    io.on('connection', (socket) => {
        // --- joinUser ---
        socket.on('joinUser', async ({ userId, role }) => {
            const userIdStr = userId.toString();
            socket.userId = userId;
            socket.role = role;

            socketToUser.set(socket.id, userIdStr);

            let data = onlineUsers.get(userIdStr) || { socketIds: new Set(), role };
            data.socketIds.add(socket.id);
            data.role = role;
            onlineUsers.set(userIdStr, data);

            await User.findByIdAndUpdate(userId, {
                isOnline: true,
                status: role === 'staff' ? 'free' : 'online',
                lastSeen: new Date(),
            });

            console.log(`${role} ${userId} connected`);
        });

        // --- request-chat ---
        socket.on('request-chat', async ({ customerId }) => {
            try {
                const onlineStaffIds = Array.from(onlineUsers.entries())
                    .filter(([_, val]) => val.role === 'staff')
                    .map(([id]) => id);

                let availableStaff = null;
                for (const staffId of onlineStaffIds) {
                    const activeCount = await Room.countDocuments({ staffId, isActive: true });
                    if (activeCount < 5) {
                        availableStaff = await User.findById(staffId);
                        break;
                    }
                }

                if (!availableStaff) {
                    socket.emit('chat-response', {
                        success: false,
                        message: 'Không có nhân viên rảnh. Vui lòng thử lại sau.',
                    });
                    return;
                }

                // ✅ Check if there's already an active room between the same user–staff pair
                const existingRoom = await Room.findOne({
                    customerId,
                    staffId: availableStaff._id,
                    isActive: true,
                });

                if (existingRoom) {
                    socket.join(existingRoom._id.toString());

                    const staffSocketData = onlineUsers.get(availableStaff._id.toString());
                    if (staffSocketData) {
                        for (const staffSocketId of staffSocketData.socketIds) {
                            io.to(staffSocketId).emit('joinRoom', { roomId: existingRoom._id.toString() });
                            io.sockets.sockets.get(staffSocketId)?.join(existingRoom._id.toString());
                        }
                    }

                    socket.emit('chat-response', {
                        success: true,
                        room: existingRoom.toObject(),
                    });

                    console.log(`♻️ Reused room ${existingRoom._id} for user ${customerId} and staff ${availableStaff._id}`);
                    return;
                }

                // ✅ Create new room if not exists
                const room = await Room.create({
                    customerId,
                    staffId: availableStaff._id,
                    isActive: true,
                });

                socket.join(room._id.toString());

                const staffSocketData = onlineUsers.get(availableStaff._id.toString());
                if (staffSocketData) {
                    for (const staffSocketId of staffSocketData.socketIds) {
                        console.log("➡️ Sending joinRoom:", { roomId: room._id.toString() });
                        io.to(staffSocketId).emit('joinRoom', { roomId: room._id.toString() });
                        io.sockets.sockets.get(staffSocketId)?.join(room._id.toString());
                    }
                }

                socket.emit('chat-response', {
                    success: true,
                    room: room.toObject(),
                });

                console.log(`🆕 Room ${room._id} created between user ${customerId} and staff ${availableStaff._id}`);
            } catch (err) {
                console.error('❌ Error in request-chat:', err);
                socket.emit('chat-response', { success: false, message: 'Lỗi khi tạo phòng.' });
            }
        });


        // --- sendMessage ---
        socket.on('sendMessage', async ({ roomId, senderId, senderRole, message }) => {
            try {
                const newMsg = await Message.create({
                    roomId,
                    senderId,
                    senderRole,
                    message: message.trim(),
                });

                io.to(roomId).emit('receiveMessage', {
                    roomId,
                    senderId,
                    senderRole,
                    message,
                    createdAt: newMsg.createdAt,
                });
            } catch (err) {
                console.error('Error sending message:', err);
            }
        });

        // --- disconnect ---
        socket.on('disconnect', async () => {
            const userIdStr = socketToUser.get(socket.id);
            socketToUser.delete(socket.id);

            if (!userIdStr) return;
            const data = onlineUsers.get(userIdStr);
            if (!data) return;

            data.socketIds.delete(socket.id);
            if (data.socketIds.size === 0) {
                onlineUsers.delete(userIdStr);
                await User.findByIdAndUpdate(userIdStr, {
                    isOnline: false,
                    status: 'offline',
                    lastSeen: new Date(),
                });
                console.log(`User ${userIdStr} disconnected`);
            } else {
                onlineUsers.set(userIdStr, data);
            }
        });
        socket.on('end-chat', async ({ roomId, staffId }) => {
            try {
                // Cập nhật trạng thái phòng
                await Room.findByIdAndUpdate(roomId, { isActive: false });

                // Gửi sự kiện cho các client trong phòng
                io.to(roomId).emit('chat-ended', { roomId });

                console.log(`Room ${roomId} ended by staff ${staffId}`);
            } catch (err) {
                console.error('❌ Error ending chat:', err);
            }
        });
        socket.on('join', ({ roomId }) => {
            socket.join(roomId);
            console.log(`✅ Socket ${socket.id} joined room ${roomId}`);
        });
    });
}

module.exports = socketHandler;
