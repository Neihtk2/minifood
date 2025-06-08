const Voucher = require("../models/voucher");
const asyncHandler = require("express-async-handler");
const mongoose = require("mongoose");

const handleError = (res, statusCode, message) => {
    return res.status(statusCode).json({
        success: false,
        message: message
    });
};

// Tạo voucher (Admin)
const createVoucher = asyncHandler(async (req, res) => {
    const { code, value, minOrderValue, startDate, endDate, maxUses, maxUsagePerUser } = req.body;
    console.log("Received body:", req.body);

    // Validate input
    if (!code || !value || !minOrderValue || !startDate || !endDate) {
        return handleError(res, 400, "Thiếu trường bắt buộc!");
    }

    // Check existing voucher
    const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
    if (existingVoucher) {
        return handleError(res, 400, "Mã giảm giá đã tồn tại!");
    }

    try {
        // Sử dụng ảnh cố định
        const FIXED_IMAGE_URL = "https://img.gotit.vn/gotit_website_photos/4/cloud2/tang-voucher-cho-khach-hang-la-mot-hinh-thuc-cua-chuong-trinh-khuyen-mai.jpg";

        // Tạo voucher mới
        const voucher = await Voucher.create({
            code: code.toUpperCase(),
            value,
            minOrderValue,
            maxUses,
            maxUsagePerUser,
            startDate,
            endDate,
            image: FIXED_IMAGE_URL
        });

        res.status(201).json({
            success: true,
            data: voucher
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi tạo voucher: " + error.message
        });
    }
});

// Lấy tất cả voucher (Admin)
const getAllVouchers = asyncHandler(async (req, res) => {
    try {
        const vouchers = await Voucher.find().sort({ createdAt: -1 });
        res.json({
            success: true,
            count: vouchers.length,
            data: vouchers
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi lấy danh sách voucher"
        });
    }
});

// Cập nhật voucher (Admin)
const updateVoucher = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const updateData = req.body;

        const updatedVoucher = await Voucher.findByIdAndUpdate(
            id,
            updateData,
            { new: true, session }
        );

        if (!updatedVoucher) {
            await session.abortTransaction();
            return handleError(res, 404, "Không tìm thấy voucher");
        }

        await session.commitTransaction();
        res.json({
            success: true,
            data: updatedVoucher
        });

    } catch (error) {
        // await session.abortTransaction();
        res.status(500).json({
            success: false,
            message: "Lỗi cập nhật voucher: " + error.message
        });
    } finally {
        // session.endSession();
    }
});

// Xóa voucher (Admin)
const deleteVoucher = asyncHandler(async (req, res) => {
    try {
        const { id } = req.params;
        const deletedVoucher = await Voucher.findByIdAndDelete(id);

        if (!deletedVoucher) {
            return handleError(res, 404, "Không tìm thấy voucher");
        }

        res.json({
            success: true,
            message: "Xóa voucher thành công"
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi xóa voucher: " + error.message
        });
    }
});

// Lấy voucher khả dụng (User)
const getAvailableVouchers = asyncHandler(async (req, res) => {
    try {
        const userId = req.user._id;
        const { orderTotal } = req.query;
        const vouchers = await Voucher.find({
            isActive: true,
            startDate: { $lte: new Date() },
            endDate: { $gte: new Date() }
        });

        const availableVouchers = await Promise.all(
            vouchers.map(async voucher => {
                const remainingUses = voucher.maxUses ? voucher.maxUses - voucher.usedCount : Infinity;
                const userUsage = voucher.usersUsage.find(u => u.userId.equals(userId));
                const remainingUserUses = voucher.maxUsagePerUser - (userUsage?.count || 0);

                return {
                    ...voucher.toObject(),
                    remainingUses,
                    remainingUserUses,
                    isValid: orderTotal >= voucher.minOrderValue &&
                        remainingUses > 0 &&
                        remainingUserUses > 0
                };
            })
        );

        res.json({
            success: true,
            data: availableVouchers.filter(v => v.isValid)
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi lấy voucher khả dụng: " + error.message
        });
    }
});


const applyVoucher = asyncHandler(async (req, res) => {
    try {
        const { voucherCode } = req.body;
        const userId = req.user._id;

        console.log("➡️ Bắt đầu apply voucher:", voucherCode);
        console.log("🧑 User ID:", userId);

        // 1. Tìm voucher
        const voucher = await Voucher.findOne({
            code: voucherCode?.toUpperCase(),
            isActive: true
        });

        if (!voucher) {
            console.log("❌ Voucher không tồn tại hoặc không active");
            return res.status(404).json({
                success: false,
                message: "Mã giảm giá không tồn tại"
            });
        }

        console.log("✅ Voucher tìm thấy:", voucher.code);

        // 2. Kiểm tra thời gian
        const now = new Date();
        console.log("🕒 Thời gian hiện tại:", now);
        console.log("📅 Start:", voucher.startDate, " End:", voucher.endDate);

        if (now < voucher.startDate || now > voucher.endDate) {
            console.log("❌ Voucher hết hạn hoặc chưa bắt đầu");
            return res.status(400).json({
                success: false,
                message: "Mã giảm giá hết hạn"
            });
        }

        // 3. Kiểm tra lượt dùng của user
        const userUsage = voucher.usersUsage.find(
            u => u.userId.toString() === userId.toString()
        );

        console.log("🔁 User đã dùng voucher:", userUsage);

        if (
            userUsage &&
            voucher.maxUsagePerUser &&
            userUsage.count >= voucher.maxUsagePerUser
        ) {
            console.log("❌ User vượt quá số lần dùng");
            return res.status(400).json({
                success: false,
                message: "Bạn đã sử dụng mã này quá số lần cho phép"
            });

        }

        // 4. Cập nhật lượt dùng
        if (userUsage) {
            userUsage.count += 1;
            console.log("🔄 Tăng lượt dùng user:", userUsage.count);
        } else {
            voucher.usersUsage.push({ userId, count: 1 });
            console.log("➕ Thêm user mới vào danh sách sử dụng voucher");
        }

        voucher.usedCount += 1;
        console.log("📈 Tổng số lượt dùng voucher:", voucher.usedCount);

        await voucher.save();
        console.log("✅ Lưu voucher thành công");

        return res.status(200).json({
            success: true,
            message: "Áp dụng voucher thành công"
        });

    } catch (error) {
        console.log("💥 Lỗi áp dụng voucher:", error);
        return res.status(500).json({
            success: false,
            message: "Lỗi áp dụng voucher: " + error.message
        });
    }
});


module.exports = {
    createVoucher,
    getAllVouchers,
    updateVoucher,
    deleteVoucher,
    getAvailableVouchers,
    applyVoucher
};