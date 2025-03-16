// utils/upload.js (Tạo file mới)
const multer = require("multer")
const upload = multer({
  limits: { fileSize: 5 * 1024 * 1024 }, // Giới hạn 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true)
    } else {
      cb(new Error("Chỉ được upload file ảnh!"), false)
    }
  },
});

module.exports = upload