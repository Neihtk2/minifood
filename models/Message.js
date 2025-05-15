const mongoose = require("mongoose");

// Định nghĩa schema cho tin nhắn
const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true }, // ID phòng chat
  senderId: { type: Number, required: true }, // Người gửi (customer hoặc staff)
  message: { type: String, required: true }, // Nội dung tin nhắn
  timestamp: { type: Date, default: Date.now }, // Thời gian gửi
  senderRole: { type: String, required: true }, // Vai trò người gửi
});

const Message = mongoose.model("Message", messageSchema);
module.exports = Message;
