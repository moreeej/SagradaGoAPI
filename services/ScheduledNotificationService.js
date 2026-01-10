const FCMService = require("./FCMService");
const BaptismModel = require("../models/BookBaptism");
const WeddingModel = require("../models/BookWedding");
const BurialModel = require("../models/BookBurial");
const CommunionModel = require("../models/BookCommunion");
const ConfirmationModel = require("../models/BookConfirmation");
const AnointingModel = require("../models/BookAnointing");
const ConfessionModel = require("../models/BookConfession");
const UserModel = require("../models/User");

/**
 * Scheduled notification system for today's bookings
 * Sends notifications to both users and priests about their bookings scheduled for today
 */
const scheduleTodayBookingNotifications = async () => {
  try {
    console.log('🔔 Starting scheduled check for today\'s bookings...');
    
    // Get today's date in YYYY-MM-DD format (midnight in local timezone)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    
    // Get start and end of today for querying Date fields
    const startOfDay = new Date(today);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(today);
    endOfDay.setHours(23, 59, 59, 999);
    
    console.log('📅 Checking for bookings scheduled for:', todayStr);
    
    // Fetch all confirmed bookings for today from all booking types
    const [
      baptisms,
      weddings,
      burials,
      communions,
      confirmations,
      anointings,
      confessions
    ] = await Promise.all([
      BaptismModel.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'confirmed'
      }).select('uid transaction_id date time priest_id priest_name candidate_first_name candidate_last_name full_name'),
      
      WeddingModel.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'confirmed'
      }).select('uid transaction_id date time priest_id priest_name groom_first_name groom_last_name bride_first_name bride_last_name'),
      
      BurialModel.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'confirmed'
      }).select('uid transaction_id date time priest_id priest_name deceased_name full_name'),
      
      CommunionModel.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'confirmed'
      }).select('uid transaction_id date time priest_id priest_name full_name'),
      
      ConfirmationModel.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'confirmed'
      }).select('uid transaction_id date time priest_id priest_name full_name sponsor_name'),
      
      AnointingModel.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'confirmed'
      }).select('uid transaction_id date time priest_id priest_name full_name'),
      
      ConfessionModel.find({
        date: { $gte: startOfDay, $lte: endOfDay },
        status: 'confirmed'
      }).select('uid transaction_id date time priest_id priest_name full_name')
    ]);
    
    // Combine all bookings
    const allBookings = [];
    
    baptisms.forEach(booking => {
      allBookings.push({
        ...booking.toObject(),
        sacrament: 'Baptism',
        displayName: `${booking.candidate_first_name || ''} ${booking.candidate_last_name || ''}`.trim() || 'Baptism Candidate'
      });
    });
    
    weddings.forEach(booking => {
      allBookings.push({
        ...booking.toObject(),
        sacrament: 'Wedding',
        displayName: `${booking.groom_first_name || ''} ${booking.groom_last_name || ''} & ${booking.bride_first_name || ''} ${booking.bride_last_name || ''}`.trim() || 'Wedding Couple'
      });
    });
    
    burials.forEach(booking => {
      allBookings.push({
        ...booking.toObject(),
        sacrament: 'Burial',
        displayName: booking.deceased_name || booking.full_name || 'Deceased'
      });
    });
    
    communions.forEach(booking => {
      allBookings.push({
        ...booking.toObject(),
        sacrament: 'Communion',
        displayName: booking.full_name || 'Communion Candidate'
      });
    });
    
    confirmations.forEach(booking => {
      allBookings.push({
        ...booking.toObject(),
        sacrament: 'Confirmation',
        displayName: booking.full_name || booking.sponsor_name || 'Confirmation Candidate'
      });
    });
    
    anointings.forEach(booking => {
      allBookings.push({
        ...booking.toObject(),
        sacrament: 'Anointing of the Sick',
        displayName: booking.full_name || 'Recipient'
      });
    });
    
    confessions.forEach(booking => {
      allBookings.push({
        ...booking.toObject(),
        sacrament: 'Confession',
        displayName: booking.full_name || 'Confession Appointment'
      });
    });
    
    console.log(`📊 Found ${allBookings.length} confirmed bookings for today`);
    
    // Group bookings by user (uid)
    const userBookings = {};
    
    allBookings.forEach(booking => {
      if (booking.uid && booking.uid !== 'admin') {
        if (!userBookings[booking.uid]) {
          userBookings[booking.uid] = {
            userId: booking.uid,
            bookings: []
          };
        }
        userBookings[booking.uid].bookings.push(booking);
      }
    });
    
    // Group bookings by priest
    const priestBookings = {};
    
    allBookings.forEach(booking => {
      if (booking.priest_id && booking.priest_id !== 'admin') {
        if (!priestBookings[booking.priest_id]) {
          priestBookings[booking.priest_id] = {
            priestId: booking.priest_id,
            bookings: []
          };
        }
        priestBookings[booking.priest_id].bookings.push(booking);
      }
    });
    
    console.log(`👥 Found ${Object.keys(userBookings).length} users with bookings for today`);
    console.log(`📿 Found ${Object.keys(priestBookings).length} priests with bookings for today`);
    
    // Send notifications to users
    for (const [userId, userData] of Object.entries(userBookings)) {
      try {
        const bookingCount = userData.bookings.length;
        const bookingText = bookingCount === 1 
          ? `${userData.bookings[0].sacrament} booking` 
          : `${bookingCount} bookings`;
        
        // Format booking details for the message
        let bookingDetails = '';
        if (bookingCount === 1) {
          const booking = userData.bookings[0];
          bookingDetails = `\n${booking.sacrament} - ${booking.displayName}\nTime: ${booking.time}`;
        } else {
          bookingDetails = userData.bookings
            .slice(0, 3)
            .map(b => `\n• ${b.sacrament} at ${b.time}`)
            .join('');
          if (bookingCount > 3) {
            bookingDetails += `\n• and ${bookingCount - 3} more...`;
          }
        }
        
        const success = await FCMService.sendToUser(
          userId,
          '📅 Booking Reminder - Today',
          `You have ${bookingText} scheduled for today.${bookingDetails}`,
          {
            type: 'today_booking_reminder',
            bookingCount: String(bookingCount),
            date: todayStr,
            screen: 'BookingHistory'
          }
        );
        
        if (success) {
          console.log(`✅ Today booking notification sent to user: ${userId} (${bookingCount} booking${bookingCount !== 1 ? 's' : ''})`);
        } else {
          console.log(`⚠️ Failed to send notification to user: ${userId}`);
        }
      } catch (error) {
        console.error(`❌ Error sending notification to user ${userId}:`, error);
      }
    }
    
    // Send notifications to priests
    for (const [priestId, priestData] of Object.entries(priestBookings)) {
      try {
        const bookingCount = priestData.bookings.length;
        const bookingText = bookingCount === 1 
          ? `booking` 
          : `${bookingCount} bookings`;
        
        // Format booking details for the message
        let bookingDetails = '';
        if (bookingCount === 1) {
          const booking = priestData.bookings[0];
          bookingDetails = `\n${booking.sacrament} - ${booking.displayName}\nTime: ${booking.time}`;
        } else {
          bookingDetails = priestData.bookings
            .slice(0, 3)
            .map(b => `\n• ${b.sacrament} at ${b.time} - ${b.displayName}`)
            .join('');
          if (bookingCount > 3) {
            bookingDetails += `\n• and ${bookingCount - 3} more...`;
          }
        }
        
        const success = await FCMService.sendToUser(
          priestId,
          '📿 Schedule Reminder - Today',
          `You have ${bookingText} scheduled for today.${bookingDetails}`,
          {
            type: 'today_priest_schedule_reminder',
            bookingCount: String(bookingCount),
            date: todayStr,
            screen: 'PriestSchedule'
          }
        );
        
        if (success) {
          console.log(`✅ Today schedule notification sent to priest: ${priestId} (${bookingCount} booking${bookingCount !== 1 ? 's' : ''})`);
        } else {
          console.log(`⚠️ Failed to send notification to priest: ${priestId}`);
        }
      } catch (error) {
        console.error(`❌ Error sending notification to priest ${priestId}:`, error);
      }
    }
    
    console.log('✅ Scheduled today booking notifications completed');
    
    return {
      success: true,
      userNotifications: Object.keys(userBookings).length,
      priestNotifications: Object.keys(priestBookings).length,
      totalBookings: allBookings.length
    };
    
  } catch (error) {
    console.error('❌ Error in scheduled today booking notifications:', error);
    throw error;
  }
};

