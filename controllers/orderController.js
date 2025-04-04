// controllers/orderController.js
const Order = require("../models/Order");
const Voucher = require("../models/voucher");
const Cart = require("../models/Cart");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");

// const createOrder = asyncHandler(async (req, res) => {
//   try {
//     const {
//       customerName,
//       phone,
//       deliveryAddress,
//       paymentMethod,
//       voucherCode
//     } = req.body;

//     // Validate input
//     if (!customerName || !phone || !deliveryAddress || !paymentMethod) {
//       return res.status(400).json({
//         success: false,
//         message: "Vui lòng điền đầy đủ thông tin"
//       });
//     }

//     // Kiểm tra phương thức thanh toán
//     if (!["cash", "cod"].includes(paymentMethod)) {
//       return res.status(400).json({
//         success: false,
//         message: "Phương thức thanh toán không hợp lệ"
//       });
//     }

//     // Lấy giỏ hàng
//     const cart = await Cart.findOne({ userId: req.user._id });
//     if (!cart || cart.items.length === 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Giỏ hàng trống"
//       });
//     }

//     // Tạo items từ giỏ hàng
//     const orderItems = cart.items.map(item => ({
//       name: item.name,
//       price: item.price,
//       image: item.image,
//       quantity: item.quantity,
//       category: item.category
//     }));

//     // Tính tổng tiền
//     const orderTotal = cart.items.reduce(
//       (sum, item) => sum + (item.price * item.quantity),
//       0
//     );
//     let discount = 0;
//     let voucherData = null;

//     if (voucherCode) {
//       const voucher = await Voucher.findOne({ code: voucherCode.toUpperCase() }).session(session);

//       // Kiểm tra voucher (tương tự như trong applyVoucher)
//       if (!voucher) {
//         await session.abortTransaction();
//         return res.status(404).json({
//           success: false,
//           message: "Mã giảm giá không tồn tại"
//         });
//       }

//       const now = new Date();
//       if (now < voucher.startDate || now > voucher.endDate) {
//         await session.abortTransaction();
//         return res.status(400).json({
//           success: false,
//           message: "Mã giảm giá không trong thời gian hiệu lực"
//         });
//       }

//       if (orderTotal < voucher.minOrderValue) {
//         await session.abortTransaction();
//         return res.status(400).json({
//           success: false,
//           message: `Đơn hàng tối thiểu ${voucher.minOrderValue} để áp dụng voucher`
//         });
//       }

//       // Tính toán giảm giá
//       if (voucher.discountType === "percentage") {
//         discount = orderTotal * (voucher.value / 100);
//         if (voucher.maxDiscountAmount && discount > voucher.maxDiscountAmount) {
//           discount = voucher.maxDiscountAmount;
//         }
//       } else {
//         discount = voucher.value;
//       }

//       // Cập nhật lượt dùng voucher
//       voucher.usedCount += 1;
//       voucher.usersUsage.push({ userId: req.user._id, count: 1 });
//       await voucher.save({ session });

//       voucherData = {
//         code: voucher.code,
//         discount,
//         voucherId: voucher._id
//       };
//     }


//     // Tạo đơn hàng
//     const order = await Order.create({
//       userId: req.user._id,
//       customerName,
//       phone,
//       deliveryAddress,
//       paymentMethod,
//       items: orderItems,
//       total:orderTotal- discount,
//       // finalTotal: orderTotal - discount,
//       voucher: voucherData
//     });

//     // Xóa giỏ hàng
//     await Cart.deleteOne({ _id: cart._id });

//     res.status(201).json({
//       success: true,
//       data: order
//     });

