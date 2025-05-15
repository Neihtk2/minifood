const Room = require("../models/Room"); // Cần một model Room để lưu thông tin về phòng chat
const Message = require("../models/Message"); // Model này lưu trữ tin nhắn

module.exports = function (io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // Người dùng tham gia phòng chat
    socket.on("joinUser", ({ userId, role }) => {
      socket.userId = userId;
      socket.role = role;

      if (role === "staff") {
        console.log(`Staff ${userId} connected`);
      }

      if (role === "user") {
        console.log(`Customer ${userId} connected`);
      }
    });

    // Người dùng tham gia phòng chat cụ thể
    socket.on("joinRoom", async ({ roomId }) => {
      socket.join(roomId);
      console.log(`User ${socket.userId} joined room ${roomId}`);

      // Nếu có thể, bạn có thể lấy thêm thông tin về phòng để phản hồi về client
      try {
        const room = await Room.findOne({ roomId });
        if (room) {
          io.to(roomId).emit("roomInfo", room); // Gửi thông tin phòng đến tất cả người tham gia
        }
      } catch (err) {
        console.error("Error fetching room info:", err);
      }
    });

    // Xử lý gửi tin nhắn
    socket.on(
      "sendMessage",
      async ({ roomId, senderId, senderRole, message }) => {
        try {
          // Tìm phòng trong cơ sở dữ liệu
          const room = await Room.findOne({ roomId });

          if (room) {
            if (!room.isAnswered) {
              room.isAnswered = true; // Đánh dấu phòng đã được trả lời
              room.userId.push(senderId); // Thêm người gửi vào danh sách người dùng phòng
              await room.save(); // Lưu thông tin phòng đã cập nhật
            }
            // Tạo tin nhắn mới và lưu vào database
            const newMessage = new Message({
              roomId,
              senderId,
              senderRole,
              message,
            });
            await newMessage.save();

            // Gửi tin nhắn đến tất cả người tham gia phòng chat
            io.to(roomId).emit("receiveMessage", {
              roomId,
              senderId,
              senderRole,
              message,
            });
          }
        } catch (err) {
          console.error("Error sending message:", err);
        }
      }
    );

    // Xử lý ngắt kết nối
    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
};
