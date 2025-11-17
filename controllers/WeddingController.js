// const WeddingModel = require("../models/BookWedding");

const WeddingModel = require("../models/BookWedding");
const UserModel = require("../models/User");

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WED-${timestamp}-${random}`;
}

/**
 * Parse full name into first, middle, and last name
 */
function parseFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { first_name: '', middle_name: '', last_name: '' };
  }

  const parts = fullName.trim().split(/\s+/);
  
  if (parts.length === 1) {
    return { first_name: parts[0], middle_name: '', last_name: '' };
  } else if (parts.length === 2) {
    return { first_name: parts[0], middle_name: '', last_name: parts[1] };
  } else {
    const last_name = parts[parts.length - 1];
    const first_name = parts[0];
    const middle_name = parts.slice(1, -1).join(' ');
    return { first_name, middle_name, last_name };
  }
}

/**
 * Create a new wedding booking
 * POST /api/createWedding
 * Body: { uid, date, time, attendees, contact_number, groom_fullname, bride_fullname, 
 *         marriage_license, marriage_contract, groom_1x1, bride_1x1, 
 *         groom_baptismal_cert, bride_baptismal_cert, groom_confirmation_cert, 
 *         bride_confirmation_cert, groom_cenomar, bride_cenomar, 
 *         groom_banns, bride_banns, groom_permission, bride_permission }
 */
async function createWedding(req, res) {
  try {
    const {
      uid,
      date,
      time,
      attendees,
      contact_number,
      groom_fullname,
      bride_fullname,
      marriage_license,
      marriage_contract,
      groom_1x1,
      bride_1x1,
      groom_baptismal_cert,
      bride_baptismal_cert,
      groom_confirmation_cert,
      bride_confirmation_cert,
      groom_cenomar,
      bride_cenomar,
      groom_banns,
      bride_banns,
      groom_permission,
      bride_permission,
    } = req.body;

    // Validate required fields
    if (!uid) {
      return res.status(400).json({ message: "User ID (uid) is required." });
    }

    if (!date) {
      return res.status(400).json({ message: "Wedding date is required." });
    }

    if (!time) {
      return res.status(400).json({ message: "Wedding time is required." });
    }

    if (!attendees || attendees <= 0) {
      return res.status(400).json({ message: "Valid number of attendees is required." });
    }

    if (!contact_number) {
      return res.status(400).json({ message: "Contact number is required." });
    }

    if (!groom_fullname) {
      return res.status(400).json({ message: "Groom full name is required." });
    }

    if (!bride_fullname) {
      return res.status(400).json({ message: "Bride full name is required." });
    }

    if (!groom_1x1) {
      return res.status(400).json({ message: "Groom 1x1 photo is required." });
    }

    if (!bride_1x1) {
      return res.status(400).json({ message: "Bride 1x1 photo is required." });
    }

    if (!marriage_license && !marriage_contract) {
      return res.status(400).json({ message: "Marriage license or contract is required." });
    }

    if (!groom_baptismal_cert) {
      return res.status(400).json({ message: "Groom baptismal certificate is required." });
    }

    if (!bride_baptismal_cert) {
      return res.status(400).json({ message: "Bride baptismal certificate is required." });
    }

    if (!groom_confirmation_cert) {
      return res.status(400).json({ message: "Groom confirmation certificate is required." });
    }

    if (!bride_confirmation_cert) {
      return res.status(400).json({ message: "Bride confirmation certificate is required." });
    }

    // Verify user exists
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Parse full names
    const groomName = parseFullName(groom_fullname);
    const brideName = parseFullName(bride_fullname);

    // Use marriage_license if available, otherwise use marriage_contract
    const marriage_docu = marriage_license || marriage_contract;

    // Generate transaction ID
    const transaction_id = generateTransactionId();

    // Create wedding booking
    const weddingData = {
      transaction_id,
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      contact_number: contact_number.trim(),
      groom_first_name: groomName.first_name,
      groom_middle_name: groomName.middle_name,
      groom_last_name: groomName.last_name,
      groom_pic: groom_1x1,
      bride_first_name: brideName.first_name,
      bride_middle_name: brideName.middle_name,
      bride_last_name: brideName.last_name,
      bride_pic: bride_1x1,
      marriage_docu,
      groom_cenomar: groom_cenomar || '',
      bride_cenomar: bride_cenomar || '',
      groom_baptismal_cert,
      bride_baptismal_cert,
      groom_confirmation_cert,
      bride_confirmation_cert,
      groom_permission: groom_permission || groom_banns || '',
      bride_permission: bride_permission || bride_banns || '',
      status: "pending",
    };

    const newWedding = new WeddingModel(weddingData);
    await newWedding.save();

    res.status(201).json({
      message: "Wedding booking created successfully.",
      wedding: newWedding,
      transaction_id,
    });

  } catch (err) {
    console.error("Error creating wedding booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all wedding bookings for a user
 * POST /api/getUserWeddings
 * Body: { uid }
 */
async function getUserWeddings(req, res) {
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

    // Get user's contact number to match wedding bookings
    const contactNumber = user.contact_number;

    // Find all wedding bookings for this user's contact number
    const weddings = await WeddingModel.find({ contact_number: contactNumber })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Wedding bookings retrieved successfully.",
      weddings,
      count: weddings.length,
    });

  } catch (err) {
    console.error("Error getting wedding bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get a specific wedding booking by transaction ID
 * POST /api/getWedding
 * Body: { transaction_id }
 */
async function getWedding(req, res) {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    const wedding = await WeddingModel.findOne({ transaction_id });

    if (!wedding) {
      return res.status(404).json({ message: "Wedding booking not found." });
    }

    res.status(200).json({
      message: "Wedding booking retrieved successfully.",
      wedding,
    });

  } catch (err) {
    console.error("Error getting wedding booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update wedding booking status
 * PUT /api/updateWeddingStatus
 * Body: { transaction_id, status }
 */
async function updateWeddingStatus(req, res) {
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

    const wedding = await WeddingModel.findOne({ transaction_id });

    if (!wedding) {
      return res.status(404).json({ message: "Wedding booking not found." });
    }

    wedding.status = status;
    await wedding.save();

    res.status(200).json({
      message: "Wedding booking status updated successfully.",
      wedding,
    });

  } catch (err) {
    console.error("Error updating wedding status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all wedding bookings (admin function)
 * GET /api/getAllWeddings
 */
async function getAllWeddings(req, res) {
  try {
    const weddings = await WeddingModel.find()
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "All wedding bookings retrieved successfully.",
      weddings,
      count: weddings.length,
    });

  } catch (err) {
    console.error("Error getting all wedding bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  createWedding,
  getUserWeddings,
  getWedding,
  updateWeddingStatus,
  getAllWeddings,
};

