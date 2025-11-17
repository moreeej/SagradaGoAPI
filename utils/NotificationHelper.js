const NotificationModel = require("../models/Notification");

/**
 * Helper function to create a notification easily
 * @param {Object} options - Notification options
 * @param {String} options.recipient_id - The uid of the user or admin
 * @param {String} options.recipient_type - Either "user" or "admin"
 * @param {String} options.type - Notification type (booking, announcement, etc.)
 * @param {String} options.title - Notification title
 * @param {String} options.message - Notification message
 * @param {String} options.action - Optional: Screen to navigate to
 * @param {Object} options.metadata - Optional: Additional data (booking_id, donation_id, etc.)
 * @param {String} options.priority - Optional: "low", "medium", "high", "urgent"
 * @returns {Promise<Object>} Created notification
 */
async function createNotification({
  recipient_id,
  recipient_type, // "user" or "admin"
  type,
  title,
  message,
  action = null,
  metadata = {},
  priority = "medium",
  expires_at = null,
}) {
  try {
    // Validate recipient_type
    if (!["user", "admin"].includes(recipient_type)) {
      throw new Error("recipient_type must be either 'user' or 'admin'");
    }

    const notification = new NotificationModel({
      recipient_id,
      recipient_type, // Use "user" or "admin"
      type,
      title,
      message,
      action,
      metadata,
      priority,
      expires_at: expires_at ? new Date(expires_at) : null,
    });

    await notification.save();
    return notification;
  } catch (error) {
    console.error("Error creating notification:", error);
    throw error;
  }
}

/**
 * Create notification for a USER
 * Example: When a user's booking is confirmed
 */
async function notifyUser(userId, type, title, message, options = {}) {
  return createNotification({
    recipient_id: userId,
    recipient_type: "user", // Specify "user"
    type,
    title,
    message,
    ...options,
  });
}

/**
 * Create notification for an ADMIN
 * Example: When a new booking request comes in
 */
async function notifyAdmin(adminId, type, title, message, options = {}) {
  return createNotification({
    recipient_id: adminId,
    recipient_type: "admin", // Specify "admin"
    type,
    title,
    message,
    ...options,
  });
}

/**
 * Notify all admins (useful for system-wide notifications)
 */
async function notifyAllAdmins(adminIds, type, title, message, options = {}) {
  const notifications = await Promise.all(
    adminIds.map((adminId) =>
      createNotification({
        recipient_id: adminId,
        recipient_type: "admin", // All are admins
        type,
        title,
        message,
        ...options,
      })
    )
  );
  return notifications;
}

module.exports = {
  createNotification,
  notifyUser,
  notifyAdmin,
  notifyAllAdmins,
};

