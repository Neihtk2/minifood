const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Dish = require('../models/Dish');
const Order = require('../models/Order');
const Voucher = require('../models/voucher');

// 1. Quản lý người dùng
const getUsers = async (req, res) => {
    try {
        // Lấy page và limit từ query, mặc định nếu không có
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        // Lấy tổng số người dùng để tính totalPages
        const [users, totalCount] = await Promise.all([
            User.find().skip(skip).limit(limit),
            User.countDocuments()
        ]);

        res.json({
            success: true,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
            data: users
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách người dùng'
        });
    }
};
;

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
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [dishes, totalCount] = await Promise.all([
            Dish.find().sort({ name: 1 }).skip(skip).limit(limit),
            Dish.countDocuments()
        ]);

        res.json({
            success: true,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
            data: dishes
        });
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
// const getOrders = async (req, res) => {
//     try {
//         const page = parseInt(req.query.page) || 1;
//         const limit = parseInt(req.query.limit) || 10;
//         const skip = (page - 1) * limit;

//         const { search = "", status, startDate, endDate } = req.query;

//         const query = {};

//         if (search) {
//             const regex = new RegExp(search, "i");

//             // Kiểm tra xem search có phải là ObjectId hợp lệ không
//             const isObjectId = /^[0-9a-fA-F]{24}$/.test(search);

//             if (isObjectId) {
//                 query.$or = [
//                     { customerName: { $regex: regex } },
//                     { _id: search }  // tìm chính xác theo ObjectId
//                 ];
//             } else {
//                 query.customerName = { $regex: regex };
//             }
//         }


//         if (status && status !== "all") {
//             query.status = status;
//         }

//         if (startDate || endDate) {
//             query.createdAt = {};
//             if (startDate) query.createdAt.$gte = new Date(startDate);
//             if (endDate) query.createdAt.$lte = new Date(endDate);
//         }

//         const [orders, totalCount] = await Promise.all([
//             Order.find(query).skip(skip).limit(limit),
//             Order.countDocuments(query)
//         ]);

//         res.json({
//             success: true,
//             currentPage: page,
//             totalPages: Math.ceil(totalCount / limit),
//             totalItems: totalCount,
//             data: orders
//         });
//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: 'Lỗi khi lấy danh sách đơn hàng'
//         });
//     }
// };

const getOrders = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const { search = "", status, startDate, endDate } = req.query;

        const query = {};

        // Tìm kiếm theo tên khách hàng hoặc _id (chuỗi)
        if (search) {
            const regex = new RegExp(search, "i");
            query.$or = [
                { customerName: { $regex: regex } },
                {
                    // So sánh theo chuỗi ObjectId
                    _id: {
                        $in: await Order.find().select("_id").then(docs =>
                            docs
                                .filter(doc => doc._id.toString().includes(search))
                                .map(doc => doc._id)
                        )
                    }
                }
            ];
        }

        if (status && status !== "all") {
            query.status = status;
        }

        if (startDate || endDate) {
            query.createdAt = {};
            if (startDate) query.createdAt.$gte = new Date(startDate);
            if (endDate) query.createdAt.$lte = new Date(endDate);
        }

        const [orders, totalCount] = await Promise.all([
            Order.find(query).skip(skip).limit(limit),
            Order.countDocuments(query)
        ]);

        res.json({
            success: true,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            totalItems: totalCount,
            data: orders
        });
    } catch (error) {
        console.error(error)
        res.status(500).json({
            success: false,
            message: 'Lỗi khi lấy danh sách đơn hàng'
        });
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
            { $group: { _id: null, total: { $sum: '$total' } } }
        ]);
        res.json({ totalIncome: totalIncome[0]?.total || 0 });
    } catch (error) {
        res.status(500).json({ message: 'Lỗi khi lấy thống kê thu nhập' });
    }
};


// 5. Quản lý mã giảm giá (Voucher)
const getAllVouchers = async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ createdAt: -1 });
        res.json({ success: true, data: vouchers });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Không thể tải danh sách voucher' });
    }
};
const getVoucherById = async (req, res) => {
    try {
        const voucher = await Voucher.findById(req.params.id);
        if (!voucher) return res.status(404).json({ success: false, message: 'Voucher không tồn tại' });
        res.json(voucher);
    } catch (err) {
        res.status(500).json({ success: false, message: 'Lỗi server khi lấy voucher' });
    }
};


const createVoucher = async (req, res) => {
    try {
        const {
            code,
            description,
            value,
            minOrderValue,
            startDate,
            endDate,
            maxUses,
            maxUsagePerUser
        } = req.body;

        const newVoucher = new Voucher({
            code,
            description,
            value,
            minOrderValue,
            startDate,
            endDate,
            maxUses,
            maxUsagePerUser,
            usedCount: 0,
            isActive: true
        });

        await newVoucher.save();
        res.status(201).json({ success: true, data: newVoucher });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi tạo mã giảm giá' });
    }
};
const updateVoucher = async (req, res) => {
    try {
        const voucher = await Voucher.findByIdAndUpdate(req.params.id, req.body, {
            new: true,
            runValidators: true
        });
        if (!voucher) return res.status(404).json({ success: false, message: 'Mã giảm giá không tồn tại' });
        res.json({ success: true, data: voucher });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Lỗi khi cập nhật mã giảm giá' });
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
    updateVoucher,
    getAllVouchers,
    getVoucherById
};
