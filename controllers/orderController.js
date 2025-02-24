const Cart = require('../models/Cart');
const Order = require('../models/Order'); // Thêm import Order
const asyncHandler = require("express-async-handler");

// @desc    Tạo đơn hàng mới
// @route   POST /api/orders
// @access  Private/User
const createOrder = asyncHandler(async (req, res) => {
  try {
    // Lấy giỏ hàng và thông tin món ăn
    const cart = await Cart.findOne({ userId: req.user._id })
      .populate({
        path: 'items.dishId',
        select: '_id name price' // Sử dụng _id thay vì id
      });
      cart.items.forEach(item => {
        if (!item.dishId || item.dishId.category === undefined) {
          throw new Error('Thông tin món ăn không hợp lệ');
        }
      });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống"
      });
    }

    // Tạo danh sách items và tính tổng
    let total = 0;
    const orderItems = [];

    for (const item of cart.items) {
      if (!item.dishId || typeof item.dishId.price !== 'number') {
        return res.status(400).json({
          success: false,
          message: "Thông tin món ăn không hợp lệ"
        });
      }

      const itemTotal = item.dishId.price * item.quantity;
      total += itemTotal;

      orderItems.push({
        dishId: item.dishId._id, // Sử dụng trực tiếp _id
        name: item.dishId.name,
        price: item.dishId.price,
        quantity: item.quantity
      });
    }

    // Tạo đơn hàng
    const order = await Order.create({
      userId: req.user._id,
      items: orderItems,
      total: Number(total.toFixed(2)), // Chuyển về number
      deliveryAddress: req.body.deliveryAddress,
      paymentMethod: req.body.paymentMethod
    });

    // Xóa giỏ hàng
    await Cart.deleteOne({ _id: cart._id });

    res.status(201).json({
      success: true,
      data: order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message
    });
  }
});

// @desc    Lấy danh sách đơn hàng
// @route   GET /api/orders
// @access  Private/Admin
const getOrders = asyncHandler(async (req, res) => {
  try {
    // Phân trang và lọc
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const filter = {};
    const sort = { createdAt: -1 }; // Mặc định sắp xếp mới nhất

    if (req.query.status) {
      filter.status = req.query.status;
    }

    if (req.query.sort) {
      const [field, order] = req.query.sort.split(':');
      sort[field] = order === 'desc' ? -1 : 1;
    }

    // Truy vấn dữ liệu
    const [orders, total] = await Promise.all([
      Order.find(filter)
        .populate({
          path: 'userId',
          select: 'name email phone',
          model: 'User' // Thêm model reference
        })
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Order.countDocuments(filter)
    ]);

    // Format tiền tệ
    const formattedOrders = orders.map(order => ({
      ...order,
      total: order.total.toLocaleString('vi-VN', { 
        style: 'currency', 
        currency: 'VND' 
      })
    }));

    res.status(200).json({
      success: true,
      count: orders.length,
      totalOrders: total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      data: formattedOrders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});

module.exports = {
  createOrder,
  getOrders
};