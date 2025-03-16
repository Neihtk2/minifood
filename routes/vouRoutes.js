const express = require("express");
const router = express.Router();
const { protect, checkRole } = require('../utils/authMiddleware');

const { createVoucher,
    getAllVouchers,
    updateVoucher,
    deleteVoucher,
    getAvailableVouchers, applyVoucher } = require("../controllers/voucherController");
const upload = require('../utils/upload');

// Admin routes
// router.post(
//     "/",
//     protect,
//     checkRole("admin"),
//     createVoucher
// );
router.post("/", protect, checkRole("admin"), upload.single('image'), createVoucher);
router.get("/", protect, checkRole("admin"), getAllVouchers);
router.put("/:id", protect, checkRole("admin"), upload.single('image'), updateVoucher);
router.delete("/:id", protect, checkRole("admin"), deleteVoucher);

// User routes
router.get("/available", protect, getAvailableVouchers);
router.post(
    "/apply",
    protect,
    applyVoucher
);

module.exports = router;