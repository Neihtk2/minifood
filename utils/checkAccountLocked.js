// // middlewares/accountMiddleware.js
// const asyncHandler = require("express-async-handler");
// const User = require('../models/User');

// const checkAccountLock = asyncHandler(async (req, res, next) => {
//     const user = await User.findOne({ _id: req.user._id });
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: "Người dùng không tồn tại"
//       });
//     }
    
//     if (user.isLocked) {
//       return res.status(403).json({
//         success: false,
//         message: "Tài khoản đã bị khóa"
//       });
//     }
    
//     next();
//   });
  
// module.exports = { checkAccountLock };
const asyncHandler = require("express-async-handler");

const checkAccountLock = asyncHandler(async (req, res, next) => {
    // Kiểm tra req.user đã được khởi tạo chưa
    if (!req.user) {
        return res.status(401).json({
            success: false,
            message: "Bạn chưa đăng nhập"
        });
    }

    // Kiểm tra tài khoản có bị khóa không
    if (req.user.isLocked) {
        return res.status(403).json({
            success: false,
            message: "Tài khoản đã bị khóa"
        });
    }

    next();
});

module.exports = { checkAccountLock };
