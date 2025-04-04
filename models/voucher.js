const mongoose = require("mongoose");
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
        default: 0
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
;

module.exports = mongoose.model("Voucher", voucherSchema);