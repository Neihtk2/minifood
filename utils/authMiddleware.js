const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Truy cập bị từ chối - Thiếu token",
    });
  }

  try {
    // Giải mã token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Ép kiểu ID sang số
    const userId = Number(decoded.id);
    if (isNaN(userId)) {
      return res.status(401).json({
        success: false,
        message: "Token không hợp lệ",
      });
    }

    // Tìm user bằng _id kiểu số
    const user = await User.findOne({ _id: userId })
      .select("-password")
      .lean();

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Người dùng không tồn tại",
      });
    }

    // Gán thông tin user vào request
    req.user = {
      _id: user._id,
      role: user.role,
      email: user.email,
      name: user.name,
      // Chỉ thêm các trường tồn tại trong model
      ...(user.phone && { phone: user.phone }),
      ...(user.address && { address: user.address }),
      isLocked: user.isLocked,
    };
    console.log("[DEBUG] Decoded token:", decoded);
    console.log("[DEBUG] User found:", user);
    next();
  } catch (err) {
    console.error("Lỗi xác thực:", err);
    res.status(401).json({
      success: false,
      message: "Token không hợp lệ",
    });
  }
};

// Middleware phân quyền

const checkRole = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role?.toLowerCase())) { 
      console.log("[DEBUG] User role:", req.user.role);
console.log("[DEBUG] Required roles:", roles);// Thêm toLowerCase()
      return res.status(403).json({ 
        success: false,
        message: `Truy cập bị từ chối - Yêu cầu quyền ${roles.join(' hoặc ')}`
      });
    }
    
    next();
  };
  
};

module.exports = { protect, checkRole };