// controllers/userController.js
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const validator = require('validator');

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user._id // Sửa thành object query
    })
      .select('-password')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false, // Thêm trạng thái success
        message: 'Không tìm thấy người dùng'
      });
    }

    res.json({
      success: true,
      data: user // Format response thống nhất
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: 'Lỗi máy chủ, vui lòng thử lại sau'
    });
  }
});


// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateUserProfile = asyncHandler(async (req, res) => {
  try {
    const user = await User.findOne({
      _id: req.user._id
    }).select('-password')
      .lean();;
    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    // Lấy dữ liệu từ request (chỉ lấy các trường có truyền lên)
    const updates = {};
    if (req.body.email) {
      const email = req.body.email.toLowerCase();
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: 'Email không hợp lệ' });
      }

      // Kiểm tra email đã tồn tại chưa (không cập nhật nếu email đã thuộc người khác)
      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Email này đã được sử dụng' });
      }
      updates.email = email;
    }
    if (req.body.name) {
      updates.name = req.body.name;
    }
    if (req.body.phone) {
      if (!validator.isMobilePhone(req.body.phone, 'vi-VN')) {
        return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
      }
      updates.phone = req.body.phone;
    }

    if (req.body.address) {
      updates.address = req.body.address;
    }

    // Kiểm tra nếu không có trường nào được gửi lên để cập nhật
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật' });
    }

    // Cập nhật thông tin người dùng
    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, { new: true });

    res.json({
      message: 'Cập nhật thông tin thành công',
      _id: updatedUser._id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role,
      phone: updatedUser.phone,
      address: updatedUser.address
    });
  } catch (err) {
    res.status(500).json({ message: 'Lỗi máy chủ, vui lòng thử lại sau' });
  }
});


// @desc    Get all users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = asyncHandler(async (req, res) => {
  const users = await User.find({})
    .select('-password')
    .lean();
  res.json(users);
});
const changePassword = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: 'Vui lòng nhập đầy đủ mật khẩu hiện tại và mật khẩu mới' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ message: 'Mật khẩu mới phải có ít nhất 6 ký tự' });
  }

  const user = await User.findById(req.user._id);

  if (!user) {
    return res.status(404).json({ message: 'Người dùng không tồn tại' });
  }

  const isMatch = await bcrypt.compare(currentPassword, user.password);

  if (!isMatch) {
    return res.status(400).json({ message: 'Mật khẩu hiện tại không đúng' });
  }
  const isSame = await bcrypt.compare(newPassword, user.password);
  if (isSame) {
    return res.status(400).json({ message: 'Mật khẩu mới không được trùng với mật khẩu hiện tại' });
  }


  const hashed = await bcrypt.hash(newPassword, 10);
  user.password = hashed;
  await user.save();

  res.json({ message: 'Đổi mật khẩu thành công' });
});
module.exports = {
  getUserProfile,
  updateUserProfile,
  getUsers,
  changePassword
};