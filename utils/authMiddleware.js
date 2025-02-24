const jwt = require('jsonwebtoken');
const User = require('../models/User');

const protect = async (req, res, next) => {
  let token;
  
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  if (!token) {
    return res.status(401).json({ 
      success: false, 
      message: 'Truy cập bị từ chối - Thiếu token' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const user = await User.findById(decoded.id)
      .select('-password')
      .lean();

    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: 'Người dùng không tồn tại' 
      });
    }

    // Thêm role vào request object
    req.user = {
      _id: user._id,
      role: user.role,
      ...user
    };

    next();
  } catch (err) {
    console.error('Lỗi xác thực:', err);
    res.status(401).json({ 
      success: false, 
      message: 'Token không hợp lệ',
      error: err.message 
    });
  }
};

// Middleware kiểm tra role linh hoạt
const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false,
        message: `Truy cập bị từ chối - Yêu cầu quyền ${roles.join(' hoặc ')}`
      });
    }
    next();
  };
};

module.exports = { protect, checkRole };