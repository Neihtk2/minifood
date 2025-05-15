const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
  customerId: { type: Number, required: true }, // Khách hàng (1 người)
  staffIds: { type: [Number], default: [] }, // Danh sách nhân viên đã tham gia
  isAnswered: { type: Boolean, default: true },
  createdAt: { type: Date, default: Date.now },
});

const Room = mongoose.model("Room", roomSchema);
module.exports = Room;