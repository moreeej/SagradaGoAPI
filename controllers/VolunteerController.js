const VolunteerModel = require("../models/Volunteer");
const UserModel = require("../models/User");

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

// Add a new volunteer
async function addVolunteer(req, res) {
  try {
    const { name, contact, role, user_id, eventId, eventTitle } = req.body;

    if (!name || !contact || !role || !user_id) {
      return res.status(400).json({ success: false, message: "Missing required fields." });
    }

    const newVolunteer = new VolunteerModel({
      name,
      contact,
      role,
      user_id,
      event_id: eventId || null,     
      eventTitle: eventTitle || 'General Volunteer',
    });

    await newVolunteer.save();

    res.status(200).json({ success: true, volunteer: newVolunteer });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: "Server error. Please try again." });
  }
}

async function getAllVolunteers(req, res) {
  try {
    const volunteers = await VolunteerModel.find({
      status: { $ne: "cancelled" } // ignore cancelled volunteers
    }).sort({ createdAt: -1 }).lean();

    // Get unique user IDs and fetch updated user data
    const userIds = [...new Set(volunteers.map(v => v.user_id).filter(Boolean))];
    const users = await UserModel.find({ uid: { $in: userIds }, is_deleted: false }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u; });

    // Map volunteers with updated user information
    const volunteersWithUser = volunteers.map(volunteer => {
      const user = userMap[volunteer.user_id];
      const updatedName = user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : volunteer.name;
      const updatedContact = user?.contact_number || volunteer.contact;
      
      return {
        ...volunteer,
        // Update name and contact with current user data, fallback to stored values
        name: updatedName,
        contact: updatedContact,
        // Also add user_name and user_contact for consistency
        user_name: updatedName,
        user_contact: updatedContact,
      };
    });

    res.status(200).json({
      message: "All volunteers retrieved successfully.",
      volunteers: volunteersWithUser,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = { 
  getEventVolunteers, 
  getUserVolunteers, 
  updateVolunteerStatus,
  addVolunteer,
  getAllVolunteers 
};

