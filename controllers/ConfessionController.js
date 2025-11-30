// controllers/ConfessionController.js
const ConfessionModel = require("../models/BookConfession");

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
    const { uid } = req.params;
    const bookings = await ConfessionModel.find({ uid }).sort({ createdAt: -1 });
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
    const { id } = req.params;
    const { status } = req.body;

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const booking = await ConfessionModel.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });

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
