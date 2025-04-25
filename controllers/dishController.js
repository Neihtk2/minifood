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



module.exports = {
  getDishes,
  getDishById,
  createDish,
  deleteDish,
  updateDish,
  getNewDishes
};