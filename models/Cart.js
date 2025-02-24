// models/Cart.js
const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  name: {
    type: String,
    // required: [true, 'Tên món là bắt buộc'],
  },
  price: {
    type: Number,
    // required: [true, 'Giá món là bắt buộc'],
  },
  image: {
    type: String,
    default: ''
  },
  quantity: {
    type: Number,
    required: [true, 'Số lượng là bắt buộc'],
    min: [1, 'Số lượng tối thiểu là 1']
  }
});

const cartSchema = new mongoose.Schema({
  userId: {
    type: Number,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema]
}, { timestamps: true });

module.exports = mongoose.model('Cart', cartSchema);