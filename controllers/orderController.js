// controllers/orderController.js
const Order = require("../models/Order");
const Cart = require("../models/Cart");
const asyncHandler = require("express-async-handler");
const User = require("../models/User"); 

const createOrder = asyncHandler(async (req, res) => {
  try {
    const { 
      customerName, 
      phone, 
      deliveryAddress, 
      paymentMethod 
    } = req.body;

    // Validate input
    if (!customerName || !phone || !deliveryAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin"
      });
    }

    // Kiểm tra phương thức thanh toán
    if (!["cash", "cod"].includes(paymentMethod)) {
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ"
      });
    }

    // Lấy giỏ hàng
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống"
      });
    }

    // Tạo items từ giỏ hàng
    const orderItems = cart.items.map(item => ({
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity
    }));

    // Tính tổng tiền
    const total = cart.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    // Tạo đơn hàng
    const order = await Order.create({
      userId: req.user._id,
      customerName,
      phone,
      deliveryAddress,
      paymentMethod,
      items: orderItems,
      total
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
const getOrders = asyncHandler(async (req, res) => {
  try {
    let query = {};
    const userRole = req.user.role;
    const userId = req.user._id;

    // Xử lý phân quyền
    switch(userRole) {
      case 'user':
        query.userId = userId;
        break;
        
      case 'staff':
        query.status = { $in: ['pending', 'processing', 'delivering'] };
        break;
        
      case 'admin':
        // Không thêm điều kiện
        break;
        
      default:
        return res.status(403).json({
          success: false,
          message: "Truy cập bị từ chối"
        });
    }

    // Thêm khả năng lọc theo trạng thái (nếu cần)
    if (req.query.status) {
      query.status = req.query.status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: orders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message
    });
  }
});
const cancelOrder = asyncHandler(async (req, res) => {
  try {
    const orderId = req.params.id;
    const { _id: userId, role } = req.user;

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra quyền hủy
    const isOwner = order.userId.toString() === userId.toString();
    const isAdminStaff = ['admin', 'staff'].includes(role);
    
    if (!isOwner && !isAdminStaff) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền thực hiện thao tác này"
      });
    }

    // Kiểm tra trạng thái
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy đơn hàng ở trạng thái chờ xử lý"
      });
    }

    // Cập nhật trạng thái
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: 'cancelled' },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Hủy đơn hàng thành công",
      data: updatedOrder
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message
    });
  }
});
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { role } = req.user;

  // Chỉ admin/staff được cập nhật
  if (!["admin", "staff"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Truy cập bị từ chối"
    });
  }

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({ 
      success: false, 
      message: "Không tìm thấy đơn hàng" 
    });
  }

  // Cập nhật trạng thái
  order.status = status;
  await order.save();

  // Xử lý nếu trạng thái là rejected
  if (status === "rejected") {
    const user = await User.findOne({ _id: order.userId });
    user.rejectCount += 1;

    if (user.rejectCount >= 3) {
      user.isLocked = true;
    }

    await user.save();
  }

  res.json({ 
    success: true, 
    data: order 
  });
});
const unlockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Chỉ admin được phép
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Truy cập bị từ chối"
    });
  }

  const user = await User.findOne({ _id: userId });
  if (!user) {
    return res.status(404).json({ 
      success: false, 
      message: "Không tìm thấy người dùng" 
    });
  }

  // Reset trạng thái
  user.isLocked = false;
  user.rejectCount = 0;
  await user.save();

  res.json({ 
    success: true, 
    data: user 
  });
});
module.exports = { createOrder, getOrders , cancelOrder, updateOrderStatus, unlockUser };
