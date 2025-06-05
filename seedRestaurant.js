// require('dotenv').config(); // Load biến môi trường từ .env

// const mongoose = require('mongoose');
// const Restaurant = require('./models/Restaurant'); // Đường dẫn tới model Restaurant

// // Kiểm tra biến môi trường
// if (!process.env.MONGODB_URI) {
//     console.error("❌ Thiếu biến môi trường MONGO_URI trong file .env");
//     process.exit(1);
// }

// // Kết nối MongoDB
// mongoose.connect(process.env.MONGODB_URI, {
//     useNewUrlParser: true,
//     useUnifiedTopology: true,
// })
//     .then(async () => {
//         console.log("✅ Kết nối MongoDB thành công.");

//         const existing = await Restaurant.findOne();
//         if (existing) {
//             console.log("ℹ️ Đã có nhà hàng trong DB, không cần tạo thêm.");
//             return process.exit(0);
//         }

//         // Tạo bản ghi mới
//         await Restaurant.create({
//             name: "Nhà Hàng MiniFood",
//             address: "131 Trần Phú, Văn Quán, Hà Đông, Hà Nội",
//             phone: "0123456789",
//             description: "Nhà hàng chuyên món Việt truyền thống, nguyên liệu sạch.",
//             image: "https://via.placeholder.com/400x200.png?text=Restaurant+Image",
//             openHours: "08:00 - 22:00"
//         });

//         console.log("✅ Đã tạo bản ghi nhà hàng thành công.");
//         process.exit(0);
//     })
//     .catch((err) => {
//         console.error("❌ Lỗi kết nối MongoDB:", err.message);
//         process.exit(1);
//     });
