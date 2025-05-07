const { S3Client, PutObjectCommand, DeleteObjectCommand } = require("@aws-sdk/client-s3");
const Dish = require("../models/Dish");
const asyncHandler = require("express-async-handler");
const { v4: uuidv4 } = require("uuid");

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const generateFileName = (originalName) => {
  const ext = originalName.split(".").pop();
  return `dishes/${uuidv4()}.${ext}`;
};

// Helper function để xử lý lỗi
const handleError = (res, statusCode, message) => {
  res.status(statusCode).json({
    success: false,
    message: message
  });
};

const getDishes = asyncHandler(async (req, res) => {
  try {
    const dishes = await Dish.find().sort({ name: 1 });
    res.json({
      success: true,
      data: dishes
    });
  } catch (error) {
    handleError(res, 500, "Lỗi khi lấy danh sách món ăn");
  }
});

const getDishById = asyncHandler(async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return handleError(res, 404, "Không tìm thấy món ăn");

    res.json({
      success: true,
      data: dish
    });
  } catch (error) {
    handleError(res, 500, "Lỗi khi lấy thông tin món ăn");
  }
});

const createDish = asyncHandler(async (req, res) => {

  const { name, price, category, description } = req.body;
  const imageFile = req.file;
  console.log("dữ liệu", req.body);
  // Validation
  if (!name || !price || !category) {
    return handleError(res, 400, "Vui lòng điền đầy đủ thông tin");
  }

  if (!['main', 'beverage', 'dessert'].includes(category)) {
    return handleError(res, 400, "Danh mục không hợp lệ");
  }

  if (!imageFile) {
    return handleError(res, 400, "Vui lòng chọn ảnh");
  }
  const priceNumber = Number(price);
  if (isNaN(priceNumber)) {
    return handleError(res, 400, "Giá tiền phải là số hợp lệ");
  }

  try {
    // Upload ảnh
    const fileName = generateFileName(imageFile.originalname);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME,
        Key: fileName,
        Body: imageFile.buffer,
        ContentType: imageFile.mimetype,
      })
    );

    // Tạo món ăn
    const dish = await Dish.create({
      name,
      price: priceNumber,
      category,
      description: description || '',
      image: `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`,
    });

    res.status(201).json({
      success: true,
      data: dish
    });
  } catch (error) {
    console.error('Lỗi khi tạo món:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: `Tên món '${name}' đã tồn tại`
      });
    }
    handleError(res, 500, `Lỗi tạo món: ${error.message}`);
  }
});

const deleteDish = asyncHandler(async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return handleError(res, 404, "Không tìm thấy món");

    // Xóa ảnh từ S3 nếu có
    if (dish.image) {
      const urlParts = dish.image.split('/');
      const imageKey = urlParts.slice(3).join('/');

      await s3Client.send(
        new DeleteObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: imageKey,
        })
      );
    }

    await dish.deleteOne();
    res.json({
      success: true,
      message: "Xóa món thành công"
    });
  } catch (error) {
    handleError(res, 500, `Lỗi xóa món: ${error.message}`);
  }
});

const updateDish = asyncHandler(async (req, res) => {
  try {
    const dish = await Dish.findById(req.params.id);
    if (!dish) return handleError(res, 404, "Không tìm thấy món");

    let imageUrl = dish.image;
    const imageFile = req.file;

    // Xử lý ảnh mới
    if (imageFile) {
      // Xóa ảnh cũ nếu tồn tại
      if (dish.image) {
        const oldImageKey = dish.image.split('/').slice(3).join('/');
        await s3Client.send(
          new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: oldImageKey,
          })
        );
      }

      // Upload ảnh mới
      const fileName = generateFileName(imageFile.originalname);
      await s3Client.send(
        new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME,
          Key: fileName,
          Body: imageFile.buffer,
          ContentType: imageFile.mimetype,
        })
      );
      imageUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    }

    // Cập nhật dữ liệu
    const updatedData = {
      name: req.body.name || dish.name,
      price: req.body.price ? Number(req.body.price) : dish.price,
      category: req.body.category || dish.category,
      description: req.body.description || dish.description,
      image: imageUrl
    };

    // Validate category
    if (req.body.category && !['main', 'beverage', 'dessert'].includes(req.body.category)) {
      return handleError(res, 400, "Danh mục không hợp lệ");
    }

    const updatedDish = await Dish.findByIdAndUpdate(
      req.params.id,
      updatedData,
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: updatedDish
    });
  } catch (error) {
    handleError(res, 500, `Lỗi cập nhật: ${error.message}`);
  }
});
const getNewDishes = asyncHandler(async (req, res) => {
  try {
    const newDishes = await Dish.find()
      .sort({ createdAt: -1 }) // Sắp xếp từ mới nhất đến cũ nhất
      .limit(5) // Giới hạn 5 kết quả
      .lean(); // Trả về plain JavaScript objects

    if (!newDishes.length) {
      return res.status(200).json({
        success: true,
        message: "Chưa có món ăn nào được thêm",
        data: []
      });
    }

    res.status(200).json({
      success: true,
      count: newDishes.length,
      data: newDishes
    });

  } catch (error) {
    handleError(res, 500, `Lỗi khi lấy món ăn mới: ${error.message}`);
  }
});
// const addRating = asyncHandler(async (req, res) => {
//   const { id: dishId } = req.params;
//   const { star, comment } = req.body;
//   const userId = req.user._id;

