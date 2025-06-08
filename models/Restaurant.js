const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: String,
    phone: String,
    description: String,
    image: String, // URL ảnh đại diện nhà hàng
    openHours: String,
}, { timestamps: true });

module.exports = mongoose.model('Restaurant', restaurantSchema);
