const VolunteerModel = require("../models/Volunteer");
const UserModel = require("../models/User");
const AdminModel = require("../models/Admin");
const { notifyAllAdmins } = require("../utils/NotificationHelper");

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
async function addVolunteer(req, res) {
  try {
    const { name, contact, user_id, eventId, eventTitle } = req.body;

    if (!name || !contact || !user_id) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields."
      });
    }

    // Build query safely
    const duplicateQuery = {
      user_id,
      status: { $ne: "cancelled" }
    };

    if (eventId) {
      duplicateQuery.event_id = eventId;
    } else {
      duplicateQuery.event_id = null;
    }

    const existingVolunteer = await VolunteerModel.findOne(duplicateQuery);

    if (existingVolunteer) {
      return res.status(400).json({
        success: false,
        message: eventId
          ? "You have already volunteered/registered for this event."
          : "You have already signed up as a volunteer."
      });
    }

    const newVolunteer = new VolunteerModel({
      name: name.trim(),
      contact,
      user_id,
      event_id: eventId || null,
      eventTitle: eventTitle || "General Volunteer",
    });

    await newVolunteer.save();

    // ---- ADMIN NOTIFICATION (SAFE) ----
    try {
      let userName = name.trim();

      const user = await UserModel.findOne({
        uid: user_id,
        is_deleted: false
      });

      if (user) {
        userName = `${user.first_name} ${user.middle_name || ""} ${user.last_name}`.trim();
      }

      const admins = await AdminModel.find({ is_deleted: false }).select("uid");
      const adminIds = admins.map(a => a.uid);

      if (adminIds.length) {
        const eventInfo = eventId ? ` for ${eventTitle}` : "";

        await notifyAllAdmins(
          adminIds,
          "volunteer",
          "New Volunteer Sign-up",
          `${userName} has signed up to volunteer${eventInfo}.`,
          {
            action: "VolunteersList",
            metadata: {
              volunteer_id: newVolunteer._id.toString(),
              user_id,
              user_name: userName,
              event_title: eventTitle || "General Volunteer",
            },
            priority: "medium",
          }
        );
      }
    } catch (notificationError) {
      console.error("Notification error:", notificationError);
    }

    return res.status(200).json({
      success: true,
      volunteer: newVolunteer
    });

  } catch (err) {
    console.error("Add volunteer error:", err);
    return res.status(500).json({
      success: false,
      message: "Server error. Please try again."
    });
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


async function addVolunteerWeb(req, res){
  try{
    const {user_id, name, contact, eventId, eventTitle, registration_type} = req.body

    const newVolunteer = new VolunteerModel({
      name: name.trim(),
      contact,
      user_id,
      event_id: eventId || null,
      eventTitle: eventTitle || "General Volunteer",
      registration_type
    });

    await newVolunteer.save();


  }
  catch(err){
    console.log(err);
    
  }
}

module.exports = { 
  getEventVolunteers, 
  getUserVolunteers, 
  updateVolunteerStatus,
  addVolunteer,
  getAllVolunteers,
  addVolunteerWeb
};