//   } catch (error) {
//     res.status(500).json({
//       success: false,
//       message: "Lỗi server: " + error.message
//     });
//   }
// });
const createOrder = asyncHandler(async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      customerName,
      phone,
      deliveryAddress,
      paymentMethod,
      voucherCode
    } = req.body;

    // Validate input
    if (!customerName || !phone || !deliveryAddress || !paymentMethod) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin"
      });
    }

    // Kiểm tra phương thức thanh toán
    if (!["cash", "cod"].includes(paymentMethod)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ"
      });
    }

    // Lấy giỏ hàng
    const cart = await Cart.findOne({ userId: req.user._id }).session(session);
    if (!cart || cart.items.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Giỏ hàng trống"
      });
    }

    // Tạo items từ giỏ hàng
    const orderItems = cart.items.map(item => ({
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
      category: item.category
    }));

    // Tính tổng tiền
    const orderTotal = cart.items.reduce(
      (sum, item) => sum + (item.price * item.quantity),
      0
    );

    let discount = 0;
    let voucherData = null;

    // Xử lý voucher
    if (voucherCode) {
      const voucher = await Voucher.findOne({
        code: voucherCode.toUpperCase()
      }).session(session);

      // Kiểm tra voucher tồn tại
      if (!voucher) {
        await session.abortTransaction();
        return res.status(404).json({
          success: false,
          message: "Mã giảm giá không tồn tại"
        });
      }

      // Kiểm tra thời hạn
      const now = new Date();
      if (now < voucher.startDate || now > voucher.endDate) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Mã giảm giá không trong thời gian hiệu lực"
        });
      }

      // Kiểm tra đơn hàng tối thiểu
      if (orderTotal < voucher.minOrderValue) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: `Đơn hàng tối thiểu ${voucher.minOrderValue} để áp dụng voucher`
        });
      }

      // Kiểm tra số lượt sử dụng
      if (voucher.usedCount >= voucher.maxUsage) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Voucher đã hết lượt sử dụng"
        });
      }

      // Kiểm tra số lượt sử dụng của user
      const userUsage = voucher.usersUsage.find(usage =>
        usage.userId.equals(req.user._id)
      );
      if (userUsage && userUsage.count >= voucher.maxUsagePerUser) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          message: "Bạn đã dùng hết lượt cho voucher này"
        });
      }

      // Tính toán giảm giá

      if (orderTotal >= voucher.minOrderValue) {
        discount = voucher.maxDiscountAmount;
      } else {
        discount = 0;
      }

      // Cập nhật voucher
      voucher.usedCount += 1;
      if (userUsage) {
        userUsage.count += 1;
      } else {
        voucher.usersUsage.push({
          userId: req.user._id,
          count: 1
        });
      }
      await voucher.save({ session });

      voucherData = {
        code: voucher.code,
        discount: discount,
        voucherId: voucher._id
      };
    }

    // Tạo đơn hàng
    const [order] = await Order.create([{
      userId: req.user._id,
      customerName,
      phone,
      deliveryAddress,
      paymentMethod,
      items: orderItems,
      total: Number((orderTotal - discount).toFixed(2)),
      voucher: voucherData
    }], { session });

    // Xóa giỏ hàng

    cart.items = [];
    await cart.save({ session });

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      data: order
    });

  } catch (error) {
    await session.abortTransaction();
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message
    });
  } finally {
    session.endSession();
  }
});
const getOrders = asyncHandler(async (req, res) => {
  try {
    let query = {};
    const userRole = req.user.role;
    const userId = req.user._id;

    // Xử lý phân quyền
    switch (userRole) {
      case 'user':
        query.userId = userId;
        break;

      case 'staff':
        query.status = { $in: ['pending', 'processing', 'delivering', 'completed'] };
        break;

      case 'admin':
        // Không thêm điều kiện
        break;

      default:
        return res.status(403).json({
          success: false,
          message: "Truy cập bị từ chối"
        });
    }

    // Thêm khả năng lọc theo trạng thái (nếu cần)
    if (req.query.status) {
      query.status = req.query.status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({
      success: true,
      data: orders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message
    });
  }
});
const cancelOrder = asyncHandler(async (req, res) => {
  try {
    const orderId = req.params.id;
    const { _id: userId, role } = req.user;

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra quyền hủy
    const isOwner = order.userId.toString() === userId.toString();
    const isAdminStaff = ['admin', 'staff'].includes(role);

    if (!isOwner && !isAdminStaff) {
      return res.status(403).json({
        success: false,
        message: "Không có quyền thực hiện thao tác này"
      });
    }

    // Kiểm tra trạng thái
    if (order.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể hủy đơn hàng ở trạng thái chờ xử lý"
      });
    }

    // Cập nhật trạng thái
    const updatedOrder = await Order.findByIdAndUpdate(
      orderId,
      { status: 'cancelled' },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      message: "Hủy đơn hàng thành công",
      data: updatedOrder
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message
    });
  }
});
const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const { role } = req.user;

  // Chỉ admin/staff được cập nhật
  if (!["admin", "staff"].includes(role)) {
    return res.status(403).json({
      success: false,
      message: "Truy cập bị từ chối"
    });
  }

  const order = await Order.findById(id);
  if (!order) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy đơn hàng"
    });
  }

  // Cập nhật trạng thái
  order.status = status;
  await order.save();

  // Xử lý nếu trạng thái là rejected
  if (status === "rejected") {
    const user = await User.findOne({ _id: order.userId });
    user.rejectCount += 1;

    if (user.rejectCount >= 3) {
      user.isLocked = true;
    }

    await user.save();
  }

  res.json({
    success: true,
    data: order
  });
});
const unlockUser = asyncHandler(async (req, res) => {
  const { userId } = req.params;

  // Chỉ admin được phép
  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      message: "Truy cập bị từ chối"
    });
  }

  const user = await User.findOne({ _id: userId });
  if (!user) {
    return res.status(404).json({
      success: false,
      message: "Không tìm thấy người dùng"
    });
  }

  // Reset trạng thái
  user.isLocked = false;
  user.rejectCount = 0;
  await user.save();

  res.json({
    success: true,
    data: user
  });
});
const getTopSoldDishes = asyncHandler(async (req, res) => {
  try {
    let { limit, startDate, endDate } = req.query;
    const parsedLimit = limit ? parseInt(limit) : 60;
    const finalLimit = Number.isInteger(parsedLimit) && parsedLimit > 0 ? parsedLimit : 60;
    if (!startDate || !endDate) {
      const now = new Date();
      endDate = endDate || now.toISOString();
      startDate = startDate || new Date(now.setDate(now.getDate() - 30)).toISOString();
    }
    // Validate date parameters
    if (startDate && isNaN(new Date(startDate))) {
      return res.status(400).json({ success: false, message: "startDate không hợp lệ" });
    }
    if (endDate && isNaN(new Date(endDate))) {
      return res.status(400).json({ success: false, message: "endDate không hợp lệ" });
    }
    if ((startDate && !endDate) || (!startDate && endDate)) {
      return res.status(400).json({ success: false, message: "Cần cung cấp cả startDate và endDate" });
    }
    if (startDate && endDate && new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ success: false, message: "startDate phải nhỏ hơn endDate" });
    }

    const pipeline = [
      // Bước 1: Lọc đơn hàng đã hoàn thành và theo thời gian
      {
        $match: {
          status: "completed",
          ...(startDate && endDate && {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate),
            },
          }),
        },
      },

      // Bước 2: Mở rộng mảng items
      { $unwind: "$items" },

      // Bước 3: Nhóm theo name và price để tránh trùng lặp
      {
        $group: {
          _id: {
            name: "$items.name",
            price: "$items.price",
          },
          totalSold: { $sum: "$items.quantity" },
          totalRevenue: { $sum: { $multiply: ["$items.price", "$items.quantity"] } },
          image: { $first: "$items.image" }, // Giữ lại ảnh từ Order
        },
      },

      // Bước 4: Join với collection Dish dựa trên name và price
      // {
      //   $lookup: {
      //     from: "dishes",
      //     let: { itemName: "$_id.name", itemPrice: "$_id.price" },
      //     pipeline: [
      //       {
      //         $match: {
      //           $expr: {
      //             $and: [
      //               { $eq: ["$name", "$$itemName"] },
      //               { $eq: ["$price", "$$itemPrice"] },
      //             ],
      //           },
      //         },
      //       },
      //     ],
      //     as: "dishInfo",
      //   },
      // },
      {
        $lookup: {
          from: "dishes",
          let: { itemName: "$_id.name", itemPrice: { $toDouble: "$_id.price" } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ["$name", "$$itemName"] },
                    { $eq: ["$price", "$$itemPrice"] },
                  ],
                },
              },
            },
            {
              $project: {
                _id: 1,
                category: 1,
                // image: 1, // Nếu muốn ưu tiên ảnh từ Dish
              },
            },
          ],
          as: "dishInfo",
        },
      },


      // Bước 5: Mở rộng và định dạng kết quả
      { $unwind: { path: "$dishInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          _id: 0,
          // dishId: { $ifNull: ["$dishInfo._id", "N/A"] }, // Xử lý trường hợp không tìm thấy
          name: "$_id.name",
          price: "$_id.price",
          image: { $ifNull: ["$image", "$dishInfo.image"] }, // Ưu tiên ảnh từ Order
          // category: { $ifNull: ["$dishInfo.category", "Không xác định"] },
          category: { $ifNull: ["$dishInfo.category", "Không xác định"] },
          totalSold: 1,
          totalRevenue: 1,
        },
      },

      // Bước 6: Sắp xếp và giới hạn kết quả
      { $sort: { totalSold: -1 } },
      { $limit: finalLimit },
    ];

    const topDishes = await Order.aggregate(pipeline);

    res.status(200).json({
      success: true,
      count: topDishes.length,
      data: topDishes,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
});
module.exports = { createOrder, getOrders, cancelOrder, updateOrderStatus, unlockUser, getTopSoldDishes };
