// models/Dish.js
const mongoose = require('mongoose');
const dishSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Vui lòng nhập Tên sản phẩm'] },
  price: { type: Number, required: [true, 'Vui lòng nhập Giá sản phẩm'], },
  image: {
    type: String,
    default: ''
  },
  category: { type: String, enum: ['main', 'beverage', 'dessert'], required: true },
  // isAvailable: { type: Boolean, default: true },
  // stock: { type: Number, default: 0 }
  createdAt: { type: String, default: Date.now }
});
dishSchema.pre('save', async function (next) {
  // Lấy ngày giờ hiện tại và format thành "dd/mm/yyyy"
  const now = new Date();
  const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  this.createdAt = formattedDate;

  next();
});
module.exports = mongoose.model('Dish', dishSchema);