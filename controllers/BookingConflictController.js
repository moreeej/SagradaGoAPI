const WeddingModel = require("../models/BookWedding");
const BaptismModel = require("../models/BookBaptism");
const BurialModel = require("../models/BookBurial");
const CommunionModel = require("../models/BookCommunion");
const ConfirmationModel = require("../models/BookConfirmation");
const AnointingModel = require("../models/BookAnointing");
const ConfessionModel = require("../models/BookConfession");

/**
 * Check for booking conflicts across all sacrament types
 * Returns true if there's a conflict (same day and time within 1 hour)
 */
async function checkBookingConflict(req, res) {
  try {
    const { date, time, datetime } = req.body;

    if (!date && !datetime) {
      return res.status(400).json({ 
        hasConflict: false,
        message: "Date or datetime is required" 
      });
    }

    // Parse the date and time
    let selectedDateTime;
    if (datetime) {
      selectedDateTime = new Date(datetime);
    } else if (date && time) {
      // Combine date and time strings
      const dateStr = new Date(date);
      const timeStr = new Date(time);
      selectedDateTime = new Date(dateStr);
      selectedDateTime.setHours(timeStr.getHours());
      selectedDateTime.setMinutes(timeStr.getMinutes());
      selectedDateTime.setSeconds(0);
      selectedDateTime.setMilliseconds(0);
    } else {
      return res.status(400).json({ 
        hasConflict: false,
        message: "Either datetime or both date and time are required" 
      });
    }

    // Normalize to start of the hour for comparison
    selectedDateTime.setSeconds(0);
    selectedDateTime.setMilliseconds(0);

    // Get the date string for same-day comparison
    const selectedDateStr = selectedDateTime.toISOString().split('T')[0];

    // Array to store all bookings from all models
    const allBookings = [];

    // Fetch bookings from all models (excluding cancelled/rejected)
    try {
      // Wedding bookings
      const weddings = await WeddingModel.find({
        status: { $nin: ['cancelled', 'rejected'] },
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id uid full_name');

      weddings.forEach(booking => {
        allBookings.push({
          date: booking.date,
          time: booking.time,
          sacrament: 'Wedding',
          transaction_id: booking.transaction_id,
          uid: booking.uid,
          full_name: booking.full_name
        });
      });
    } catch (error) {
      console.error('Error fetching weddings:', error);
    }

    try {
      // Baptism bookings
      const baptisms = await BaptismModel.find({
        status: { $nin: ['cancelled', 'rejected'] },
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id uid full_name');

      baptisms.forEach(booking => {
        allBookings.push({
          date: booking.date,
          time: booking.time,
          sacrament: 'Baptism',
          transaction_id: booking.transaction_id,
          uid: booking.uid,
          full_name: booking.full_name
        });
      });
    } catch (error) {
      console.error('Error fetching baptisms:', error);
    }

    try {
      // Burial bookings
      const burials = await BurialModel.find({
        status: { $nin: ['cancelled', 'rejected'] },
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id uid full_name');

      burials.forEach(booking => {
        allBookings.push({
          date: booking.date,
          time: booking.time,
          sacrament: 'Burial',
          transaction_id: booking.transaction_id,
          uid: booking.uid,
          full_name: booking.full_name
        });
      });
    } catch (error) {
      console.error('Error fetching burials:', error);
    }

    try {
      // Communion bookings
      const communions = await CommunionModel.find({
        status: { $nin: ['cancelled', 'rejected'] },
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id uid full_name');

      communions.forEach(booking => {
        allBookings.push({
          date: booking.date,
          time: booking.time,
          sacrament: 'First Communion',
          transaction_id: booking.transaction_id,
          uid: booking.uid,
          full_name: booking.full_name
        });
      });
    } catch (error) {
      console.error('Error fetching communions:', error);
    }

    try {
      // Confirmation bookings
      const confirmations = await ConfirmationModel.find({
        status: { $nin: ['cancelled', 'rejected'] },
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id uid full_name');

      confirmations.forEach(booking => {
        allBookings.push({
          date: booking.date,
          time: booking.time,
          sacrament: 'Confirmation',
          transaction_id: booking.transaction_id,
          uid: booking.uid,
          full_name: booking.full_name
        });
      });
    } catch (error) {
      console.error('Error fetching confirmations:', error);
    }

    try {
      // Anointing bookings
      const anointings = await AnointingModel.find({
        status: { $nin: ['cancelled', 'rejected'] },
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id uid full_name');

      anointings.forEach(booking => {
        allBookings.push({
          date: booking.date,
          time: booking.time,
          sacrament: 'Anointing of the Sick',
          transaction_id: booking.transaction_id,
          uid: booking.uid,
          full_name: booking.full_name
        });
      });
    } catch (error) {
      console.error('Error fetching anointings:', error);
    }

    try {
      // Confession bookings
      const confessions = await ConfessionModel.find({
        status: { $nin: ['cancelled', 'rejected'] },
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id uid full_name');

      confessions.forEach(booking => {
        allBookings.push({
          date: booking.date,
          time: booking.time,
          sacrament: 'Confession',
          transaction_id: booking.transaction_id,
          uid: booking.uid,
          full_name: booking.full_name
        });
      });
    } catch (error) {
      console.error('Error fetching confessions:', error);
    }

    // Check for conflicts
    for (const booking of allBookings) {
      if (!booking.date || !booking.time) continue;

      // Parse booking date and time
      let bookingDate;
      let bookingDateTime;

      // Handle different date/time formats
      if (booking.date instanceof Date) {
        bookingDate = new Date(booking.date);
      } else {
        bookingDate = new Date(booking.date);
      }

      // Get booking date string
      const bookingDateStr = bookingDate.toISOString().split('T')[0];

      // Check if same day
      if (bookingDateStr === selectedDateStr) {
        // Combine booking date and time
        bookingDateTime = new Date(bookingDate);
        
        // Parse time - it could be a Date object, ISO string, or time string
        if (booking.time instanceof Date) {
          // If time is already a Date object
          bookingDateTime.setHours(booking.time.getHours());
          bookingDateTime.setMinutes(booking.time.getMinutes());
        } else if (typeof booking.time === 'string') {
          // If time is a string (could be ISO string or "HH:mm" format)
          const timeStr = booking.time;
          
          // Check if it's an ISO string (contains 'T' or is a full datetime)
          if (timeStr.includes('T') || timeStr.includes('Z') || timeStr.includes('+')) {
            const timeDate = new Date(timeStr);
            if (!isNaN(timeDate.getTime())) {
              bookingDateTime.setHours(timeDate.getHours());
              bookingDateTime.setMinutes(timeDate.getMinutes());
            }
          } else {
            // Try to parse as "HH:mm" or "HH:mm:ss"
            const timeParts = timeStr.split(':');
            if (timeParts.length >= 2) {
              const hours = parseInt(timeParts[0], 10);
              const minutes = parseInt(timeParts[1], 10);
              if (!isNaN(hours) && !isNaN(minutes)) {
                bookingDateTime.setHours(hours);
                bookingDateTime.setMinutes(minutes);
              }
            }
          }
        } else {
          // Try to convert to Date
          const timeDate = new Date(booking.time);
          if (!isNaN(timeDate.getTime())) {
            bookingDateTime.setHours(timeDate.getHours());
            bookingDateTime.setMinutes(timeDate.getMinutes());
          }
        }
        
        bookingDateTime.setSeconds(0);
        bookingDateTime.setMilliseconds(0);

        // Calculate time difference in hours
        const timeDiff = Math.abs(selectedDateTime.getTime() - bookingDateTime.getTime());
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // If within 1 hour, consider it a conflict
        if (hoursDiff < 1) {
          const conflictDate = bookingDateTime.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          const conflictTime = bookingDateTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });

          return res.json({
            hasConflict: true,
            message: `This time slot conflicts with an existing ${booking.sacrament} booking on ${conflictDate} at ${conflictTime}. Please choose a different date or time.`,
            conflictingBooking: {
              sacrament: booking.sacrament,
              date: conflictDate,
              time: conflictTime,
              transaction_id: booking.transaction_id
            }
          });
        }
      }
    }

    // No conflicts found
    return res.json({
      hasConflict: false,
      message: "No conflicts found. This time slot is available."
    });

  } catch (error) {
    console.error('Error checking booking conflict:', error);
    return res.status(500).json({
      hasConflict: false,
      message: "Error checking for conflicts. Please try again.",
      error: error.message
    });
  }
}

/**
 * Check for priest scheduling conflicts
 * Returns true if the priest already has a confirmed booking at the same date/time (within 1 hour)
 * POST /api/checkPriestConflict
 * Body: { priest_id, date, time, transaction_id (optional - to exclude current booking from check) }
 */
async function checkPriestConflict(req, res) {
  try {
    const { priest_id, date, time, transaction_id } = req.body;

    if (!priest_id) {
      return res.status(400).json({ 
        hasConflict: false,
        message: "Priest ID is required" 
      });
    }

    if (!date && !time) {
      return res.status(400).json({ 
        hasConflict: false,
        message: "Date and time are required" 
      });
    }

    // Parse the date and time
    let selectedDateTime;
    if (date && time) {
      const dateStr = new Date(date);
      const timeStr = new Date(time);
      selectedDateTime = new Date(dateStr);
      selectedDateTime.setHours(timeStr.getHours());
      selectedDateTime.setMinutes(timeStr.getMinutes());
      selectedDateTime.setSeconds(0);
      selectedDateTime.setMilliseconds(0);
    } else {
      return res.status(400).json({ 
        hasConflict: false,
        message: "Both date and time are required" 
      });
    }

    const selectedDateStr = selectedDateTime.toISOString().split('T')[0];

    // Array to store all bookings from all models for this priest
    const priestBookings = [];

    // Fetch confirmed bookings from all models for this priest
    try {
      const weddings = await WeddingModel.find({
        priest_id: priest_id,
        status: 'confirmed',
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id priest_name');

      weddings.forEach(booking => {
        if (!transaction_id || booking.transaction_id !== transaction_id) {
          priestBookings.push({
            date: booking.date,
            time: booking.time,
            sacrament: 'Wedding',
            transaction_id: booking.transaction_id
          });
        }
      });
    } catch (error) {
      console.error('Error fetching weddings:', error);
    }

    try {
      const baptisms = await BaptismModel.find({
        priest_id: priest_id,
        status: 'confirmed',
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id priest_name');

      baptisms.forEach(booking => {
        if (!transaction_id || booking.transaction_id !== transaction_id) {
          priestBookings.push({
            date: booking.date,
            time: booking.time,
            sacrament: 'Baptism',
            transaction_id: booking.transaction_id
          });
        }
      });
    } catch (error) {
      console.error('Error fetching baptisms:', error);
    }

    try {
      const burials = await BurialModel.find({
        priest_id: priest_id,
        status: 'confirmed',
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id priest_name');

      burials.forEach(booking => {
        if (!transaction_id || booking.transaction_id !== transaction_id) {
          priestBookings.push({
            date: booking.date,
            time: booking.time,
            sacrament: 'Burial',
            transaction_id: booking.transaction_id
          });
        }
      });
    } catch (error) {
      console.error('Error fetching burials:', error);
    }

    try {
      const communions = await CommunionModel.find({
        priest_id: priest_id,
        status: 'confirmed',
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id priest_name');

      communions.forEach(booking => {
        if (!transaction_id || booking.transaction_id !== transaction_id) {
          priestBookings.push({
            date: booking.date,
            time: booking.time,
            sacrament: 'First Communion',
            transaction_id: booking.transaction_id
          });
        }
      });
    } catch (error) {
      console.error('Error fetching communions:', error);
    }

    try {
      const confirmations = await ConfirmationModel.find({
        priest_id: priest_id,
        status: 'confirmed',
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id priest_name');

      confirmations.forEach(booking => {
        if (!transaction_id || booking.transaction_id !== transaction_id) {
          priestBookings.push({
            date: booking.date,
            time: booking.time,
            sacrament: 'Confirmation',
            transaction_id: booking.transaction_id
          });
        }
      });
    } catch (error) {
      console.error('Error fetching confirmations:', error);
    }

    try {
      const anointings = await AnointingModel.find({
        priest_id: priest_id,
        status: 'confirmed',
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id priest_name');

      anointings.forEach(booking => {
        if (!transaction_id || booking.transaction_id !== transaction_id) {
          priestBookings.push({
            date: booking.date,
            time: booking.time,
            sacrament: 'Anointing of the Sick',
            transaction_id: booking.transaction_id
          });
        }
      });
    } catch (error) {
      console.error('Error fetching anointings:', error);
    }

    try {
      const confessions = await ConfessionModel.find({
        priest_id: priest_id,
        status: 'confirmed',
        date: { $exists: true, $ne: null },
        time: { $exists: true, $ne: null }
      }).select('date time transaction_id priest_name');

      confessions.forEach(booking => {
        if (!transaction_id || booking.transaction_id !== transaction_id) {
          priestBookings.push({
            date: booking.date,
            time: booking.time,
            sacrament: 'Confession',
            transaction_id: booking.transaction_id
          });
        }
      });
    } catch (error) {
      console.error('Error fetching confessions:', error);
    }

    // Check for conflicts
    for (const booking of priestBookings) {
      if (!booking.date || !booking.time) continue;

      // Parse booking date and time
      let bookingDate;
      let bookingDateTime;

      if (booking.date instanceof Date) {
        bookingDate = new Date(booking.date);
      } else {
        bookingDate = new Date(booking.date);
      }

      const bookingDateStr = bookingDate.toISOString().split('T')[0];

      // Check if same day
      if (bookingDateStr === selectedDateStr) {
        bookingDateTime = new Date(bookingDate);
        
        // Parse time
        if (booking.time instanceof Date) {
          bookingDateTime.setHours(booking.time.getHours());
          bookingDateTime.setMinutes(booking.time.getMinutes());
        } else if (typeof booking.time === 'string') {
          const timeStr = booking.time;
          
          if (timeStr.includes('T') || timeStr.includes('Z') || timeStr.includes('+')) {
            const timeDate = new Date(timeStr);
            if (!isNaN(timeDate.getTime())) {
              bookingDateTime.setHours(timeDate.getHours());
              bookingDateTime.setMinutes(timeDate.getMinutes());
            }
          } else {
            const timeParts = timeStr.split(':');
            if (timeParts.length >= 2) {
              const hours = parseInt(timeParts[0], 10);
              const minutes = parseInt(timeParts[1], 10);
              if (!isNaN(hours) && !isNaN(minutes)) {
                bookingDateTime.setHours(hours);
                bookingDateTime.setMinutes(minutes);
              }
            }
          }
        } else {
          const timeDate = new Date(booking.time);
          if (!isNaN(timeDate.getTime())) {
            bookingDateTime.setHours(timeDate.getHours());
            bookingDateTime.setMinutes(timeDate.getMinutes());
          }
        }
        
        bookingDateTime.setSeconds(0);
        bookingDateTime.setMilliseconds(0);

        // Calculate time difference in hours
        const timeDiff = Math.abs(selectedDateTime.getTime() - bookingDateTime.getTime());
        const hoursDiff = timeDiff / (1000 * 60 * 60);

        // If within 1 hour, consider it a conflict
        if (hoursDiff < 1) {
          const conflictDate = bookingDateTime.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          });
          const conflictTime = bookingDateTime.toLocaleTimeString('en-US', { 
            hour: 'numeric', 
            minute: '2-digit',
            hour12: true 
          });

          return res.json({
            hasConflict: true,
            message: `This priest already has a confirmed ${booking.sacrament} booking on ${conflictDate} at ${conflictTime}. Please select a different priest or time.`,
            conflictingBooking: {
              sacrament: booking.sacrament,
              date: conflictDate,
              time: conflictTime,
              transaction_id: booking.transaction_id
            }
          });
        }
      }
    }

    // No conflicts found
    return res.json({
      hasConflict: false,
      message: "No conflicts found. This priest is available at the selected time."
    });

  } catch (error) {
    console.error('Error checking priest conflict:', error);
    return res.status(500).json({
      hasConflict: false,
      message: "Error checking for priest conflicts. Please try again.",
      error: error.message
    });
  }
}

module.exports = {
  checkBookingConflict,
  checkPriestConflict
};

