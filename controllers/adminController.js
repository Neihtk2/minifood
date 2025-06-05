const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Dish = require('../models/Dish');
const Order = require('../models/Order');
const Voucher = require('../models/voucher');

// 1. Quản lý người dùng
const getUsers = async (req, res) => {
    try {
        const users = await User.find();
        res.json(users);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách người dùng' });
    }
};

const deleteUser = async (req, res) => {
    try {
        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) return res.status(404).json({ message: 'Không tìm thấy người dùng' });
        res.json({ message: 'Xoá người dùng thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xoá người dùng' });
    }
};

const getUserProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        res.json(user);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thông tin người dùng' });
    }
};

const updateUserProfile = async (req, res) => {
    try {
        const updatedUser = await User.findByIdAndUpdate(req.user.id, req.body, { new: true });
        res.json(updatedUser);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật thông tin người dùng' });
    }
};

// 2. Quản lý món ăn
const getDishes = async (req, res) => {
    try {
        const dishes = await Dish.find();
        res.json(dishes);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách món ăn' });
    }
};

const createDish = async (req, res) => {
    const { name, price, description } = req.body;
    try {
        const newDish = new Dish({ name, price, description });
        await newDish.save();
        res.status(201).json(newDish);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi thêm món ăn' });
    }
};

const updateDish = async (req, res) => {
    try {
        const dish = await Dish.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!dish) return res.status(404).json({ message: 'Món ăn không tồn tại' });
        res.json(dish);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật món ăn' });
    }
};

const deleteDish = async (req, res) => {
    try {
        const dish = await Dish.findByIdAndDelete(req.params.id);
        if (!dish) return res.status(404).json({ message: 'Món ăn không tồn tại' });
        res.json({ message: 'Xoá món ăn thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xoá món ăn' });
    }
};

// 3. Quản lý đơn hàng
const getOrders = async (req, res) => {
    try {
        const orders = await Order.find();
        res.json(orders);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy danh sách đơn hàng' });
    }
};

const updateOrderStatus = async (req, res) => {
    try {
        const order = await Order.findByIdAndUpdate(req.params.id, { status: req.body.status }, { new: true });
        if (!order) return res.status(404).json({ message: 'Đơn hàng không tồn tại' });
        res.json(order);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi cập nhật trạng thái đơn hàng' });
    }
};

// 4. Thống kê thu nhập
const getStats = async (req, res) => {
    try {
        const totalIncome = await Order.aggregate([
            { $match: { status: 'completed' } },
            { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]);
        res.json({ totalIncome: totalIncome[0]?.total || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thống kê thu nhập' });
    }
};

// 5. Quản lý mã giảm giá (Voucher)
const createVoucher = async (req, res) => {
    const { code, discount, expiresAt } = req.body;
    try {
        const newVoucher = new Voucher({ code, discount, expiresAt });
        await newVoucher.save();
        res.status(201).json(newVoucher);
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi tạo mã giảm giá' });
    }
};

const deleteVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findByIdAndDelete(req.params.id);
        if (!voucher) return res.status(404).json({ message: 'Mã giảm giá không tồn tại' });
        res.json({ message: 'Xoá mã giảm giá thành công' });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi xoá mã giảm giá' });
    }
};

module.exports = {
    getUsers,
    deleteUser,
    getUserProfile,
    updateUserProfile,
    getDishes,
    createDish,
    updateDish,
    deleteDish,
    getOrders,
    updateOrderStatus,
    getStats,
    createVoucher,
    deleteVoucher,
};