/**
 * Schedule the notification check to run daily at 8:00 AM
 */
const scheduleDailyNotifications = () => {
  console.log('⏰ Setting up daily notification schedule...');
  
  // Run immediate check for today's bookings on server startup
  console.log('🔔 Running immediate check for today\'s bookings...');
  scheduleTodayBookingNotifications().catch(err => {
    console.error('❌ Error in immediate booking check:', err);
  });
  
  // Calculate time until next 8:00 AM
  const now = new Date();
  const next8AM = new Date(now);
  next8AM.setHours(8, 0, 0, 0);
  
  // If it's already past 8 AM today, schedule for 8 AM tomorrow
  if (next8AM.getTime() <= now.getTime()) {
    next8AM.setDate(next8AM.getDate() + 1);
  }
  
  const timeUntilNext8AM = next8AM.getTime() - now.getTime();
  
  console.log(`⏰ Next notification check scheduled for: ${next8AM.toLocaleString()}`);
  console.log(`⏰ Time until next check: ${Math.round(timeUntilNext8AM / (1000 * 60 * 60))} hours`);
  
  // Schedule first run at next 8:00 AM
  setTimeout(() => {
    console.log('⏰ Running scheduled notification check at 8:00 AM...');
    scheduleTodayBookingNotifications().catch(err => {
      console.error('❌ Error in scheduled check:', err);
    });
    
    // Then run every 24 hours at 8:00 AM
    setInterval(() => {
      console.log('⏰ Running daily scheduled notification check at 8:00 AM...');
      scheduleTodayBookingNotifications().catch(err => {
        console.error('❌ Error in daily scheduled check:', err);
      });
    }, 24 * 60 * 60 * 1000);
    
    console.log('⏰ Daily notifications scheduled to run every 24 hours at 8:00 AM');
  }, timeUntilNext8AM);
};

module.exports = {
  scheduleTodayBookingNotifications,
  scheduleDailyNotifications
};

