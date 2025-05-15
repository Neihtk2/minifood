require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db.js');
const cors = require('cors');

// Import route handlers
const authRoutes = require('./routes/authRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const dishRoutes = require('./routes/dishRoutes.js');
const orderRoutes = require('./routes/orderRoutes.js');
const voucherRoutes = require('./routes/vouRoutes.js');
const messageRoutes = require('./routes/messageRoutes.js');
const roomRoutes = require('./routes/roomRoutes.js');
const { cleanupExpiredVouchers } = require('./utils/voucherCleanup');

// Import socket
const socketHandler = require('./config/socket.js');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// Kết nối database
connectDB();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dishes', dishRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/admin', orderRoutes); // có thể tách riêng nếu cần
app.use('/api/vouchers', voucherRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/rooms', roomRoutes);

// Khởi tạo socket
socketHandler(io);

// Khởi động server
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
  cleanupExpiredVouchers();
});
