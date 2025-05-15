const User = require("../models/User"); // Import User model
const Room = require("../models/Room"); // Import Room model
// Reusable function to create a room
const createRoomLogic = async (customerId) => {
  try {
    console.log("Creating room for customerId:", customerId);
    // Fetch all users with role 'staff'
    const staffUsers = await User.find({ role: "staff" });
    console.log("Staff users fetched:", staffUsers);
    const staffIds = staffUsers.map((user) => user._id.toString());
    console.log("Staff IDs:", staffIds);

    // Create the room
    const room = await Room.create({
      customerId,
      staffIds, // Add staff IDs to the room
    });
    console.log("Room created:", room);

    return room;
  } catch (err) {
    console.error("Error in createRoomLogic:", err.message);
    throw new Error("Failed to create room: " + err.message);
  }
};

// Updated createRoom function for Express route
const createRoom = async (req, res) => {
  const { customerId } = req.body;

  try {
    const room = await createRoomLogic(customerId);
    res.status(201).json({ message: "Room created successfully", room });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getAllRooms = async (req, res) => {
  try {
    const rooms = await Room.find();
    res.status(200).json({ message: "Rooms fetched successfully", rooms });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const getRoomByStaffId = async (req, res) => {
  const { staffId } = req.params;

  try {
    const rooms = await Room.find({ staffIds: staffId });
    res.status(200).json({ message: "Rooms fetched successfully", rooms });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
};

const addStaffToRoom = async (staffId) => {
  try {
    // Fetch all rooms
    const rooms = await Room.find();
    console.log("Rooms fetched:", rooms);

    // Loop through each room and add the staff ID
    for (const room of rooms) {
      if (!room.staffIds.includes(staffId)) {
        room.staffIds.push(staffId);
        await room.save();
        console.log(`Staff ID ${staffId} added to room ${room._id}`);
      }
    }
  } catch (err) {
    console.error("Error in addStaffToRoom:", err.message);
  }
};

module.exports = { createRoom, createRoomLogic, getAllRooms, getRoomByStaffId, addStaffToRoom };
