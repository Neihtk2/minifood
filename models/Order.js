// models/Order.js
const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  name: {
    type: String,
    // required: true
  },
  price: {
    type: Number,
    // required: true
  },
  image: {
    type: String,
    default: ""
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  }
});

const orderSchema = new mongoose.Schema({
  userId: {
    type: Number,
    ref: "User",
    required: true
  },
  customerName: {
    type: String,
    required: [true, "Vui lòng nhập tên người nhận"]
  },
  phone: {
    type: String,
    required: [true, "Vui lòng nhập số điện thoại"]
  },
  deliveryAddress: {
    type: String,
    required: [true, "Vui lòng nhập địa chỉ giao hàng"]
  },
  paymentMethod: {
    type: String,
    enum: ["cash", "cod"],
    required: true
  },
  items: [orderItemSchema], // Lưu trực tiếp thông tin
  total: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "processing", "delivering", "completed", "cancelled", "rejected"],
    default: "pending"
  },
  createdAt: { type: String, default: Date.now }
}
// ,{ timestamps: true }
);
orderSchema.pre('save', async function (next) {
  
  // Lấy ngày giờ hiện tại và format thành "dd/mm/yyyy"
  const now = new Date();
  const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  this.createdAt = formattedDate;

  next();
});
module.exports = mongoose.model("Order", orderSchema);