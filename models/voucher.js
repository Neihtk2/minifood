const mongoose = require("mongoose");
const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
const s3Client = require("../config/s3Client");

const voucherSchema = new mongoose.Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    image: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    discountType: {
        type: String,
        enum: ["percentage", "fixed"],
        required: true
    },
    value: {
        type: Number,
        required: true,
        min: 0
    },
    minOrderValue: {
        type: Number,
        required: true,
        min: 0
    },
    maxDiscountAmount: {
        type: Number,
        default: null
    },
    startDate: {
        type: Date,
        required: true
    },
    endDate: {
        type: Date,
        required: true,
        // index: { expires: 0 } // Thêm TTL index
    },
    maxUses: {
        type: Number,
        default: null
    },
    usedCount: {
        type: Number,
        default: 0
    },
    maxUsagePerUser: {
        type: Number,
        default: 1
    },
    usersUsage: [{
        userId: {
            // type: mongoose.Schema.Types.ObjectId,
            type: Number,
            ref: "User"
        },
        count: {
            type: Number,
            default: 0
        }
    }],
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });
voucherSchema.index({ endDate: 1 }, { expireAfterSeconds: 0 });

// Method kiểm tra lượt dùng còn lại
voucherSchema.methods.checkRemainingUses = function () {
    if (this.maxUses === null) return Infinity;
    return this.maxUses - this.usedCount;
};

// Method kiểm tra lượt dùng của user
voucherSchema.methods.checkUserUsage = function (userId) {
    const userUsage = this.usersUsage.find(u => u.userId === userId);
    return userUsage ? this.maxUsagePerUser - userUsage.count : this.maxUsagePerUser;
};
voucherSchema.pre('save', async function (next) {
    // Lấy ngày giờ hiện tại và format thành "dd/mm/yyyy"
    const now = new Date();
    const formattedDate = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()}`;
    this.createdAt = formattedDate;
    next();
});
voucherSchema.pre("remove", async function (next) {
    try {
        if (this.image) {
            const key = this.image.split("/").slice(3).join("/");
            await s3Client.send(
                new DeleteObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME,
                    Key: key
                })
            );
            console.log(`Đã xóa ảnh voucher ${this.code}`);
        }
    } catch (error) {
        console.error("Lỗi xóa ảnh:", error.message);
    }
    next();
});

module.exports = mongoose.model("Voucher", voucherSchema);