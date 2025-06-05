// routes/adminRoutes.js
const express = require('express');
const { protect, checkRole } = require('../utils/authMiddleware');  // Middleware bảo vệ
const {
    getDishes,
    getDishById,
    createDish,
    updateDish,
    deleteDish,
    getNewDishes,
    addRating
} = require('../controllers/dishController');
const upload = require('../utils/upload');

const {
    getUsers, deleteUser, updateUserProfile, getUserProfile,

    getOrders, updateOrderStatus, getStats, createVoucher, deleteVoucher
} = require('../controllers/adminController');  // Controller xử lý các hành động

const router = express.Router();

// 1. Quản lý người dùng
router.route('/users').get(protect, checkRole('admin'), getUsers);  // Lấy danh sách người dùng
router.route('/users/:id').delete(protect, checkRole('admin'), deleteUser);  // Xoá người dùng
router.route('/profile').get(protect, checkRole('admin'), getUserProfile).put(protect, checkRole('admin'), updateUserProfile);  // Cập nhật thông tin admin

// 2. Quản lý món ăn
router.route('/dishes').get(protect, checkRole('admin'), getDishes);  // Lấy danh sách món ăn
router.route('/dishes').post(protect, checkRole('admin'), upload.single('image'), createDish);  // Thêm món ăn
router.route('/dishes/:id').put(protect, checkRole('admin'), upload.single('image'), updateDish);  // Sửa món ăn
router.route('/dishes/:id').delete(protect, checkRole('admin'), deleteDish);  // Xoá món ăn

// 3. Quản lý đơn hàng
router.route('/orders').get(protect, checkRole('admin'), getOrders);  // Lấy danh sách đơn hàng
router.route('/orders/:id/status').patch(protect, checkRole('admin'), updateOrderStatus);  // Cập nhật trạng thái đơn hàng

// 4. Thống kê thu nhập
router.route('/stats').get(protect, checkRole('admin'), getStats);  // Thống kê doanh thu

// 5. Quản lý mã giảm giá (Voucher)
router.route('/vouchers').post(protect, checkRole('admin'), createVoucher);  // Tạo mã giảm giá
router.route('/vouchers/:id').delete(protect, checkRole('admin'), deleteVoucher);  // Xoá mã giảm giá

module.exports = router;
