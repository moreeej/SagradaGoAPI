const AIService = require("../services/AIService");
const UserModel = require("../models/User");
const DonationModel = require("../models/Donation");
const VolunteerModel = require("../models/Volunteer");
const WeddingModel = require("../models/BookWedding");
const BaptismModel = require("../models/BookBaptism");
const BurialModel = require("../models/BookBurial");
const CommunionModel = require("../models/BookCommunion");
const ConfirmationModel = require("../models/BookConfirmation");
const AnointingModel = require("../models/BookAnointing");
const ConfessionModel = require("../models/BookConfession");

/**
 * Get AI-powered analysis of dashboard statistics
 */
async function getAIStatsAnalysis(req, res) {
  try {
    // Get users data
    const users = await UserModel.find({ is_deleted: false }).lean();
    const priests = users.filter((user) => user.is_priest === true);
    const regularUsers = users.filter((user) => !user.is_priest);

    // Get donation statistics
    const allDonations = await DonationModel.find({ is_deleted: false }).lean();
    const totalDonations = allDonations.length;
    const pendingDonations = allDonations.filter((d) => d.status === "pending");
    const confirmedDonations = allDonations.filter((d) => d.status === "confirmed");
    
    const totalAmount = allDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const confirmedAmount = confirmedDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
    const pendingAmount = pendingDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

    // Get monthly donations breakdown (last 12 months)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const monthlyDonations = confirmedDonations.filter((d) => {
      const donationDate = d.createdAt ? new Date(d.createdAt) : null;
      return donationDate && donationDate >= startOfMonth && donationDate < endOfMonth;
    });
    const monthlyAmount = monthlyDonations.reduce((sum, d) => sum + (d.amount || 0), 0);

    // Calculate monthly donation breakdown for last 12 months
    const monthlyDonationBreakdown = [];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      
      const monthDonations = confirmedDonations.filter((d) => {
        const donationDate = d.createdAt ? new Date(d.createdAt) : null;
        return donationDate && donationDate >= monthStart && donationDate < monthEnd;
      });
      
      const monthAmount = monthDonations.reduce((sum, d) => sum + (d.amount || 0), 0);
      
      monthlyDonationBreakdown.push({
        month: monthNames[monthDate.getMonth()],
        year: monthDate.getFullYear(),
        amount: monthAmount,
        count: monthDonations.length,
      });
    }

    // Find peak donation months
    const sortedDonationMonths = [...monthlyDonationBreakdown].sort((a, b) => b.amount - a.amount);
    const topDonationMonths = sortedDonationMonths.slice(0, 3);

    // Get all bookings
    const [weddings, baptisms, burials, communions, confirmations, anointings, confessions] = await Promise.all([
      WeddingModel.find({ is_deleted: false }).lean().catch(() => []),
      BaptismModel.find({ is_deleted: false }).lean().catch(() => []),
      BurialModel.find({ is_deleted: false }).lean().catch(() => []),
      CommunionModel.find({ is_deleted: false }).lean().catch(() => []),
      ConfirmationModel.find({ is_deleted: false }).lean().catch(() => []),
      AnointingModel.find({ is_deleted: false }).lean().catch(() => []),
      ConfessionModel.find({ is_deleted: false }).lean().catch(() => []),
    ]);

    const allBookings = [
      ...weddings.map((b) => ({ ...b, bookingType: "Wedding" })),
      ...baptisms.map((b) => ({ ...b, bookingType: "Baptism" })),
      ...burials.map((b) => ({ ...b, bookingType: "Burial" })),
      ...communions.map((b) => ({ ...b, bookingType: "Communion" })),
      ...confirmations.map((b) => ({ ...b, bookingType: "Confirmation" })),
      ...anointings.map((b) => ({ ...b, bookingType: "Anointing" })),
      ...confessions.map((b) => ({ ...b, bookingType: "Confession" })),
    ];

    const pendingBookings = allBookings.filter((b) => (b.status || "").toLowerCase() === "pending");
    const confirmedBookings = allBookings.filter((b) => (b.status || "").toLowerCase() === "confirmed");

    // Calculate monthly booking breakdown (last 12 months) to find busiest months
    const monthlyBookingBreakdown = [];
    
    for (let i = 11; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1);
      
      const monthBookings = confirmedBookings.filter((b) => {
        let bookingDate = null;
        if (b.date) {
          bookingDate = new Date(b.date);
        } else if (b.createdAt) {
          bookingDate = new Date(b.createdAt);
        }
        
        if (!bookingDate || isNaN(bookingDate.getTime())) {
          return false;
        }
        
        return bookingDate >= monthStart && bookingDate < monthEnd;
      });
      
      // Breakdown by booking type for this month
      const monthBookingByType = {};
      monthBookings.forEach((booking) => {
        const type = booking.bookingType || "Unknown";
        monthBookingByType[type] = (monthBookingByType[type] || 0) + 1;
      });
      
      monthlyBookingBreakdown.push({
        month: monthNames[monthDate.getMonth()],
        year: monthDate.getFullYear(),
        total: monthBookings.length,
        byType: monthBookingByType,
      });
    }

    // Find busiest booking months
    const sortedBookingMonths = [...monthlyBookingBreakdown].sort((a, b) => b.total - a.total);
    const busiestBookingMonths = sortedBookingMonths.slice(0, 3);

    // Get volunteer data
    const volunteers = await VolunteerModel.find({}).lean().catch(() => []);

    // Calculate booking breakdown
    const bookingBreakdown = {
      Wedding: weddings.length,
      Baptism: baptisms.length,
      Burial: burials.length,
      Communion: communions.length,
      Confirmation: confirmations.length,
      Anointing: anointings.length,
      Confession: confessions.length,
    };

    // Prepare stats object
    const stats = {
      totalUsers: regularUsers.length,
      totalPriests: priests.length,
      pendingBookings: pendingBookings.length,
      totalDonations: totalAmount,
      monthlyDonations: monthlyAmount,
      totalVolunteers: volunteers.length,
      recentUsersCount: regularUsers.slice(-5).length,
      bookingBreakdown,
      donationBreakdown: {
        total: totalAmount,
        confirmed: confirmedAmount,
        pending: pendingAmount,
        totalCount: totalDonations,
        confirmedCount: confirmedDonations.length,
        pendingCount: pendingDonations.length,
      },
      totalBookings: allBookings.length,
      confirmedBookings: confirmedBookings.length,
      monthlyDonationBreakdown,
      topDonationMonths,
      monthlyBookingBreakdown,
      busiestBookingMonths,
    };

    // Get AI analysis
    const analysis = await AIService.analyzeDashboardStats(stats);

    res.json({
      success: true,
      analysis,
      stats,
    });
  } catch (error) {
    console.error("Error generating AI stats analysis:", error);
    res.status(500).json({
      success: false,
      message: "Failed to generate AI analysis",
      error: error.message,
    });
  }
}

module.exports = {
  getAIStatsAnalysis,
};
