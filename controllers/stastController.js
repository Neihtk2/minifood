const Order = require('../models/Order');

const getStats = async (req, res) => {
    try {
        const { start, end } = req.query;
        const matchConditions = {};

        if (start && end) {
            matchConditions.createdAt = {
                $gte: new Date(start),
                $lte: new Date(end),
            };
        }

        // Tổng doanh thu từ đơn hoàn tất trong khoảng thời gian
        const completedOrders = await Order.find({ status: 'completed', ...matchConditions });
        const totalIncome = completedOrders.reduce((sum, o) => sum + o.total, 0);

        // Thống kê số đơn hàng theo trạng thái
        const statusCountsAgg = await Order.aggregate([
            { $match: matchConditions },
            {
                $group: {
                    _id: '$status',
                    count: { $sum: 1 }
                }
            }
        ]);
        const statusCounts = {};
        statusCountsAgg.forEach(s => {
            statusCounts[s._id] = s.count;
        });

        // Top 5 món ăn bán chạy (trong khoảng)
        const dishStats = await Order.aggregate([
            { $match: matchConditions },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.name',
                    totalSold: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);
        const topDishes = dishStats.map(d => ({ name: d._id, totalSold: d.totalSold }));

        // Doanh thu theo ngày
        const dailyAgg = await Order.aggregate([
            {
                $match: { status: 'completed', ...matchConditions }
            },
            {
                $group: {
                    _id: {
                        $dateToString: { format: '%Y-%m-%d', date: '$createdAt' }
                    },
                    total: { $sum: '$total' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        const dailyRevenue = dailyAgg.map(r => ({ date: r._id, total: r.total }));

        res.json({
            totalIncome,
            statusCounts,
            topDishes,
            dailyRevenue
        });
    } catch (err) {
        res.status(500).json({ message: 'Lỗi khi lấy thống kê', error: err.message });
    }
};

module.exports = { getStats };