//   // Validate input
//   if (!star || isNaN(star)) {
//     return res.status(400).json({
//       success: false,
//       message: "Vui lòng cung cấp số sao hợp lệ"
//     });
//   }

//   if (star < 1 || star > 5) {
//     return res.status(400).json({
//       success: false,
//       message: "Số sao phải từ 1 đến 5"
//     });
//   }

//   try {
//     // Kiểm tra món ăn tồn tại
//     const dish = await Dish.findById(dishId);
//     if (!dish) {
//       return res.status(404).json({
//         success: false,
//         message: "Không tìm thấy món ăn"
//       });
//     }

//     // Kiểm tra user đã đánh giá chưa
//     const existingRatingIndex = dish.ratings.findIndex(
//       rating => rating.userId.toString() === userId.toString()
//     );

//     const newRating = {
//       userId,
//       star,
//       comment: comment || '',
//       createdAt: new Date()
//     };

//     if (existingRatingIndex >= 0) {
//       // Nếu đã đánh giá thì cập nhật
//       dish.ratings[existingRatingIndex] = newRating;
//     } else {
//       // Nếu chưa thì thêm mới
//       dish.ratings.push(newRating);
//     }

//     // Lưu và trigger middleware tính toán lại averageRating
//     await dish.save();

//     res.status(200).json({
//       success: true,
//       message: existingRatingIndex >= 0
//         ? "Cập nhật đánh giá thành công"
//         : "Thêm đánh giá thành công",
//       data: {
//         dishId: dish._id,
//         rating: newRating,
//         averageRating: dish.averageRating,
//         ratingCount: dish.ratingCount
//       }
//     });

//   } catch (error) {
//     console.error('Lỗi khi đánh giá:', error);
//     res.status(500).json({
//       success: false,
//       message: "Lỗi server khi xử lý đánh giá",
//       error: process.env.NODE_ENV === 'development' ? error.message : undefined
//     });
//   }
// });
// controllers/ratingController.js
const addRating = asyncHandler(async (req, res) => {
  const { dishName, star, comment } = req.body;
  const userId = req.user._id;

  // Validate
  if (!dishName || typeof dishName !== 'string') {
    return res.status(400).json({
      success: false,
      message: "Tên món không hợp lệ"
    });
  }

  // Tìm món ăn bằng tên (chính xác hoặc không phân biệt hoa thường)
  const dish = await Dish.findOne({
    name: { $regex: new RegExp(`^${dishName}$`, 'i') } // Không phân biệt hoa thường
  });

  if (!dish) {
    return res.status(404).json({
      success: false,
      message: `Không tìm thấy món '${dishName}'`
    });
  }

  // Kiểm tra user đã đánh giá chưa
  const existingRating = dish.ratings.find(r =>
    r.userId.toString() === userId.toString()
  );

  const newRating = {
    userId,
    star,
    comment: comment || '',
    createdAt: new Date()
  };

  if (existingRating) {
    Object.assign(existingRating, newRating); // Cập nhật
  } else {
    dish.ratings.push(newRating); // Thêm mới
  }

  // Tính toán lại điểm trung bình
  const totalStars = dish.ratings.reduce((sum, r) => sum + r.star, 0);
  dish.averageRating = totalStars / dish.ratings.length;
  dish.ratingCount = dish.ratings.length;

  await dish.save();

  res.json({
    success: true,
    data: {
      dishId: dish._id,
      dishName: dish.name,
      rating: newRating,
      averageRating: dish.averageRating
    }
  });
});


module.exports = {
  getDishes,
  getDishById,
  createDish,
  deleteDish,
  updateDish,
  getNewDishes,
  addRating
};