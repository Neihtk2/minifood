
const mongoose = require('mongoose');
const orderSchema = new mongoose.Schema({
  userId: {
    type: Number,
    ref: 'User',
    required: true
  },
  items: [{
    dishId: {
      type: String,
      ref: 'Dish',
      required: true
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    }
  }],
  total: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'delivered', 'cancelled'],
    default: 'pending'
  }
}, { timestamps: true });
module.exports = mongoose.model('Order', orderSchema);