// models/Dish.js
const mongoose = require('mongoose');
const ratingSchema = new mongoose.Schema({
  userId: {
    type: Number,
    ref: "User",
    required: true
  },
  star: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    maxlength: 500
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});
const dishSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Vui lòng nhập Tên sản phẩm'] },
  price: { type: Number, required: [true, 'Vui lòng nhập Giá sản phẩm'], },
  image: {
    type: String,
    default: ''
  },
  category: { type: String, enum: ['main', 'beverage', 'dessert'], required: true },
  description: {
    type: String,
    maxlength: 1000
  },
  ratings: [ratingSchema],
  averageRating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Dish', dishSchema);