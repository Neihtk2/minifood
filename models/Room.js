const mongoose = require("mongoose");

const roomSchema = new mongoose.Schema({
    customerId: { type: Number, ref: 'User', required: true },
    staffId: { type: Number, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Room", roomSchema);
