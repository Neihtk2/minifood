// const Voucher = require("../models/voucher");
// const asyncHandler = require("express-async-handler");
// // Tạo voucher (Admin only)
// const createVoucher = asyncHandler(async (req, res) => {
//     try {
//         const {
//             code,
//             discountType,
//             value,
//             minOrderValue,
//             maxDiscountAmount,
//             startDate,
//             endDate,
//             maxUses,
//             maxUsagePerUser
//         } = req.body;

//         // Validate input
//         if (!code || !discountType || !value || !minOrderValue || !startDate || !endDate) {
//             return res.status(400).json({
//                 success: false,
//                 message: "Thiếu thông tin bắt buộc"
//             });
//         }

//         // Tạo voucher
//         const voucher = await Voucher.create({
//             code: code.toUpperCase(),
//             discountType,
//             value,
//             minOrderValue,
//             maxDiscountAmount,
//             startDate: new Date(startDate),
//             endDate: new Date(endDate),
//             maxUses,
//             maxUsagePerUser
//         });

//         res.status(201).json({
//             success: true,
//             data: voucher
//         });

//     } catch (error) {
//         res.status(500).json({
//             success: false,
//             message: "Lỗi server: " + error.message
//         });
//     }
// });

// // Áp dụng voucher
// const applyVoucher = asyncHandler(async (req, res) => {
//     const session = await mongoose.startSession();
//     session.startTransaction();

//     try {
//         const { voucherCode, orderTotal } = req.body;
//         const userId = req.user._id;

//         // Tìm voucher
//         const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() }).session(session);

//         // Kiểm tra tồn tại
//         if (!voucher) {
//             await session.abortTransaction();
//             return res.status(404).json({
//                 success: false,
//                 message: "Mã giảm giá không tồn tại"
//             });
//         }

//         // Kiểm tra điều kiện
//         const now = new Date();
//         if (now < voucher.startDate || now > voucher.endDate) {
//             await session.abortTransaction();
//             return res.status(400).json({
//                 success: false,
//                 message: "Mã giảm giá không trong thời gian hiệu lực"
//             });
//         }

//         if (orderTotal < voucher.minOrderValue) {
//             await session.abortTransaction();
//             return res.status(400).json({
//                 success: false,
//                 message: `Đơn hàng tối thiểu ${voucher.minOrderValue} để áp dụng voucher`
//             });
//         }

//         // Kiểm tra lượt dùng toàn hệ thống
//         if (voucher.checkRemainingUses() <= 0) {
//             await session.abortTransaction();
//             return res.status(400).json({
//                 success: false,
//                 message: "Mã giảm giá đã hết lượt sử dụng"
//             });
//         }

//         // Kiểm tra lượt dùng của user
//         const remainingUserUses = voucher.checkUserUsage(userId);
//         if (remainingUserUses <= 0) {
//             await session.abortTransaction();
//             return res.status(400).json({
//                 success: false,
//                 message: "Bạn đã sử dụng hết lượt cho mã này"
//             });
//         }

//         // Tính toán giảm giá
//         let discount = 0;
//         if (voucher.discountType === "percentage") {
//             discount = orderTotal * (voucher.value / 100);
//             if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
//                 discount = voucher.maxDiscountAmount;
//             }
//         } else {
//             discount = voucher.value;
//         }

//         // Cập nhật lượt dùng
//         voucher.usedCount += 1;

//         const userUsageIndex = voucher.usersUsage.findIndex(u => u.userId.equals(userId));
//         if (userUsageIndex === -1) {
//             voucher.usersUsage.push({ userId, count: 1 });
//         } else {
//             voucher.usersUsage[userUsageIndex].count += 1;
//         }

//         await voucher.save({ session });
//         await session.commitTransaction();

//         res.json({
//             success: true,
//             discount,
//             finalTotal: orderTotal - discount,
//             remainingUses: voucher.checkRemainingUses(),
//             remainingUserUses: remainingUserUses - 1
//         });

//     } catch (error) {
//         await session.abortTransaction();
//         res.status(500).json({
//             success: false,
//             message: "Lỗi áp dụng voucher: " + error.message
//         });
//     } finally {
//         session.endSession();
//     }
// });

// module.exports = {
//     createVoucher,
//     applyVoucher
// };

const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const Voucher = require("../models/voucher");
const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");
const mongoose = require("mongoose");

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});
const handleError = (res, statusCode, message) => {
    return res.status(statusCode).json({
        success: false,
        message: message
    });
};

// Helper functions
const generateFileName = (originalName) => {
    const ext = originalName.split(".").pop();
    return `vouchers/${uuidv4()}.${ext}`;
};

