const mongoose = require("mongoose");
const messageSchema = new mongoose.Schema({
    roomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Room', required: true },
    senderId: { type: Number, ref: 'User', required: true },
    senderRole: { type: String, enum: ["user", "staff"], required: true },
    message: { type: String, required: true },
}, { timestamps: true });

module.exports = mongoose.model("Message", messageSchema);
