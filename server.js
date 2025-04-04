// server.js
require('dotenv').config();
const { cleanupExpiredVouchers } = require("./utils/voucherCleanup");
const express = require('express');
const connectDB = require('./config/db.js');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const dishRoutes = require('./routes/dishRoutes');
const orderRoutes = require('./routes/orderRoutes.js');
const voucherRoutes = require('./routes/vouRoutes.js');

const app = express();
connectDB();

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/orders', orderRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/admin', orderRoutes)
app.use('/api/vouchers', voucherRoutes)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port http://localhost:${PORT}`);
    cleanupExpiredVouchers()
});
