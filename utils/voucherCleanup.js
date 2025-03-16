const cron = require("node-cron");
const Voucher = require("../models/voucher");

const { s3Client, DeleteObjectCommand } = require("@aws-sdk/client-s3");

const cleanupExpiredVouchers = () => {
    // Chạy lúc 2h sáng hàng ngày
    cron.schedule("0 2 * * *", async () => {
        try {
            const now = new Date();
            const expiredVouchers = await Voucher.find({
                endDate: { $lte: now }
            });

            for (const voucher of expiredVouchers) {
                try {
                    // Xóa ảnh từ S3
                    if (voucher.image) {
                        const urlParts = voucher.image.split("/");
                        const key = urlParts.slice(3).join("/");

                        await s3Client.send(
                            new DeleteObjectCommand({
                                Bucket: process.env.S3_BUCKET_NAME,
                                Key: key
                            })
                        );
                    }

                    // Xóa voucher
                    await Voucher.findByIdAndDelete(voucher._id);
                    console.log(`Đã xóa voucher ${voucher.code}`);
                } catch (error) {
                    console.error(`Lỗi xóa voucher ${voucher.code}:`, error.message);
                }
            }

            console.log(`Đã xóa ${expiredVouchers.length} voucher hết hạn`);
        } catch (error) {
            console.error("Lỗi cron job:", error.message);
        }
    });
};

module.exports = { cleanupExpiredVouchers };