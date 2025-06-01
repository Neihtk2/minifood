// server.js
require('dotenv').config();
const { cleanupExpiredVouchers } = require("./utils/voucherCleanup");
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const connectDB = require('./config/db.js');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes.js');
const userRoutes = require('./routes/userRoutes.js');
const dishRoutes = require('./routes/dishRoutes');
const orderRoutes = require('./routes/orderRoutes.js');
const voucherRoutes = require('./routes/vouRoutes.js');
const messageRoutes = require('./routes/messageRoutes');
const roomRoutes = require('./routes/roomRoutes');

const socketHandler = require('./config/socket');



const app = express();
const server = http.createServer(app); // dùng server để truyền vào socket.io
const io = socketIo(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
        credentials: false,
    }
});
connectDB();
socketHandler(io);

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
app.use('/api/admin', orderRoutes);
app.use('/api/vouchers', voucherRoutes);
app.use('/api/message', messageRoutes);
app.use('/api/room', roomRoutes);


const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port http://localhost:${PORT}`);
    cleanupExpiredVouchers()
});
