// models/Dish.js
const mongoose = require('mongoose');
const dishSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Vui lòng nhập Tên sản phẩm'] },
  price: { type: Number, required: [true, 'Vui lòng nhập Giá sản phẩm'], },
  image: String,
  category: { type: String, enum: ['main', 'beverage', 'dessert'], required: true },
  // isAvailable: { type: Boolean, default: true },
  // stock: { type: Number, default: 0 }
});

module.exports = mongoose.model('Dish', dishSchema);