const Restaurant = require("../models/Restaurant");
const asyncHandler = require("express-async-handler");

// Helper báo lỗi chuẩn
const handleError = (res, code, message) => {
    res.status(code).json({ success: false, message });
};

// Lấy thông tin nhà hàng (bản ghi đầu tiên trong DB)
const getRestaurant = asyncHandler(async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne();
        if (!restaurant) return handleError(res, 404, "Chưa có thông tin nhà hàng");

        res.json({
            success: true,
            data: restaurant,
        });
    } catch (error) {
        handleError(res, 500, `Lỗi khi lấy thông tin nhà hàng: ${error.message}`);
    }
});

// Tạo mới nhà hàng (chỉ khi chưa có)
const createRestaurant = asyncHandler(async (req, res) => {
    const { name, address, phone, description, image, openHours } = req.body;

    const existing = await Restaurant.findOne();
    if (existing) return handleError(res, 400, "Nhà hàng đã tồn tại");

    if (!name) return handleError(res, 400, "Tên nhà hàng là bắt buộc");

    try {
        const restaurant = await Restaurant.create({
            name,
            address,
            phone,
            description,
            image,
            openHours,
        });

        res.status(201).json({
            success: true,
            message: "Tạo nhà hàng thành công",
            data: restaurant,
        });
    } catch (error) {
        handleError(res, 500, `Lỗi khi tạo nhà hàng: ${error.message}`);
    }
});

// Cập nhật thông tin nhà hàng
const updateRestaurant = asyncHandler(async (req, res) => {
    try {
        const restaurant = await Restaurant.findOne();
        if (!restaurant) return handleError(res, 404, "Chưa có nhà hàng để cập nhật");

        const { name, address, phone, description, image, openHours } = req.body;

        if (name) restaurant.name = name;
        if (address) restaurant.address = address;
        if (phone) restaurant.phone = phone;
        if (description) restaurant.description = description;
        if (image) restaurant.image = image;
        if (openHours) restaurant.openHours = openHours;

        await restaurant.save();

        res.json({
            success: true,
            message: "Cập nhật nhà hàng thành công",
            data: restaurant,
        });
    } catch (error) {
        handleError(res, 500, `Lỗi khi cập nhật nhà hàng: ${error.message}`);
    }
});

module.exports = {
    getRestaurant,
    createRestaurant,
    updateRestaurant,
};
