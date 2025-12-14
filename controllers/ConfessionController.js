const ConfessionModel = require("../models/BookConfession");
const UserModel = require("../models/User");
const { notifyUser } = require("../utils/NotificationHelper");

/**
 * Normalize time to HH:MM format
 * Handles ISO strings, Date objects, or already formatted HH:MM strings
 */
function normalizeTime(time) {
  if (!time) return '';
  
  // If already in HH:MM format, return as is
  if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) {
    return time;
  }
  
  // If it's a Date object or ISO string, extract hours and minutes
  let dateObj;
  if (time instanceof Date) {
    dateObj = time;
  } else if (typeof time === 'string') {
    // Try to parse as Date
    dateObj = new Date(time);
    if (isNaN(dateObj.getTime())) {
      // If parsing fails, try to extract HH:MM from string
      const timeMatch = time.match(/(\d{2}):(\d{2})/);
      if (timeMatch) {
        return `${timeMatch[1]}:${timeMatch[2]}`;
      }
      return time; // Return as is if we can't parse it
    }
  } else {
    return String(time);
  }
  
  // Format as HH:MM
  const hours = dateObj.getHours().toString().padStart(2, '0');
  const minutes = dateObj.getMinutes().toString().padStart(2, '0');
  return `${hours}:${minutes}`;
}

// Create a new Confession booking
const createConfession = async (req, res) => {
  try {
    const { uid, full_name, email, date, time, attendees } = req.body;

    // Confession is free, generate a dummy transaction_id
    const transaction_id = `CONF-${Date.now()}`;

    const booking = await ConfessionModel.create({
      uid,
      full_name,
      email,
      transaction_id,
      date,
      time: normalizeTime(time),
      attendees,
    });

    res.status(201).json({ success: true, booking });
  } catch (err) {
    console.error("Confession booking error:", err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all confession bookings of a user
const getUserConfessions = async (req, res) => {
  try {
    const { uid } = req.body;   // ✅ read from POST body
    console.log("Fetching confessions for uid:", uid);

    const bookings = await ConfessionModel.find({ uid }).sort({ createdAt: -1 });
    console.log("Found bookings:", bookings.length);

    res.json({ success: true, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get single confession booking by ID
const getConfession = async (req, res) => {
  try {
    const { id } = req.params;
    const booking = await ConfessionModel.findById(id);
    if (!booking) return res.status(404).json({ success: false, message: "Booking not found" });
    res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Update confession status (pending, confirmed, cancelled)
const updateConfessionStatus = async (req, res) => {
  try {
    const { transaction_id, status, priest_id, priest_name } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ success: false, message: "Transaction ID is required" });
    }

    if (!["pending", "confirmed", "cancelled"].includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status" });
    }

    const booking = await ConfessionModel.findOne({ transaction_id });

    if (!booking) {
      return res.status(404).json({ success: false, message: "Booking not found" });
    }

    booking.status = status;
    
    // Assign priest when confirming
    if (status === "confirmed" && priest_id) {
      booking.priest_id = priest_id;
      if (priest_name) {
        booking.priest_name = priest_name;
      } else if (priest_id) {
        // Fetch priest name if not provided
        const priest = await UserModel.findOne({ uid: priest_id, is_priest: true, is_deleted: false });
        if (priest) {
          booking.priest_name = `${priest.first_name} ${priest.middle_name || ''} ${priest.last_name}`.trim();
        }
      }
    }
    
    await booking.save();

    // Send notifications when booking is confirmed
    if (status === "confirmed") {
      try {
        const bookingDate = new Date(booking.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const bookingTime = booking.time || "N/A";

        // Notify the user
        if (booking.uid) {
          await notifyUser(
            booking.uid,
            "booking_status",
            "Confession Booking Confirmed",
            `Your Confession booking (${booking.transaction_id}) has been confirmed. Date: ${bookingDate}, Time: ${bookingTime}${booking.priest_name ? `, Priest: ${booking.priest_name}` : ""}.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: booking.transaction_id,
                booking_type: "Confession",
                date: booking.date,
                time: booking.time,
              },
              priority: "high",
            }
          );
        }

        // Notify the priest
        if (priest_id) {
          await notifyUser(
            priest_id,
            "booking_status",
            "New Confession Assignment",
            `You have been assigned to a Confession booking (${booking.transaction_id}). Date: ${bookingDate}, Time: ${bookingTime}.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: booking.transaction_id,
                booking_type: "Confession",
                date: booking.date,
                time: booking.time,
              },
              priority: "high",
            }
          );
        }
      } catch (notificationError) {
        console.error("Error sending notifications:", notificationError);
        // Don't fail the request if notifications fail
      }
    }

    res.json({ success: true, booking });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

// Get all confession bookings (admin)
const getAllConfessions = async (req, res) => {
  try {
    const bookings = await ConfessionModel.find().sort({ createdAt: -1 });
    res.json({ success: true, bookings });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: err.message });
  }
};

module.exports = {
  ConfessionModel,
  createConfession,
  getUserConfessions,
  getConfession,
  updateConfessionStatus,
  getAllConfessions,
};
