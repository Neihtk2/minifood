const express = require("express");
const router = express.Router();
const { protect, checkRole } = require('../utils/authMiddleware');

const { createVoucher,
    getAllVouchers,
    updateVoucher,
    deleteVoucher,
    getAvailableVouchers, applyVoucher } = require("../controllers/voucherController");


router.post("/", protect, checkRole("admin"), createVoucher);
router.get("/", protect, getAllVouchers);
router.put("/:id", protect, checkRole("admin"), updateVoucher);
router.delete("/:id", protect, checkRole("admin"), deleteVoucher);

// User routes
router.get("/available", protect, getAvailableVouchers);
router.post(
    "/apply",
    protect,
    applyVoucher
);

module.exports = router;