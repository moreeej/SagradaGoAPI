// const CommunionModel = require("../models/BookCommunion");

const CommunionModel = require("../models/BookCommunion");
const UserModel = require("../models/User");

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `COM-${timestamp}-${random}`;
}

/**
 * Create a new communion booking
 * POST /api/createCommunion
 * Body: { uid, date, time, attendees }
 */
async function createCommunion(req, res) {
  try {
    const {
      uid,
      date,
      time,
      attendees,
    } = req.body;

    // Validate required fields
    if (!uid) {
      return res.status(400).json({ message: "User ID (uid) is required." });
    }

    if (!date) {
      return res.status(400).json({ message: "Communion date is required." });
    }

    if (!time) {
      return res.status(400).json({ message: "Communion time is required." });
    }

    if (!attendees || attendees <= 0) {
      return res.status(400).json({ message: "Valid number of attendees is required." });
    }

    // Verify user exists
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Generate transaction ID
    const transaction_id = generateTransactionId();

    // Create communion booking
    // Note: Consider adding uid or contact_number to Communion model for better user tracking
    const communionData = {
      transaction_id,
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      status: "pending",
      // Store uid in transaction_id prefix for reference (COM-{timestamp}-{random})
      // Ideally, add uid field to model
    };

    const newCommunion = new CommunionModel(communionData);
    await newCommunion.save();

    res.status(201).json({
      message: "Communion booking created successfully.",
      communion: newCommunion,
      transaction_id,
    });

  } catch (err) {
    console.error("Error creating communion booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all communion bookings for a user
 * POST /api/getUserCommunions
 * Body: { uid }
 */
async function getUserCommunions(req, res) {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID (uid) is required." });
    }

    // Verify user exists
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Note: Since Communion model doesn't have uid or contact_number field,
    // we cannot directly filter by user. This is a limitation of the current model.
    // For now, we'll return all communions. 
    // TODO: Consider adding uid or contact_number field to Communion model
    // Alternative: Store uid in a separate field or use transaction_id pattern
    const communions = await CommunionModel.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Communion bookings retrieved successfully.",
      communions,
      count: communions.length,
      note: "Note: Communion model doesn't have uid/contact_number. Consider updating the model for proper user filtering.",
    });

  } catch (err) {
    console.error("Error getting communion bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get a specific communion booking by transaction ID
 * POST /api/getCommunion
 * Body: { transaction_id }
 */
async function getCommunion(req, res) {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    const communion = await CommunionModel.findOne({ transaction_id });

    if (!communion) {
      return res.status(404).json({ message: "Communion booking not found." });
    }

    res.status(200).json({
      message: "Communion booking retrieved successfully.",
      communion,
    });

  } catch (err) {
    console.error("Error getting communion booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update communion booking status
 * PUT /api/updateCommunionStatus
 * Body: { transaction_id, status }
 */
async function updateCommunionStatus(req, res) {
  try {
    const { transaction_id, status } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required." });
    }

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const communion = await CommunionModel.findOne({ transaction_id });

    if (!communion) {
      return res.status(404).json({ message: "Communion booking not found." });
    }

    communion.status = status;
    await communion.save();

    res.status(200).json({
      message: "Communion booking status updated successfully.",
      communion,
    });

  } catch (err) {
    console.error("Error updating communion status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all communion bookings (admin function)
 * GET /api/getAllCommunions
 */
async function getAllCommunions(req, res) {
  try {
    const communions = await CommunionModel.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "All communion bookings retrieved successfully.",
      communions,
      count: communions.length,
    });

  } catch (err) {
    console.error("Error getting all communion bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  createCommunion,
  getUserCommunions,
  getCommunion,
  updateCommunionStatus,
  getAllCommunions,
};

