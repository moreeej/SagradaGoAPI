const UserModel = require("../models/User");

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

    const newDonation = {
      amount: parseFloat(amount),
      paymentMethod,
      intercession: intercession || "",
      status: "pending",
    };

    user.donations.push(newDonation);
    await user.save();

    const savedDonation = user.donations[user.donations.length - 1];

    res.status(201).json({
      message: "Donation created successfully.",
      donation: savedDonation,
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

    const user = await UserModel.findOne({ uid, is_deleted: false })
      .select("donations");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

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

    const user = await UserModel.findOne({ uid, is_deleted: false })
      .select("donations");

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

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

/**
 * Update donation status (for admin use)
 * PUT /api/updateDonationStatus
 * Body: { uid, donationId, status }
 */
async function updateDonationStatus(req, res) {
  try {
    const { uid, donationId, status } = req.body;

    if (!uid || !donationId || !status) {
      return res.status(400).json({ 
        message: "User ID, donation ID, and status are required." 
      });
    }

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Status must be one of: ${validStatuses.join(", ")}` 
      });
    }

    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const donation = user.donations.id(donationId);

    if (!donation) {
      return res.status(404).json({ message: "Donation not found." });
    }

    donation.status = status;
    await user.save();

    res.status(200).json({
      message: "Donation status updated successfully.",
      donation,
    });

  } catch (err) {
    console.error("Error updating donation status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  createDonation,
  getUserDonations,
  getDonationStats,
  updateDonationStatus,
};

