// routes/adminRoutes.js
const express = require('express');
const { protect, checkRole } = require('../utils/authMiddleware');  // Middleware bảo vệ
const { getStats } = require('../controllers/stastController');
const {

    getDishById,
    createDish,
    updateDish,
    deleteDish,
    getNewDishes,

} = require('../controllers/dishController');
const {
    getUserProfile,
    updateUserProfile,
    changePassword
} = require('../controllers/userController');

const upload = require('../utils/upload');
const { updateOrderStatus } = require('../controllers/orderController');
const {
    getUsers, deleteUser, getDishes,

    getOrders, createVoucher, deleteVoucher, updateVoucher, getAllVouchers, getVoucherById
} = require('../controllers/adminController');  // Controller xử lý các hành động

const router = express.Router();

// 1. Quản lý người dùng
router.route('/users').get(protect, checkRole('admin'), getUsers);  // Lấy danh sách người dùng
router.route('/users/:id').delete(protect, checkRole('admin'), deleteUser);  // Xoá người dùng
router.route('/profile').get(protect, getUserProfile).put(protect, updateUserProfile);  // Cập nhật thông tin admin
router.route('/change-password').post(protect, changePassword);  // Đổi mật khẩu admin
// 2. Quản lý món ăn
router.route('/dishes').get(protect, checkRole('admin'), getDishes);  // Lấy danh sách món ăn
router.route('/dishes').post(protect, checkRole('admin'), upload.single('image'), createDish);  // Thêm món ăn
router.route('/dishes/:id').put(protect, checkRole('admin'), upload.single('image'), updateDish).get(protect, getDishById);  // Sửa món ăn
router.route('/dishes/:id').delete(protect, checkRole('admin'), deleteDish);  // Xoá món ăn

// 3. Quản lý đơn hàng
router.route('/orders').get(protect, checkRole('admin'), getOrders);  // Lấy danh sách đơn hàng
router.route('/orders/:id/status').patch(protect, checkRole('admin'), updateOrderStatus);  // Cập nhật trạng thái đơn hàng

// 4. Thống kê thu nhập
router.route('/stats').get(protect, checkRole('admin'), getStats);  // Thống kê doanh thu

// 5. Quản lý mã giảm giá (Voucher)
router.route('/vouchers').post(protect, checkRole('admin'), createVoucher).get(protect, checkRole('admin'), getAllVouchers);  // Tạo mã giảm giá
router.route('/vouchers/:id').delete(protect, checkRole('admin'), deleteVoucher).put(protect, checkRole('admin'), updateVoucher);;  // Xoá mã giảm giá
router
    .route('/vouchers/:id')
    .put(protect, checkRole('admin'), updateVoucher).get(protect, checkRole('admin'), getVoucherById);


module.exports = router;
