const VolunteerModel = require("../models/Volunteer");

// Get all volunteers for a specific event
async function getEventVolunteers(req, res) {
  try {
    const { event_id } = req.body;

    if (!event_id) {
      return res.status(400).json({ message: "Event ID is required." });
    }

    const volunteers = await VolunteerModel.find({ 
      event_id: event_id,
      status: { $ne: "cancelled" }
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Volunteers retrieved successfully.",
      volunteers,
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

// Get all volunteers for a specific user
async function getUserVolunteers(req, res) {
  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const volunteers = await VolunteerModel.find({ 
      user_id: user_id,
      status: { $ne: "cancelled" }
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "Volunteers retrieved successfully.",
      volunteers,
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

// Update volunteer status (for admins)
async function updateVolunteerStatus(req, res) {
  try {
    const { volunteer_id, status } = req.body;

    if (!volunteer_id || !status) {
      return res.status(400).json({ message: "Volunteer ID and status are required." });
    }

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be pending, confirmed, or cancelled." });
    }

    const volunteer = await VolunteerModel.findById(volunteer_id);

    if (!volunteer) {
      return res.status(404).json({ message: "Volunteer not found." });
    }

    volunteer.status = status;
    await volunteer.save();

    res.status(200).json({
      message: "Volunteer status updated successfully.",
      volunteer,
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = { 
  getEventVolunteers, 
  getUserVolunteers, 
  updateVolunteerStatus 
};

