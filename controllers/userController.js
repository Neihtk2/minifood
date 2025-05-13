const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");
const User = require('../models/User');
const bcrypt = require('bcryptjs');
const asyncHandler = require('express-async-handler');
const validator = require('validator');
const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const generateFileName = (originalName) => {
  const ext = originalName.split(".").pop();
  return `dishes/${uuidv4()}.${ext}`;
};


const handleError = (res, statusCode, message) => {
  res.status(statusCode).json({
    success: false,
    message: message
  });
};


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
    }).select('-password').lean();

    if (!user) {
      return res.status(404).json({ message: 'Không tìm thấy người dùng' });
    }

    let imageUrl = user.image; // Sửa từ dish.image thành user.image
    const imageFile = req.file;

    // Xử lý ảnh mới
    if (imageFile) {
      // Xóa ảnh cũ nếu tồn tại
      if (user.image) {
        const oldImageKey = user.image.split('/').slice(3).join('/');
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: oldImageKey,
          })
        );
      }

      // Upload ảnh mới
      const fileName = generateFileName(imageFile.originalname);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          Body: imageFile.buffer,
          ContentType: imageFile.mimetype,
        })
      );
      imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    }

    // Lấy dữ liệu từ request
    const updates = {};
    if (req.body.email) {
      const email = req.body.email.toLowerCase();
      if (!validator.isEmail(email)) {
        return res.status(400).json({ message: 'Email không hợp lệ' });
      }

      const emailExists = await User.findOne({ email });
      if (emailExists && emailExists._id.toString() !== user._id.toString()) {
        return res.status(400).json({ message: 'Email này đã được sử dụng' });
      }
      updates.email = email;
    }

    if (req.body.name) updates.name = req.body.name;

    if (req.body.phone) {
      if (!validator.isMobilePhone(req.body.phone, 'vi-VN')) {
        return res.status(400).json({ message: 'Số điện thoại không hợp lệ' });
      }
      updates.phone = req.body.phone;
    }

    if (req.body.address) updates.address = req.body.address;
    if (imageFile) updates.image = imageUrl;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Không có thông tin nào để cập nhật' });
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      message: 'Cập nhật thông tin thành công',
      user: updatedUser
    });
  } catch (err) {
    console.error('Lỗi khi cập nhật profile:', err);
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