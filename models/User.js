
const mongoose = require('mongoose');
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 }
});
const Counter = mongoose.model('Counter', counterSchema);
const userSchema = new mongoose.Schema({
  _id: Number,
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  name: { type: String },
  role: { type: String, enum: ['user', 'staff', 'shipper', 'admin'], default: 'user' },
  phone: String,
  address: String,
  rejectCount: {
    type: Number,
    default: 0
  },
  isLocked: {
    type: Boolean,
    default: false
  },
  image: {
    type: String,
    default: ''
  },
  createdAt: { type: Date, default: Date.now }
});
userSchema.pre('save', async function (next) {
  if (!this._id) {
    const counter = await Counter.findByIdAndUpdate(
      { _id: 'userId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this._id = counter.seq;
  }

  // Lấy ngày giờ hiện tại và format thành "dd/mm/yyyy"
  // const now = new Date();
  // const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
  // this.createdAt = formattedDate;

  next();
});

module.exports = mongoose.model('User', userSchema);