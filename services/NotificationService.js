const { sendToUser, sendToUsers } = require("../services/FCMService");
const NotificationModel = require("../models/Notification");
const UserModel = require("../models/User");
const AdminModel = require("../models/Admin");

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
  try {
    if (!userId) {
      console.log("NotificationHelper: No user ID provided");
      return;
    }

    // Prepare notification data
    const notificationData = {
      type: type || "general",
      ...options.metadata,
    };

    // Send FCM push notification
    try {
      await sendToUser(userId, title, message, notificationData);
    } catch (fcmError) {
      console.error("NotificationHelper: FCM error (continuing to save to DB):", fcmError);
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

