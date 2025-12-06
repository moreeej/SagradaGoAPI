const ConfessionModel = require("../models/BookConfession");
const UserModel = require("../models/User");

// Create a new Confession booking
const createConfession = async (req, res) => {
  try {
    const { uid, full_name, email, date, time, attendees } = req.body;

    // Confession is free, generate a dummy transaction_id
    const transaction_id = `CONF-${Date.now()}`;

    const booking = await ConfessionModel.create({
      uid,
      full_name,
      email,
      transaction_id,
      date,
      time,
      attendees,
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("Confession booking error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all confession bookings of a user
const getUserConfessions = async (req, res) => {
  try {
    const { uid } = req.body;   // ✅ read from POST body
    console.log("Fetching confessions for uid:", uid);

    const bookings = await ConfessionModel.find({ uid }).sort({ createdAt: -1 });
    console.log("Found bookings:", bookings.length);

    res.json({ success: true, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single confession booking by ID
const getConfession = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await ConfessionModel.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update confession status (pending, confirmed, cancelled)
const updateConfessionStatus = async (req, res) => {
  try {
    const { transaction_id, status, priest_id, priest_name } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const booking = await ConfessionModel.findOne({ transaction_id });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    booking.status = status;
    
    // Assign priest when confirming
    if (status === "confirmed" && priest_id) {
      booking.priest_id = priest_id;
      if (priest_name) {
        booking.priest_name = priest_name;
      } else if (priest_id) {
        // Fetch priest name if not provided
        const priest = await UserModel.findOne({ uid: priest_id, is_priest: true, is_deleted: false });
        if (priest) {
          booking.priest_name = `${priest.first_name} ${priest.middle_name || ''} ${priest.last_name}`.trim();
        }
      }
    }
    
    await booking.save();

    res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all confession bookings (admin)
const getAllConfessions = async (req, res) => {
  try {
    const bookings = await ConfessionModel.find().sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  ConfessionModel,
  createConfession,
  getUserConfessions,
  getConfession,
  updateConfessionStatus,
  getAllConfessions,
};
