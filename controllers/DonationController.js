const UserModel = require("../models/User");
const DonationModel = require("../models/Donation");

async function createDonation(req, res) {
  try {
    const { uid, amount, paymentMethod, intercession } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID (uid) is required." });
    }

    if (!amount || amount <= 0) {
      return res.status(400).json({ message: "Valid donation amount is required." });
    }

    if (!paymentMethod) {
      return res.status(400).json({ message: "Payment method is required." });
    }

    const validPaymentMethods = ["GCash", "Cash", "In Kind"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({ 
        message: `Payment method must be one of: ${validPaymentMethods.join(", ")}` 
      });
    }

    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    const userName = [user.first_name, user.middle_name, user.last_name]
      .filter(Boolean)
      .join(" ")
      .trim();

    const donationData = {
      amount: parseFloat(amount),
      paymentMethod,
      intercession: intercession || "",
      status: "pending",
    };

    user.donations.push(donationData);
    await user.save();
    const userDonation = user.donations[user.donations.length - 1];

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

    res.status(201).json({
      message: "Donation created successfully.",
      donation: userDonation, 
    });

  } catch (err) {
    console.error("Error creating donation:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

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

module.exports = {
  createDonation,
  getUserDonations,
  getDonationStats,
};

