const WeddingModel = require("../models/BookWedding");
const BaptismModel = require("../models/BookBaptism");
const BurialModel = require("../models/BookBurial");
const CommunionModel = require("../models/BookCommunion");
const AnointingModel = require("../models/BookAnointing");
const ConfirmationModel = require("../models/BookConfirmation");
const ConfessionModel = require("../models/BookConfession");
const UserModel = require("../models/User");

/**
 * Get all bookings for a specific priest
 * POST /api/getPriestSchedule
 * Body: { priest_id }
 */
async function getPriestSchedule(req, res) {
  try {
    const { priest_id } = req.body;

    if (!priest_id) {
      return res.status(400).json({ message: "Priest ID is required." });
    }

    // Verify the user is a priest
    const priest = await UserModel.findOne({ 
      uid: priest_id, 
      is_priest: true, 
      is_deleted: false 
    });

    if (!priest) {
      return res.status(404).json({ message: "Priest not found." });
    }

    const bookings = [];

    // Fetch all booking types where priest_id matches
    try {
      const weddings = await WeddingModel.find({ 
        priest_id: priest_id,
        status: { $in: ["pending", "confirmed"] } // Only active bookings
      }).sort({ date: 1, time: 1 }).lean();

      weddings.forEach(wedding => {
        bookings.push({
          _id: wedding._id,
          transaction_id: wedding.transaction_id,
          type: 'Wedding',
          sacrament: 'Wedding',
          date: wedding.date,
          time: wedding.time,
          status: wedding.status,
          attendees: wedding.attendees,
          contact_number: wedding.contact_number,
          priest_name: wedding.priest_name,
          priest_id: wedding.priest_id,
          createdAt: wedding.createdAt,
          // Wedding-specific fields
          groom_name: `${wedding.groom_first_name || ''} ${wedding.groom_last_name || ''}`.trim(),
          bride_name: `${wedding.bride_first_name || ''} ${wedding.bride_last_name || ''}`.trim(),
        });
      });
    } catch (err) {
      console.error("Error fetching weddings:", err);
    }

    try {
      const baptisms = await BaptismModel.find({ 
        priest_id: priest_id,
        status: { $in: ["pending", "confirmed"] }
      }).sort({ date: 1, time: 1 }).lean();

      baptisms.forEach(baptism => {
        bookings.push({
          _id: baptism._id,
          transaction_id: baptism.transaction_id,
          type: 'Baptism',
          sacrament: 'Baptism',
          date: baptism.date,
          time: baptism.time,
          status: baptism.status,
          attendees: baptism.attendees,
          contact_number: baptism.contact_number,
          priest_name: baptism.priest_name,
          priest_id: baptism.priest_id,
          createdAt: baptism.createdAt,
          // Baptism-specific fields
          candidate_name: `${baptism.candidate_first_name || ''} ${baptism.candidate_last_name || ''}`.trim(),
          full_name: baptism.full_name,
        });
      });
    } catch (err) {
      console.error("Error fetching baptisms:", err);
    }

    try {
      const burials = await BurialModel.find({ 
        priest_id: priest_id,
        status: { $in: ["pending", "confirmed"] }
      }).sort({ date: 1, time: 1 }).lean();

      burials.forEach(burial => {
        bookings.push({
          _id: burial._id,
          transaction_id: burial.transaction_id,
          type: 'Burial',
          sacrament: 'Burial',
          date: burial.date,
          time: burial.time,
          status: burial.status,
          attendees: burial.attendees,
          contact_number: burial.contact_number,
          priest_name: burial.priest_name,
          priest_id: burial.priest_id,
          createdAt: burial.createdAt,
          // Burial-specific fields
          deceased_name: burial.deceased_name || '',
          full_name: burial.full_name,
        });
      });
    } catch (err) {
      console.error("Error fetching burials:", err);
    }

    try {
      const communions = await CommunionModel.find({ 
        priest_id: priest_id,
        status: { $in: ["pending", "confirmed"] }
      }).sort({ date: 1, time: 1 }).lean();

      communions.forEach(communion => {
        bookings.push({
          _id: communion._id,
          transaction_id: communion.transaction_id,
          type: 'First Communion',
          sacrament: 'First Communion',
          date: communion.date,
          time: communion.time,
          status: communion.status,
          attendees: communion.attendees,
          contact_number: communion.contact_number,
          priest_name: communion.priest_name,
          priest_id: communion.priest_id,
          createdAt: communion.createdAt,
          // Communion-specific fields
          full_name: communion.full_name,
        });
      });
    } catch (err) {
      console.error("Error fetching communions:", err);
    }

    try {
      const anointings = await AnointingModel.find({ 
        priest_id: priest_id,
        status: { $in: ["pending", "confirmed"] }
      }).sort({ date: 1, time: 1 }).lean();

      anointings.forEach(anointing => {
        bookings.push({
          _id: anointing._id,
          transaction_id: anointing.transaction_id,
          type: 'Anointing of the Sick',
          sacrament: 'Anointing of the Sick',
          date: anointing.date,
          time: anointing.time,
          status: anointing.status,
          attendees: anointing.attendees,
          contact_number: anointing.contact_number,
          priest_name: anointing.priest_name,
          priest_id: anointing.priest_id,
          createdAt: anointing.createdAt,
          // Anointing-specific fields
          full_name: anointing.full_name,
          medical_condition: anointing.medical_condition || '',
        });
      });
    } catch (err) {
      console.error("Error fetching anointings:", err);
    }

    try {
      const confirmations = await ConfirmationModel.find({ 
        priest_id: priest_id,
        status: { $in: ["pending", "confirmed"] }
      }).sort({ date: 1, time: 1 }).lean();

      confirmations.forEach(confirmation => {
        bookings.push({
          _id: confirmation._id,
          transaction_id: confirmation.transaction_id,
          type: 'Confirmation',
          sacrament: 'Confirmation',
          date: confirmation.date,
          time: confirmation.time,
          status: confirmation.status,
          attendees: confirmation.attendees,
          contact_number: confirmation.contact_number,
          priest_name: confirmation.priest_name,
          priest_id: confirmation.priest_id,
          createdAt: confirmation.createdAt,
          // Confirmation-specific fields
          full_name: confirmation.full_name,
        });
      });
    } catch (err) {
      console.error("Error fetching confirmations:", err);
    }

    try {
      const confessions = await ConfessionModel.find({ 
        priest_id: priest_id,
        status: { $in: ["pending", "confirmed"] }
      }).sort({ date: 1, time: 1 }).lean();

      confessions.forEach(confession => {
        bookings.push({
          _id: confession._id,
          transaction_id: confession.transaction_id,
          type: 'Confession',
          sacrament: 'Confession',
          date: confession.date,
          time: confession.time,
          status: confession.status,
          contact_number: confession.contact_number,
          priest_name: confession.priest_name,
          priest_id: confession.priest_id,
          createdAt: confession.createdAt,
          // Confession-specific fields
          full_name: confession.full_name,
          attendees: 1, // Confessions typically don't have attendees field
        });
      });
    } catch (err) {
      console.error("Error fetching confessions:", err);
    }

    // Sort all bookings by date and time
    bookings.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA.getTime() - dateB.getTime();
      }
      // If same date, sort by time
      const timeA = new Date(a.time || a.date).getTime();
      const timeB = new Date(b.time || b.date).getTime();
      return timeA - timeB;
    });

    res.status(200).json({
      message: "Priest schedule retrieved successfully.",
      bookings,
      count: bookings.length,
    });

  } catch (err) {
    console.error("Error getting priest schedule:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  getPriestSchedule,
};
