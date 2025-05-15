// controllers/orderController.js
const moment = require('moment');
const querystring = require('qs');
const crypto = require('crypto');
const Order = require("../models/Order");
const Voucher = require("../models/voucher");
const Cart = require("../models/Cart");
const asyncHandler = require("express-async-handler");
const User = require("../models/User");
// import moment from 'moment'
// import querystring from 'qs'
// import crypto, { verify } from 'crypto'




const createOrder = asyncHandler(async (req, res) => {
  try {
    const {
      customerName,
      phone,
      deliveryAddress,
      paymentMethod,
      orderTotal,
      voucherCode
    } = req.body;

    // Validate input
    if (!customerName || !phone || !deliveryAddress || !paymentMethod) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng điền đầy đủ thông tin"
      });
    }

    // Kiểm tra phương thức thanh toán
    if (!["cash", "cod"].includes(paymentMethod)) {

      return res.status(400).json({
        success: false,
        message: "Phương thức thanh toán không hợp lệ"
      });
    }

    // Lấy giỏ hàng
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart || cart.items.length === 0) {

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


    // Tạo đơn hàng
    const [order] = await Order.create([{
      userId: req.user._id,
      customerName,
      phone,
      deliveryAddress,
      paymentMethod,
      items: orderItems,
      // total: Number((orderTotal - discount).toFixed(2)),
      total: Number(orderTotal),
      voucher: voucherCode ? voucherCode.toUpperCase() : null,
      // voucher: voucherData
    }],);

    // Xóa giỏ hàng

    cart.items = [];
    await cart.save();



    res.status(201).json({
      success: true,
      data: order
    });

  } catch (error) {

    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message
    });
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
        // query.status = { $in: ['pending', 'processing', 'delivering', 'completed'] };
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
  if (!["admin", "staff", "shipper"].includes(role)) {
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
                averageRating: 1,  // Thêm averageRating
                ratingCount: 1,
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
          // _id: 0,
          _id: { $ifNull: ["$dishInfo._id", "N/A"] }, // Xử lý trường hợp không tìm thấy

          name: "$_id.name",
          price: "$_id.price",
          image: { $ifNull: ["$image", "$dishInfo.image"] }, // Ưu tiên ảnh từ Order
          // category: { $ifNull: ["$dishInfo.category", "Không xác định"] },
          category: { $ifNull: ["$dishInfo.category", "Không xác định"] },
          averageRating: { $ifNull: ["$dishInfo.averageRating", 0] },  // Thêm averageRating, mặc định 0 nếu không có
          ratingCount: { $ifNull: ["$dishInfo.ratingCount", 0] },      // Thêm ratingCount, mặc định 0 nếu không có
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
const acceptOrderForDelivery = asyncHandler(async (req, res) => {
  try {
    const { orderId } = req.params;
    const { phone: staffPhone, name: staffName } = req.user;

    // Kiểm tra quyền (chỉ nhân viên/staff mới được nhận đơn)
    if (req.user.role !== 'shipper') {
      return res.status(403).json({
        success: false,
        message: "Chỉ nhân viên được phép nhận đơn"
      });
    }

    // Tìm đơn hàng
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy đơn hàng"
      });
    }

    // Kiểm tra trạng thái đơn hàng
    if (order.status !== 'delivering') {
      return res.status(400).json({
        success: false,
        message: "Chỉ có thể nhận đơn hàng ở trạng thái 'đang xử lý'"
      });
    }

    // Kiểm tra nếu đơn đã có shipper khác
    if (order.shipper) {
      return res.status(400).json({
        success: false,
        message: "Đơn hàng đã được nhân viên khác nhận"
      });
    }

    // Cập nhật đơn hàng

    order.shipper = staffName;
    order.phoneShipper = staffPhone // hoặc có thể lưu staffId nếu cần
    await order.save();

    res.status(200).json({
      success: true,
      message: "Nhận đơn hàng thành công",
      data: order
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message
    });
  }
});
const getPendingDeliveryOrders = asyncHandler(async (req, res) => {
  try {
    // Chỉ nhân viên được phép
    if (req.user.role !== 'shipper') {
      return res.status(403).json({
        success: false,
        message: "Truy cập bị từ chối"
      });
    }

    const orders = await Order.find({
      status: { $regex: /^delivering$/i }, // Khớp không phân biệt chữ hoa/chữ thường
      $or: [
        { shipper: { $exists: false } },
        { shipper: null }
      ]
    }).sort({ createdAt: 1 });

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message
    });
  }
});
const getAcceptedDeliveryOrders = asyncHandler(async (req, res) => {
  try {
    // Chỉ nhân viên mới được phép
    if (req.user.role !== 'shipper') {
      return res.status(403).json({
        success: false,
        message: "Truy cập bị từ chối"
      });
    }

    const staffName = req.user.name; // hoặc req.user._id nếu anh lưu id shipper thay vì tên

    const orders = await Order.find({
      status: 'delivering',
      shipper: staffName,  // hoặc { $exists: true } nếu muốn tất cả đơn đã nhận, hoặc lọc theo staffName nếu mỗi nhân viên chỉ xem đơn mình nhận
    }).sort({ createdAt: -1 }); // Mới nhận trước

    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
});

const createPayment = (req, res) => {

  if (!req.query.amount) {
    return res.status(200).json({
      massege: 'Oh noooo',
    })
  }
  process.env.TZ = 'Asia/Ho_Chi_Minh';

  let date = new Date();
  let createDate = moment(date).format('YYYYMMDDHHmmss');

  let ipAddr = req.headers['x-forwarded-for'] ||
    req.connection.remoteAddress ||
    req.socket.remoteAddress ||
    req.connection.socket.remoteAddress;


  let tmnCode = "2F6F1CIB"
  let secretKey = "2M45F7AS2SP46SE6OI7PIFCEDLS9R36T"
  let vnpUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html"
  let returnUrl = "https://next-shop-gules.vercel.app/query-payment"
  let orderId = createDate
  let amount = req.query.amount
  let bankCode = "NCB"

  let locale = "vn";
  let currCode = 'VND';
  let vnp_Params = {};
  vnp_Params['vnp_Version'] = '2.1.0';
  vnp_Params['vnp_Command'] = 'pay';
  vnp_Params['vnp_TmnCode'] = tmnCode;
  vnp_Params['vnp_Locale'] = locale;
  vnp_Params['vnp_CurrCode'] = currCode;
  vnp_Params['vnp_TxnRef'] = orderId;
  vnp_Params['vnp_OrderInfo'] = 'Thanh toan cho ma GD:' + orderId;
  vnp_Params['vnp_OrderType'] = 'other';
  vnp_Params['vnp_Amount'] = amount * 100;
  vnp_Params['vnp_ReturnUrl'] = returnUrl;
  vnp_Params['vnp_IpAddr'] = ipAddr;
  vnp_Params['vnp_CreateDate'] = createDate;
  if (bankCode !== null && bankCode !== '') {
    vnp_Params['vnp_BankCode'] = bankCode;
  }

  vnp_Params = sortObject(vnp_Params);


  let signData = querystring.stringify(vnp_Params, { encode: false });
  let hmac = crypto.createHmac("sha512", secretKey);
  let signed = hmac.update(new Buffer(signData, 'utf-8')).digest("hex");
  vnp_Params['vnp_SecureHash'] = signed;
  vnpUrl += '?' + querystring.stringify(vnp_Params, { encode: false });

  return res.status(200).json({
    massege: 'OK',
    data: { vnpUrl, orderId, createDate }
  })
}

function sortObject(obj) {
  let sorted = {};
  let str = [];
  let key;
  for (key in obj) {
    if (obj.hasOwnProperty(key)) {
      str.push(encodeURIComponent(key));
    }
  }
  str.sort();
  for (key = 0; key < str.length; key++) {
    sorted[str[key]] = encodeURIComponent(obj[str[key]]).replace(/%20/g, "+");
  }
  return sorted;
}


module.exports = { createOrder, getOrders, cancelOrder, updateOrderStatus, unlockUser, getTopSoldDishes, acceptOrderForDelivery, getPendingDeliveryOrders, getAcceptedDeliveryOrders, createPayment };
