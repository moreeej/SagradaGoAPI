const DonationModel = require("../models/Donation");
const UserModel = require("../models/User");

/**
 * Get all donations (for admin)
 * GET /api/admin/getAllDonations
 * Query params: status (optional), page (optional), limit (optional)
 */
async function getAllDonations(req, res) {
  try {
    const { status, page = 1, limit = 50 } = req.query;

    // Build query
    const query = { is_deleted: false };
    if (status) {
      query.status = status;
    }

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get donations with pagination
    const donations = await DonationModel.find(query)
      .sort({ createdAt: -1 }) // Newest first
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count
    const totalCount = await DonationModel.countDocuments(query);

    // Get statistics
    const stats = {
      total: await DonationModel.countDocuments({ is_deleted: false }),
      pending: await DonationModel.countDocuments({ status: "pending", is_deleted: false }),
      confirmed: await DonationModel.countDocuments({ status: "confirmed", is_deleted: false }),
      cancelled: await DonationModel.countDocuments({ status: "cancelled", is_deleted: false }),
    };

    res.status(200).json({
      message: "Donations retrieved successfully.",
      donations,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: totalCount,
        pages: Math.ceil(totalCount / parseInt(limit)),
      },
      stats,
    });

  } catch (err) {
    console.error("Error getting all donations:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get donation by ID (for admin)
 * GET /api/admin/getDonation/:donationId
 */
async function getDonationById(req, res) {
  try {
    const { donationId } = req.params;

    const donation = await DonationModel.findOne({
      _id: donationId,
      is_deleted: false,
    });

    if (!donation) {
      return res.status(404).json({ message: "Donation not found." });
    }

    res.status(200).json({
      message: "Donation retrieved successfully.",
      donation,
    });

  } catch (err) {
    console.error("Error getting donation:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update donation status (approve/reject)
 * PUT /api/admin/updateDonationStatus
 * Body: { donationId, status }
 */
async function updateDonationStatus(req, res) {
  try {
    const { donationId, status } = req.body;

    if (!donationId || !status) {
      return res.status(400).json({
        message: "Donation ID and status are required.",
      });
    }

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    // Find donation
    const donation = await DonationModel.findOne({
      _id: donationId,
      is_deleted: false,
    });

    if (!donation) {
      return res.status(404).json({ message: "Donation not found." });
    }

    // Update status in Donation collection
    donation.status = status;
    await donation.save();

    // Also update in User's donations subcollection using donation_id reference
    const user = await UserModel.findOne({ 
      uid: donation.user_id, 
      is_deleted: false 
    });

    if (user) {
      // Find the matching donation in user's subcollection using donation_id
      // This is more reliable than time-based matching
      const userDonation = user.donations.find((d) => {
        return d.donation_id && d.donation_id.toString() === donation._id.toString();
      });

      // If donation_id is not found, fallback to matching by amount, paymentMethod, and createdAt
      // (for older donations that might not have donation_id)
      if (!userDonation) {
        const donationDate = new Date(donation.createdAt);
        const matchingDonation = user.donations.find((d) => {
          const userDonationDate = new Date(d.createdAt);
          const timeDiff = Math.abs(donationDate - userDonationDate);
          
          return (
            d.amount === donation.amount &&
            d.paymentMethod === donation.paymentMethod &&
            timeDiff < 60000 // Within 1 minute (to handle slight timing differences)
          );
        });
        
        if (matchingDonation) {
          matchingDonation.status = status;
          // Also add donation_id reference for future updates
          if (!matchingDonation.donation_id) {
            matchingDonation.donation_id = donation._id.toString();
          }
          await user.save();
        }
      } else {
        // Update status using donation_id reference
        userDonation.status = status;
        await user.save();
      }
    }

    res.status(200).json({
      message: `Donation ${status === "confirmed" ? "approved" : status === "cancelled" ? "rejected" : "updated"} successfully.`,
      donation,
    });

  } catch (err) {
    console.error("Error updating donation status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get donations by user ID (for admin)
 * GET /api/admin/getDonationsByUser/:userId
 */
async function getDonationsByUser(req, res) {
  try {
    const { userId } = req.params;

    const donations = await DonationModel.find({
      user_id: userId,
      is_deleted: false,
    }).sort({ createdAt: -1 });

    res.status(200).json({
      message: "User donations retrieved successfully.",
      donations,
      count: donations.length,
    });

  } catch (err) {
    console.error("Error getting user donations:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get donation statistics (for admin dashboard)
 * GET /api/admin/getDonationStatistics
 */
async function getDonationStatistics(req, res) {
  try {
    const totalDonations = await DonationModel.countDocuments({ is_deleted: false });
    const pendingDonations = await DonationModel.countDocuments({
      status: "pending",
      is_deleted: false,
    });
    const confirmedDonations = await DonationModel.countDocuments({
      status: "confirmed",
      is_deleted: false,
    });
    const cancelledDonations = await DonationModel.countDocuments({
      status: "cancelled",
      is_deleted: false,
    });

    // Calculate total amounts
    const allDonations = await DonationModel.find({ is_deleted: false });
    const totalAmount = allDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const confirmedAmount = allDonations
      .filter((d) => d.status === "confirmed")
      .reduce((sum, d) => sum + (d.amount || 0), 0);
    const pendingAmount = allDonations
      .filter((d) => d.status === "pending")
      .reduce((sum, d) => sum + (d.amount || 0), 0);

    // Get recent donations (last 10)
    const recentDonations = await DonationModel.find({ is_deleted: false })
      .sort({ createdAt: -1 })
      .limit(10);

    const stats = {
      counts: {
        total: totalDonations,
        pending: pendingDonations,
        confirmed: confirmedDonations,
        cancelled: cancelledDonations,
      },
      amounts: {
        total: totalAmount,
        confirmed: confirmedAmount,
        pending: pendingAmount,
      },
      recentDonations,
    };

    res.status(200).json({
      message: "Donation statistics retrieved successfully.",
      stats,
    });

  } catch (err) {
    console.error("Error getting donation statistics:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  getAllDonations,
  getDonationById,
  updateDonationStatus,
  getDonationsByUser,
  getDonationStatistics,
};

