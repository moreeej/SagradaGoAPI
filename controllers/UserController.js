const UserModel = require("../models/User")
const ArchiveUserModel = require("../models/ArchiveUser")
const VolunteerModel = require("../models/Volunteer")

const bcrypt = require("bcrypt");

async function createUser(req, res) {
  try {
    const { 
      first_name, 
      middle_name, 
      last_name, 
      // gender, 
      contact_number, 
      // civil_status, 
      birthday, 
      email, 
      password,
      uid,
      is_priest,
      previous_parish,
      residency
    } = req.body;
    

    // Validate required fields
    if (!email || !contact_number) {
      return res.status(400).json({ message: "Email and contact number are required." });
    }

    // Check if email already exists
    const existingEmail = await UserModel.findOne({ 
      email: email.trim().toLowerCase(),
      is_deleted: false 
    });
    
    if (existingEmail) {
      return res.status(409).json({ message: "Email already exists. Please use a different email." });
    }

    // Check if contact number already exists
    const existingContact = await UserModel.findOne({ 
      contact_number: contact_number.trim(),
      is_deleted: false 
    });
    
    if (existingContact) {
      return res.status(409).json({ message: "Contact number already exists. Please use a different contact number." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Handle residency field properly - only set if it's a valid enum value
    // For non-priests, residency should be undefined (not empty string)
    let residencyValue = undefined;
    if (residency && (residency === "Permanent" || residency === "Floating")) {
      residencyValue = residency;
    }
    
    // Only set previous_parish if user is a priest
    const previousParishValue = (is_priest && previous_parish) ? previous_parish : undefined;

    const newUser = new UserModel({
      first_name,
      middle_name,
      last_name,
      // gender,
      contact_number: contact_number.trim(),
      // civil_status,
      birthday,
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      uid,
      is_priest: is_priest || false,
      previous_parish: previousParishValue,
      residency: residencyValue
    });

    console.log("newuser", newUser);
    

    await newUser.save();

    const newUserData = {
      uid: newUser.uid,
      email: newUser.email,
      first_name: newUser.first_name,
      middle_name: newUser.middle_name || "",
      last_name: newUser.last_name,
      // gender: newUser.gender,
      contact_number: newUser.contact_number,
      // civil_status: newUser.civil_status,
      birthday: newUser.birthday,
      is_priest: newUser.is_priest,
      previous_parish: newUser.previous_parish,
      residency: newUser.residency,
      volunteers: [] // New users have no volunteers yet
    };

    res.json({
      message: "User created successfully.",
      newUser: newUserData
    });

  } catch (err) {
    console.error("Error:", err);
    
    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      if (field === 'email') {
        return res.status(409).json({ message: "Email already exists. Please use a different email." });
      } else if (field === 'contact_number') {
        return res.status(409).json({ message: "Contact number already exists. Please use a different contact number." });
      } else if (field === 'uid') {
        return res.status(409).json({ message: "User ID already exists. Please try again." });
      }
    }
    
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function findUser(req, res) {
  try {
    const { uid } = req.body;

    const user = await UserModel.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Get user's volunteers from Volunteer collection
    const userVolunteers = await VolunteerModel.find({ user_id: uid });

    // Check if account is disabled
    if (user.is_active === false) {
      return res.status(403).json({ 
        message: "Your account has been disabled. Please contact the administrator for assistance." 
      });
    }

    const userData = {
      uid: user.uid,
      email: user.email,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      // gender: user.gender,
      contact_number: user.contact_number,
      // civil_status: user.civil_status,
      birthday: user.birthday,
      is_priest: user.is_priest,
      previous_parish: user.previous_parish,
      residency: user.residency,
      is_active: user.is_active === true, // Return actual boolean value
      volunteers: userVolunteers || []
    };
    
    res.status(200).json({
      message: "User found successfully.",
      user: userData,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function login(req, res) {
  try {
    const { email, password, firebaseToken } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    if (!password && !firebaseToken) {
      return res.status(400).json({ message: "Password or Firebase token is required." });
    }

    const user = await UserModel.findOne({ email: email.trim().toLowerCase(), is_deleted: false });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    let isPasswordValid = false;

    // If Firebase token is provided, verify with Firebase Admin
    if (firebaseToken) {
      try {
        const admin = require("../config/firebaseAdmin");
        const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
        
        // Verify the token belongs to the correct user
        if (decodedToken.email !== email.trim().toLowerCase()) {
          return res.status(401).json({ message: "Invalid email or password." });
        }
        
        // Firebase Auth verification succeeded
        isPasswordValid = true;
        
        // Note: We can't sync the password hash from Firebase to MongoDB
        // because Firebase doesn't expose password hashes. The password in MongoDB
        // will remain out of sync, but login will work via Firebase token.
        
      } catch (firebaseError) {
        console.error("Firebase token verification failed:", firebaseError);
        // If Firebase verification fails, fall back to password check
        if (password) {
          isPasswordValid = await bcrypt.compare(password, user.password);
        } else {
          return res.status(401).json({ message: "Invalid email or password." });
        }
      }
    } else {
      // Use traditional password verification
      isPasswordValid = await bcrypt.compare(password, user.password);
    }

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    // Get user's volunteers from Volunteer collection
    const userVolunteers = await VolunteerModel.find({ user_id: user.uid });

    // Check if account is disabled
    if (user.is_active === false) {
      return res.status(403).json({ 
        message: "Your account has been disabled. Please contact the administrator for assistance." 
      });
    }

    const userData = {
      uid: user.uid,
      email: user.email,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      // gender: user.gender,
      contact_number: user.contact_number,
      // civil_status: user.civil_status,
      birthday: user.birthday,
      is_priest: user.is_priest,
      previous_parish: user.previous_parish,
      residency: user.residency,
      is_active: user.is_active !== false, // Ensure is_active is included
      volunteers: userVolunteers || []
    };

    res.status(200).json({
      message: "Login successful.",
      user: userData,
    });
    
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function getAllUsers(req, res) {
  try {
    const users = await UserModel.find({ is_deleted: false });
    const usersData = users.map(user => ({
      uid: user.uid,
      email: user.email,
      is_active: user.is_active, // Return actual value from database
      is_archived: user.is_archived || false, // Include archived status
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      contact_number: user.contact_number,
      birthday: user.birthday,
      is_priest: user.is_priest,
      previous_parish: user.previous_parish,
      residency: user.residency,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      archived_at: user.archived_at || null
    }));
    return res.json(usersData);
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function updateUserRole(req, res) {
  try {
    const { uid, is_priest } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required." });
    }

    if (typeof is_priest !== 'boolean') {
      return res.status(400).json({ message: "is_priest must be a boolean value." });
    }

    // Find the user
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Update is_priest field
    user.is_priest = is_priest;
    await user.save();

    const updatedUserData = {
      uid: user.uid,
      email: user.email,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      contact_number: user.contact_number,
      birthday: user.birthday,
      is_priest: user.is_priest,
    };

    res.status(200).json({
      message: `User role updated successfully. User is now ${is_priest ? 'a priest' : 'a regular user'}.`,
      user: updatedUserData,
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function checkEmailExists(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await UserModel.findOne({ 
      email: email.trim().toLowerCase(),
      is_deleted: false 
    });

    return res.status(200).json({ 
      exists: !!user,
      message: user ? "Email already exists." : "Email is available."
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function checkContactExists(req, res) {
  try {
    const { contact_number } = req.body;

    if (!contact_number) {
      return res.status(400).json({ message: "Contact number is required." });
    }

    const user = await UserModel.findOne({ 
      contact_number: contact_number.trim(),
      is_deleted: false 
    });

    return res.status(200).json({ 
      exists: !!user,
      message: user ? "Contact number already exists." : "Contact number is available."
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function updateUser(req, res) {
  try {
    const { uid } = req.body;
    const {
      first_name,
      middle_name,
      last_name,
      // gender,
      contact_number,
      // civil_status,
      birthday,
      email,
      is_priest,
      previous_parish,
      residency,
    } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Find the user
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if email is being changed and if it already exists
    if (email && email.trim().toLowerCase() !== user.email) {
      const existingEmail = await UserModel.findOne({
        email: email.trim().toLowerCase(),
        is_deleted: false,
        uid: { $ne: uid }
      });

      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists. Please use a different email." });
      }
    }

    // Check if contact number is being changed and if it already exists
    if (contact_number && contact_number.trim() !== user.contact_number) {
      const existingContact = await UserModel.findOne({
        contact_number: contact_number.trim(),
        is_deleted: false,
        uid: { $ne: uid }
      });

      if (existingContact) {
        return res.status(409).json({ message: "Contact number already exists. Please use a different contact number." });
      }
    }

    // Store old values to check if name or contact changed
    const oldFirstName = user.first_name || '';
    const oldMiddleName = user.middle_name || '';
    const oldLastName = user.last_name || '';
    const oldContact = user.contact_number || '';
    
    // Build old full name for comparison
    const oldFullName = [
      oldFirstName,
      oldMiddleName,
      oldLastName
    ].filter(Boolean).join(' ').trim();

    // Update user fields
    if (first_name !== undefined) user.first_name = first_name;
    if (middle_name !== undefined) user.middle_name = middle_name;
    if (last_name !== undefined) user.last_name = last_name;
    // if (gender !== undefined) user.gender = gender;
    if (contact_number !== undefined) user.contact_number = contact_number.trim();
    // if (civil_status !== undefined) user.civil_status = civil_status;
    if (birthday !== undefined) user.birthday = birthday;
    if (email !== undefined) user.email = email.trim().toLowerCase();
    if (is_priest !== undefined) user.is_priest = is_priest;
    if (previous_parish !== undefined) user.previous_parish = previous_parish || "";
    
    // Handle residency field properly - don't set empty string (not valid enum)
    if (residency !== undefined) {
      if (residency && (residency === "Permanent" || residency === "Floating")) {
        user.residency = residency;
      } else {
        // If not a valid enum value, set to undefined (will be omitted)
        user.residency = undefined;
      }
    }
    
    // If user is not a priest, clear residency and previous_parish
    if (user.is_priest === false) {
      user.residency = undefined;
      if (!previous_parish) {
        user.previous_parish = undefined;
      }
    }

    await user.save();

    // Build the new full name
    const newFullName = [
      user.first_name || '',
      user.middle_name || '',
      user.last_name || ''
    ].filter(Boolean).join(' ').trim();

    // Check if name or contact actually changed
    const nameChanged = newFullName !== oldFullName;
    const contactChanged = (user.contact_number || '') !== oldContact;

    // Update all volunteer records if name or contact changed
    if (nameChanged || contactChanged) {
      try {
        const updateFields = {};
        
        if (nameChanged && newFullName) {
          updateFields.name = newFullName;
        }
        
        if (contactChanged && user.contact_number) {
          updateFields.contact = user.contact_number;
        }

        if (Object.keys(updateFields).length > 0) {
          const updateResult = await VolunteerModel.updateMany(
            { user_id: user.uid },
            { $set: updateFields }
          );
          console.log(`Updated ${updateResult.modifiedCount} volunteer records for user ${user.uid}`);
        }
      } catch (volunteerUpdateError) {
        console.error('Error updating volunteer records:', volunteerUpdateError);
        // Don't fail the user update if volunteer update fails, but log it
      }
    }

    // Get user's volunteers from Volunteer collection
    const userVolunteers = await VolunteerModel.find({ user_id: user.uid });

    const updatedUserData = {
      uid: user.uid,
      email: user.email,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      // gender: user.gender,
      contact_number: user.contact_number,
      // civil_status: user.civil_status,
      birthday: user.birthday,
      is_priest: user.is_priest,
      previous_parish: user.previous_parish,
      residency: user.residency,
      volunteers: userVolunteers || []
    };

    res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUserData,
    });

  } catch (err) {
    console.error("Error:", err);

    // Handle MongoDB duplicate key error
    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      if (field === 'email') {
        return res.status(409).json({ message: "Email already exists. Please use a different email." });
      } else if (field === 'contact_number') {
        return res.status(409).json({ message: "Contact number already exists. Please use a different contact number." });
      }
    }

    res.status(500).json({ message: "Server error. Please try again later." });
  }
}


async function addVolunteer(req, res) {
  try {
    const { uid, volunteer } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required." });
    }

    if (!volunteer) {
      return res.status(400).json({ message: "Volunteer information is required." });
    }

    // Validate required volunteer fields
    if (!volunteer.name || !volunteer.contact) {
      return res.status(400).json({ message: "Name and contact are required." });
    }

    // Find the user
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Check if user has already volunteered/registered for this event
    const existingVolunteer = await VolunteerModel.findOne({
      user_id: uid,
      event_id: volunteer.eventId || null,
      status: { $ne: "cancelled" }
    });

    if (existingVolunteer) {
      return res.status(400).json({ 
        message: volunteer.eventId 
          ? "You have already volunteered/registered for this event." 
          : "You have already signed up as a volunteer." 
      });
    }

    // Create volunteer record in Volunteer collection
    const newVolunteer = new VolunteerModel({
      user_id: uid,
      event_id: volunteer.eventId || null,
      eventTitle: volunteer.eventTitle || "General Volunteer",
      name: volunteer.name,
      contact: volunteer.contact,
      status: "pending",
      registration_type: volunteer.registration_type || "volunteer", // 'participant' or 'volunteer'
    });

    await newVolunteer.save();

    // Notify all admins about the new volunteer
    try {
      const AdminModel = require("../models/Admin");
      const { notifyAllAdmins } = require("../utils/NotificationHelper");
      
      const admins = await AdminModel.find({ is_deleted: false }).select("uid");
      const adminIds = admins.map((admin) => admin.uid);
      if (adminIds.length > 0) {
        const userName = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim();
        const eventInfo = volunteer.eventTitle && volunteer.eventTitle !== 'General Volunteer' 
          ? ` for ${volunteer.eventTitle}` 
          : '';
        
        await notifyAllAdmins(
          adminIds,
          "volunteer",
          "New Volunteer Sign-up",
          `${userName} has signed up to volunteer${eventInfo}.`,
          {
            action: "VolunteersList",
            metadata: {
              volunteer_id: newVolunteer._id.toString(),
              user_id: uid,
              user_name: userName,
              event_title: volunteer.eventTitle || 'General Volunteer',
            },
            priority: "medium",
          }
        );
      }
    } catch (notificationError) {
      console.error("Error sending admin notifications for volunteer:", notificationError);
      // Don't fail the request if notifications fail
    }

    // Get all volunteers for this user to return
    const userVolunteers = await VolunteerModel.find({ user_id: uid });

    const updatedUserData = {
      uid: user.uid,
      email: user.email,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      // gender: user.gender,
      contact_number: user.contact_number,
      // civil_status: user.civil_status,
      birthday: user.birthday,
      is_priest: user.is_priest,
      volunteers: userVolunteers || []
    };

    res.status(200).json({
      message: "Volunteer information added successfully.",
      user: updatedUserData,
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function updateUserStatus(req, res) {
  try {
    const { uid, is_active } = req.body;

    if (!uid || typeof is_active !== "boolean") {
      return res.status(400).json({ message: "User ID and status are required." });
    }

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    user.is_active = is_active;
    
    // Fix residency field if it's an empty string (not a valid enum value)
    // For non-priests, clear residency. For priests, ensure it's valid or undefined
    if (!user.is_priest) {
      // Non-priests shouldn't have residency set
      if (user.residency === "" || !user.residency) {
        user.residency = undefined;
      }
      
    } else {
      // For priests, if residency is empty string, set to undefined
      if (user.residency === "") {
        user.residency = undefined;
      }
    }
    
    await user.save();

    res.status(200).json({
      message: `User account has been ${is_active ? "enabled" : "disabled"} successfully.`,
      user: {
        uid: user.uid,
        email: user.email,
        is_active: user.is_active,
      },
    });

  } catch (err) {
    console.error("Error updating user status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function getAllPriests(req, res) {
  try {
    const priests = await UserModel.find({ 
      is_priest: true, 
      is_deleted: false,
      is_active: true 
    })
    .select('uid first_name middle_name last_name email contact_number')
    .lean();

    const priestsWithFullName = priests.map(priest => ({
      ...priest,
      full_name: `${priest.first_name} ${priest.middle_name || ''} ${priest.last_name}`.trim()
    }));

    res.status(200).json({ 
      message: "Priests retrieved successfully.", 
      priests: priestsWithFullName,
      count: priestsWithFullName.length 
    });

  } catch (err) {
    console.error("Error getting priests:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function archiveUser(req, res) {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (user.is_archived) {
      return res.status(400).json({ message: "User is already archived." });
    }

    // Create a copy of the user data for archive
    const archiveUserData = user.toObject();
    delete archiveUserData._id; // Remove the original _id
    delete archiveUserData.__v; // Remove version key
    
    // Add archive metadata
    archiveUserData.archived_at = new Date();
    archiveUserData.is_archived = true;
    archiveUserData.original_uid = uid; // Keep reference to original uid
    
    // Save to archive collection (ArchiveUsers)
    const archivedUser = new ArchiveUserModel(archiveUserData);
    await archivedUser.save();

    // Mark user as archived in main collection (Users)
    user.is_archived = true;
    user.archived_at = new Date();
    await user.save();

    res.status(200).json({
      message: "User archived successfully. User data has been saved to archive database.",
      user: {
        uid: user.uid,
        email: user.email,
        is_archived: user.is_archived,
        archived_at: user.archived_at,
      },
    });

  } catch (err) {
    console.error("Error archiving user:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function unarchiveUser(req, res) {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required." });
    }

    // Find the user in main collection
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.is_archived) {
      return res.status(400).json({ message: "User is not archived." });
    }

    // Unarchive the user - just update the flag
    // Keep the archive record for history
    user.is_archived = false;
    user.archived_at = null;
    await user.save();

    res.status(200).json({
      message: "User unarchived successfully. User has been restored to active users.",
      user: {
        uid: user.uid,
        email: user.email,
        is_archived: user.is_archived,
        archived_at: user.archived_at,
      },
    });

  } catch (err) {
    console.error("Error unarchiving user:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function resetUserPassword(req, res) {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (!user.email) {
      return res.status(400).json({ message: "User email not found." });
    }

    // Generate password reset link using Firebase Admin SDK
    const admin = require("../config/firebaseAdmin");
    try {
      const resetLink = await admin.auth().generatePasswordResetLink(user.email);
      
      // Note: In a production environment, you would send this link via email
      // For now, we'll use Firebase's built-in sendPasswordResetEmail from the client side
      // This endpoint just validates the user exists
      
      res.status(200).json({
        message: "Password reset email will be sent to the user.",
        email: user.email,
        success: true,
      });

    } catch (firebaseError) {
      console.error("Firebase password reset error:", firebaseError);
      return res.status(500).json({ 
        message: "Failed to generate password reset link. Please try again." 
      });
    }

  } catch (err) {
    console.error("Error resetting user password:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = { createUser, findUser, login, getAllUsers, checkEmailExists, checkContactExists, updateUser, addVolunteer, updateUserRole, updateUserStatus, getAllPriests, archiveUser, unarchiveUser, resetUserPassword }
