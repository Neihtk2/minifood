const Message = require('../models/Message'); // Import Room model
const Room = require('../models/Room');
const User = require('../models/User'); // Import User model

const getMessagesByRoomId = async (req, res) => {
  const { roomId } = req.params;

  try {
    const messages = await Message.find({ roomId })
      .populate('senderId', 'name email') // Populate senderId with name and email
      .sort({ createdAt: 1 }); // Sort messages by createdAt in ascending order
    res.status(200).json({ message: 'Messages fetched successfully', messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
const getAllMessages = async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('senderId', 'name email') // Populate senderId with name and email
      .sort({ createdAt: 1 }); // Sort messages by createdAt in ascending order
    res.status(200).json({ message: 'Messages fetched successfully', messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

const getMessagesByUserId = async (req, res) => {
  const { userId } = req.params;

  try {
    const messages = await Message.find({ senderId: userId })
      .populate('senderId', 'name email') // Populate senderId with name and email
      .sort({ createdAt: 1 }); // Sort messages by createdAt in ascending order
    res.status(200).json({ message: 'Messages fetched successfully', messages });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};
//save  
const saveMessage = async (req, res) => {
  const { roomId, senderId, message } = req.body;
  try {
    const newMessage = new Message({ roomId, senderId, message, senderRole });
    const room = await Room.findById(roomId);
    if(senderRole === 'staff') {
      room.isAnswered = true; // Mark room as answered
    }
    if(senderRole === 'user') {
      room.isAnswered = false; // Mark room as unanswered
    } 
    await room.save();
    await newMessage.save();
    res.status(201).json({ message: 'Message saved successfully', newMessage });
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
};

module.exports = {
  getMessagesByRoomId,
  getAllMessages,
  getMessagesByUserId,
  saveMessage
};