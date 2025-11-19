const UserModel = require("../models/User");
const DonationModel = require("../models/Donation");
const AdminModel = require("../models/Admin");
const { notifyAllAdmins } = require("../utils/NotificationHelper");

/**
 * Create a new donation for a user
 * POST /api/createDonation
 * Body: { uid, amount, paymentMethod, intercession (optional) }
 */
async function createDonation(req, res) {
  try {
    const { uid, amount, paymentMethod, intercession } = req.body;

    // Validate required fields
    if (!uid) {
      return res.status(400).json({ message: "User ID (uid) is required." });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid donation amount is required." });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: "Payment method is required." });
    }

    // Validate payment method
    const validPaymentMethods = ["GCash", "Cash", "In Kind"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        message: `Payment method must be one of: ${validPaymentMethods.join(", ")}` 
      });
    }

    // Find the user
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Get user's full name
    const userName = [user.first_name, user.middle_name, user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    // First, save to main Donation collection (for admin approval)
    const newDonation = new DonationModel({
      user_id: uid,
      user_name: userName,
      user_email: user.email,
      amount: parseFloat(amount),
      paymentMethod,
      intercession: intercession || "",
      status: "pending",
    });

    await newDonation.save();

    // Then, save to User's donations subcollection (for user's donation history)
    // Include the main donation _id as a reference for consistency
    const donationData = {
      amount: parseFloat(amount),
      paymentMethod,
      intercession: intercession || "",
      status: "pending",
      donation_id: newDonation._id.toString(), // Reference to main donation collection
    };

    user.donations.push(donationData);
    await user.save();
    const userDonation = user.donations[user.donations.length - 1];

    // Notify all admins about the new donation
    try {
      const admins = await AdminModel.find({ is_deleted: false }).select("uid");
      const adminIds = admins.map(admin => admin.uid);

      if (adminIds.length > 0) {
        await notifyAllAdmins(
          adminIds,
          "donation_status",
          "New Donation Received",
          `${userName} has submitted a donation of PHP ${parseFloat(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} via ${paymentMethod}.`,
          {
            action: "DonationsScreen", // Assuming admin has a donations screen
            metadata: {
              donation_id: newDonation._id.toString(),
              user_id: uid,
              user_name: userName,
              amount: parseFloat(amount),
              paymentMethod: paymentMethod,
            },
            priority: "medium",
          }
        );
      }
    } catch (notificationError) {
      // Log error but don't fail the donation creation
      console.error("Error creating admin notifications for donation:", notificationError);
    }

    res.status(201).json({
      message: "Donation created successfully. It has been saved to your donation history and submitted for admin approval.",
      donation: userDonation, // Return the subcollection version for user
      mainDonationId: newDonation._id, // Also return the main donation ID
    });

  } catch (err) {
    console.error("Error creating donation:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all donations for a user
 * POST /api/getUserDonations
 * Body: { uid }
 */
async function getUserDonations(req, res) {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID (uid) is required." });
    }

    // Find the user and get donations from subcollection
    const user = await UserModel.findOne({ uid, is_deleted: false })
      .select("donations");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Sort donations by date (newest first)
    const sortedDonations = user.donations.sort((a, b) => {
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    res.status(200).json({
      message: "Donations retrieved successfully.",
      donations: sortedDonations,
      count: sortedDonations.length,
    });

  } catch (err) {
    console.error("Error getting donations:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get donation statistics for a user (total amount, count, etc.)
 * POST /api/getDonationStats
 * Body: { uid }
 */
async function getDonationStats(req, res) {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID (uid) is required." });
    }

    // Find the user
    const user = await UserModel.findOne({ uid, is_deleted: false })
      .select("donations");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Calculate statistics from user's donations subcollection
    const totalAmount = user.donations.reduce((sum, donation) => {
      return sum + (donation.amount || 0);
    }, 0);

    const confirmedDonations = user.donations.filter(
      (donation) => donation.status === "confirmed"
    );
    const confirmedTotal = confirmedDonations.reduce((sum, donation) => {
      return sum + (donation.amount || 0);
    }, 0);

    const stats = {
      totalDonations: user.donations.length,
      totalAmount: totalAmount,
      confirmedCount: confirmedDonations.length,
      confirmedTotal: confirmedTotal,
      pendingCount: user.donations.filter((d) => d.status === "pending").length,
    };

    res.status(200).json({
      message: "Donation statistics retrieved successfully.",
      stats,
    });

  } catch (err) {
    console.error("Error getting donation stats:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  createDonation,
  getUserDonations,
  getDonationStats,
};

