const { sendToUser, sendToUsers } = require("../services/FCMService");
const NotificationModel = require("../models/Notification");
const UserModel = require("../models/User");
const AdminModel = require("../models/Admin");

console.log("NotificationHelper: Module loaded, sendToUser imported:", typeof sendToUser);

/**
 * Send notification to a single user
 * Creates both FCM push notification and saves to database
 * @param {String} userId - User's uid
 * @param {String} type - Notification type (e.g., "booking_status", "donation_status")
 * @param {String} title - Notification title
 * @param {String} message - Notification message/body
 * @param {Object} options - Additional options (action, metadata, priority)
 */
async function notifyUser(userId, type, title, message, options = {}) {
  console.log(`NotificationHelper: ========== notifyUser CALLED ==========`);
  console.log(`NotificationHelper: userId: ${userId}`);
  console.log(`NotificationHelper: type: ${type}`);
  console.log(`NotificationHelper: title: ${title}`);
  console.log(`NotificationHelper: message: ${message}`);
  console.log(`NotificationHelper: options:`, JSON.stringify(options, null, 2));
  
  try {
    if (!userId) {
      console.error("NotificationHelper: ❌ No user ID provided - RETURNING EARLY");
      return;
    }

    // Skip notification if userId is 'admin' (admin-created bookings)
    if (userId === 'admin') {
      console.log("NotificationHelper: ⚠️ Skipping notification for admin user ID - RETURNING EARLY");
      return;
    }

    console.log(`NotificationHelper: ✅ Passed validation checks`);
    console.log(`NotificationHelper: 📤 Attempting to send notification to user: ${userId}`);
    console.log(`NotificationHelper: Title: ${title}, Message: ${message}`);

    // Prepare notification data
    const notificationData = {
      type: type || "general",
      ...options.metadata,
    };

    // Send FCM push notification - CALL sendToUser DIRECTLY like test button does
    console.log(`NotificationHelper: 🔔 About to call sendToUser DIRECTLY for user ${userId}`);
    console.log(`NotificationHelper: Title: "${title}", Message: "${message}"`);
    console.log(`NotificationHelper: Notification data:`, JSON.stringify(notificationData, null, 2));
    console.log(`NotificationHelper: sendToUser function type: ${typeof sendToUser}`);
    
    if (typeof sendToUser !== 'function') {
      console.error(`NotificationHelper: ❌ CRITICAL ERROR - sendToUser is not a function! It is: ${typeof sendToUser}`);
      throw new Error('sendToUser is not a function');
    }
    
    try {
      console.log(`NotificationHelper: 🚀 CALLING sendToUser NOW...`);
      // IMPORTANT: Call sendToUser directly, same as test button
      const result = await sendToUser(userId, title, message, notificationData);
      console.log(`NotificationHelper: ✅ sendToUser returned: ${result} (type: ${typeof result})`);
      if (result === true) {
        console.log(`NotificationHelper: ✅✅✅ FCM notification sent successfully to user ${userId}`);
      } else {
        console.error(`NotificationHelper: ⚠️ FCM notification failed - sendToUser returned: ${result}`);
      }
    } catch (fcmError) {
      console.error("NotificationHelper: ❌ FCM error:", fcmError);
      console.error("NotificationHelper: FCM error message:", fcmError.message);
      console.error("NotificationHelper: FCM error code:", fcmError.code);
      console.error("NotificationHelper: FCM error stack:", fcmError.stack);
      // Don't throw - continue to save to DB
    }

    // Save notification to database
    try {
      const notification = new NotificationModel({
        recipient_id: userId,
        recipient_type: "user",
        type: type || "general",
        title: title,
        message: message,
        action: options.action || null,
        metadata: options.metadata || {},
        read: false,
      });

      await notification.save();
      console.log(`NotificationHelper: Notification saved to DB for user ${userId}`);
    } catch (dbError) {
      console.error("NotificationHelper: Error saving notification to DB:", dbError);
    }
  } catch (error) {
    console.error("NotificationHelper: Error in notifyUser:", error);
  }
}

/**
 * Send notification to all admins
 * Creates both FCM push notifications and saves to database
 * @param {Array<String>} adminIds - Array of admin uids
 * @param {String} type - Notification type
 * @param {String} title - Notification title
 * @param {String} message - Notification message/body
 * @param {Object} options - Additional options (action, metadata, priority)
 */
async function notifyAllAdmins(adminIds, type, title, message, options = {}) {
  try {
    if (!adminIds || adminIds.length === 0) {
      console.log("NotificationHelper: No admin IDs provided");
      return;
    }

    // Prepare notification data
    const notificationData = {
      type: type || "general",
      ...options.metadata,
    };

    // Send FCM push notifications
    try {
      await sendToUsers(adminIds, title, message, notificationData);
    } catch (fcmError) {
      console.error("NotificationHelper: FCM error (continuing to save to DB):", fcmError);
    }

    // Save notifications to database for each admin
    try {
      const notificationPromises = adminIds.map(async (adminId) => {
        const notification = new NotificationModel({
          recipient_id: adminId,
          recipient_type: "admin",
          type: type || "general",
          title: title,
          message: message,
          action: options.action || null,
          metadata: options.metadata || {},
          read: false,
        });
        return notification.save();
      });

      await Promise.all(notificationPromises);
      console.log(`NotificationHelper: Notifications saved to DB for ${adminIds.length} admins`);
    } catch (dbError) {
      console.error("NotificationHelper: Error saving notifications to DB:", dbError);
    }
  } catch (error) {
    console.error("NotificationHelper: Error in notifyAllAdmins:", error);
  }
}

module.exports = {
  notifyUser,
  notifyAllAdmins,
};

