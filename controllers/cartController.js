const Cart = require('../models/Cart');
const Dish = require('../models/Dish');
const asyncHandler = require('express-async-handler');

// @desc    Thêm món vào giỏ hàng
// @route   POST /api/cart
// @access  Private/User
// controllers/cartController.js
const addToCart = asyncHandler(async (req, res) => {
  const { dishId, quantity } = req.body;

  // Validate input
  if (!dishId || !quantity) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp ID món và số lượng",
    });
  }

  try {
    // Tìm món ăn bằng ID
    const dish = await Dish.findById(dishId).select('name price image category')
    if (!dish) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy món ăn",
      });
    }

    // Tìm hoặc tạo giỏ hàng
    let cart = await Cart.findOne({ userId: req.user._id });

    if (!cart) {
      cart = await Cart.create({
        userId: req.user._id,
        items: [{
          name: dish.name,
          price: dish.price,
          image: dish.image,
          category: dish.category,
          quantity
        }]
      });
    } else {
      const existingItemIndex = cart.items.findIndex(item =>
        item.name === dish.name
      );

      if (existingItemIndex !== -1) {
        // Cập nhật số lượng nếu món đã có
        cart.items[existingItemIndex].quantity =
          Number(cart.items[existingItemIndex].quantity) + Number(quantity);
      } else {
        // Thêm mới nếu món chưa có
        cart.items.push({
          name: dish.name,
          price: dish.price,
          image: dish.image,
          category: dish.category,
          quantity
        });
      }

      cart = await cart.save();
    }

    res.status(200).json({
      success: true,
      data: cart
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Lỗi server: " + error.message,
    });
  }
});
const getCart = asyncHandler(async (req, res) => {
  try {
    const cart = await Cart.findOne({ userId: req.user._id });

    if (!cart || cart.items.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          items: [],
          totalItems: 0,
          totalPrice: 0
        }
      });
    }

    // Tính toán thông tin
    const items = cart.items.map(item => ({
      _id: item._id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: item.quantity,
      category: item.category,
      total: item.price * item.quantity
    }));

    const totalPrice = items.reduce((sum, item) => sum + item.total, 0);

    res.status(200).json({
      success: true,
      data: {
        items,
        totalItems: cart.items.reduce((sum, item) => sum + item.quantity, 0),
        totalPrice: totalPrice.toFixed(2)
      }
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Lỗi server: ' + error.message
    });
  }
});
const removeCartItem = asyncHandler(async (req, res) => {
  const { itemId } = req.body;

  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Giỏ hàng trống"
      });
    }

    const itemIndex = cart.items.findIndex(item =>
      item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Món không tồn tại trong giỏ"
      });
    }

    cart.items.splice(itemIndex, 1);
    await cart.save();

    res.json({
      success: true,
      data: cart
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
const updateCartItemQuantity = asyncHandler(async (req, res) => {
  const { itemId, quantity } = req.body;

  if (!itemId || quantity == null) {
    return res.status(400).json({
      success: false,
      message: "Vui lòng cung cấp ID món trong giỏ và số lượng mới",
    });
  }

  try {
    const cart = await Cart.findOne({ userId: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: "Không tìm thấy giỏ hàng"
      });
    }

    const itemIndex = cart.items.findIndex(item =>
      item._id.toString() === itemId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        message: "Món không tồn tại trong giỏ"
      });
    }

    // Nếu quantity <= 0 thì xóa luôn
    if (quantity <= 0) {
      cart.items.splice(itemIndex, 1);
    } else {
      cart.items[itemIndex].quantity = quantity;
    }

    await cart.save();

    res.json({
      success: true,
      data: cart
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});
module.exports = {
  addToCart,
  getCart,
  removeCartItem,
  updateCartItemQuantity
};