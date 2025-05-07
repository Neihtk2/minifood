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
    default: Date.now, // Luôn tự động tạo ngày nếu không cung cấp
    validate: {
      validator: function (v) {
        return v instanceof Date && !isNaN(v.getTime());
      },
      message: props => `${props.value} không phải ngày tháng hợp lệ!`
    }
  }

});
const dishSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Vui lòng nhập Tên sản phẩm'], unique: true, trim: true },
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
    max: 5,
    set: val => Math.round(val * 10) / 10
  },
  ratingCount: {
    type: Number,
    default: 0
  },
  createdAt: { type: Date, default: Date.now }
});
dishSchema.pre('save', function (next) {
  if (this.isModified('ratings')) {
    const totalStars = this.ratings.reduce((sum, rating) => sum + rating.star, 0);
    this.averageRating = totalStars / this.ratings.length;
    this.ratingCount = this.ratings.length;
  }
  next();
});
module.exports = mongoose.model('Dish', dishSchema);