const uploadImageToS3 = async (file) => {
    const fileName = generateFileName(file.originalname);
    await s3Client.send(
        new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        })
    );
    return `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
};

const deleteImageFromS3 = async (imageUrl) => {
    if (!imageUrl) return;
    const urlParts = imageUrl.split('/');
    const imageKey = urlParts.slice(3).join('/');
    await s3Client.send(
        new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: imageKey,
        })
    );
};

// Tạo voucher (Admin)
const createVoucher = asyncHandler(async (req, res) => {
    // const session = await mongoose.startSession();
    // session.startTransaction();
    const { code, discountType, value, minOrderValue, startDate, endDate, maxUses, maxUsagePerUser } = req.body;
    if (!code || !discountType || !value || !minOrderValue || !startDate || !endDate) {
        return res.status(400).json({
            success: false,
            message: "Thiếu trường bắt buộc!"
        });
    }
    const existingVoucher = await Voucher.findOne({ code: code.toUpperCase() });
    if (existingVoucher) {
        return res.status(400).json({
            success: false,
            message: "Mã giảm giá đã tồn tại, vui lòng chọn mã khác!"
        });
    }
    try {
        const imageFile = req.file;

        if (!imageFile) {
            return handleError(res, 400, "Vui lòng chọn ảnh");
        }
        // Upload image
        let imageUrl = "";
        if (imageFile) {
            imageUrl = await uploadImageToS3(imageFile);
        }

        // Create voucher
        const voucher = await Voucher.create([{
            code,
            discountType,
            value,
            minOrderValue,
            maxUses,
            maxUsagePerUser,
            startDate,
            endDate,
            image: imageUrl
        }],);
        res.status(201).json({
            success: true,
            data: voucher[0]
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Lỗi tạo voucher: " + error.message
        });
    }
});


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


const updateVoucher = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const imageFile = req.file;
        const updateData = JSON.parse(req.body.data || '{}');

        const voucher = await Voucher.findById(id).session(session);
        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy voucher"
            });
        }

        // Update image
        if (imageFile) {
            await deleteImageFromS3(voucher.image);
            const newImageUrl = await uploadImageToS3(imageFile);
            updateData.image = newImageUrl;
        }

        // Update data
        const updatedVoucher = await Voucher.findByIdAndUpdate(
            id,
            { ...updateData, code: updateData.code?.toUpperCase() },
            { new: true, session }
        );

        await session.commitTransaction();

        res.json({
            success: true,
            data: updatedVoucher
        });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({
            success: false,
            message: "Lỗi cập nhật voucher: " + error.message
        });
    } finally {
        session.endSession();
    }
});

// Xóa voucher (Admin)
const deleteVoucher = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { id } = req.params;
        const voucher = await Voucher.findById(id).session(session);

        if (!voucher) {
            return res.status(404).json({
                success: false,
                message: "Không tìm thấy voucher"
            });
        }

        // Xóa ảnh từ S3
        await deleteImageFromS3(voucher.image);

        // Xóa voucher
        await Voucher.findByIdAndDelete(id).session(session);

        await session.commitTransaction();

        res.json({
            success: true,
            message: "Xóa voucher thành công"
        });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({
            success: false,
            message: "Lỗi xóa voucher: " + error.message
        });
    } finally {
        session.endSession();
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
// Áp dụng voucher
const applyVoucher = asyncHandler(async (req, res) => {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
        const { voucherCode, orderTotal } = req.body;
        const userId = req.user._id;

        // Tìm voucher
        const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() }).session(session);

        // Kiểm tra tồn tại
        if (!voucher) {
            await session.abortTransaction();
            return res.status(404).json({
                success: false,
                message: "Mã giảm giá không tồn tại"
            });
        }

        // Kiểm tra điều kiện
        const now = new Date();
        if (now < voucher.startDate || now > voucher.endDate) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Mã giảm giá không trong thời gian hiệu lực"
            });
        }

        if (orderTotal < voucher.minOrderValue) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: `Đơn hàng tối thiểu ${voucher.minOrderValue} để áp dụng voucher`
            });
        }

        // Kiểm tra lượt dùng toàn hệ thống
        if (voucher.checkRemainingUses() <= 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Mã giảm giá đã hết lượt sử dụng"
            });
        }

        // Kiểm tra lượt dùng của user
        const remainingUserUses = voucher.checkUserUsage(userId);
        if (remainingUserUses <= 0) {
            await session.abortTransaction();
            return res.status(400).json({
                success: false,
                message: "Bạn đã sử dụng hết lượt cho mã này"
            });
        }

        // Tính toán giảm giá
        let discount = 0;
        if (voucher.discountType === "percentage") {
            discount = orderTotal * (voucher.value / 100);
            if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
                discount = voucher.maxDiscountAmount;
            }
        } else {
            discount = voucher.value;
        }

        // Cập nhật lượt dùng
        voucher.usedCount += 1;

        const userUsageIndex = voucher.usersUsage.findIndex(u => u.userId.equals(userId));
        if (userUsageIndex === -1) {
            voucher.usersUsage.push({ userId, count: 1 });
        } else {
            voucher.usersUsage[userUsageIndex].count += 1;
        }

        await voucher.save({ session });
        await session.commitTransaction();

        res.json({
            success: true,
            discount,
            finalTotal: orderTotal - discount,
            remainingUses: voucher.checkRemainingUses(),
            remainingUserUses: remainingUserUses - 1
        });

    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({
            success: false,
            message: "Lỗi áp dụng voucher: " + error.message
        });
    } finally {
        session.endSession();
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