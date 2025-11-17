const NotificationModel = require("../models/Notification");

// Create a notification
async function createNotification(req, res) {
  try {
    const {
      recipient_id,
      recipient_type, // "user" or "admin"
      type,
      title,
      message,
      action,
      metadata,
      priority,
      expires_at,
    } = req.body;

    // Validate required fields
    if (!recipient_id || !recipient_type || !type || !title || !message) {
      return res.status(400).json({
        message: "recipient_id, recipient_type, type, title, and message are required.",
      });
    }

    // Validate recipient_type enum
    if (!["user", "admin"].includes(recipient_type)) {
      return res.status(400).json({
        message: "recipient_type must be either 'user' or 'admin'.",
      });
    }

    const notification = new NotificationModel({
      recipient_id,
      recipient_type, // Use "user" or "admin"
      type,
      title,
      message,
      action,
      metadata: metadata || {},
      priority: priority || "medium",
      expires_at: expires_at ? new Date(expires_at) : null,
    });

    await notification.save();

    res.status(201).json({
      message: "Notification created successfully.",
      notification,
    });
  } catch (err) {
    console.error("Error creating notification:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

// Get notifications for a user or admin
async function getNotifications(req, res) {
  try {
    const { recipient_id, recipient_type, read, limit = 50 } = req.body;

    if (!recipient_id || !recipient_type) {
      return res.status(400).json({
        message: "recipient_id and recipient_type are required.",
      });
    }

    // Validate recipient_type enum
    if (!["user", "admin"].includes(recipient_type)) {
      return res.status(400).json({
        message: "recipient_type must be either 'user' or 'admin'.",
      });
    }

    // Build query
    const query = {
      recipient_id,
      recipient_type, // Filter by "user" or "admin"
      is_deleted: false,
    };

    // Optional: filter by read status
    if (read !== undefined) {
      query.read = read === true || read === "true";
    }

    const notifications = await NotificationModel.find(query)
      .sort({ createdAt: -1 }) // Most recent first
      .limit(parseInt(limit))
      .lean();

    const unreadCount = await NotificationModel.countDocuments({
      ...query,
      read: false,
    });

    res.status(200).json({
      message: "Notifications retrieved successfully.",
      notifications,
      unreadCount,
    });
  } catch (err) {
    console.error("Error getting notifications:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

// Mark notification as read
async function markAsRead(req, res) {
  try {
    const { notification_id } = req.body;

    if (!notification_id) {
      return res.status(400).json({ message: "notification_id is required." });
    }

    const notification = await NotificationModel.findById(notification_id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    if (notification.is_deleted) {
      return res.status(404).json({ message: "Notification not found." });
    }

    await notification.markAsRead();

    res.status(200).json({
      message: "Notification marked as read.",
      notification,
    });
  } catch (err) {
    console.error("Error marking notification as read:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

// Mark all notifications as read for a user/admin
async function markAllAsRead(req, res) {
  try {
    const { recipient_id, recipient_type } = req.body;

    if (!recipient_id || !recipient_type) {
      return res.status(400).json({
        message: "recipient_id and recipient_type are required.",
      });
    }

    // Validate recipient_type enum
    if (!["user", "admin"].includes(recipient_type)) {
      return res.status(400).json({
        message: "recipient_type must be either 'user' or 'admin'.",
      });
    }

    const result = await NotificationModel.updateMany(
      {
        recipient_id,
        recipient_type, // Filter by "user" or "admin"
        read: false,
        is_deleted: false,
      },
      {
        $set: {
          read: true,
          read_at: new Date(),
        },
      }
    );

    res.status(200).json({
      message: `${result.modifiedCount} notification(s) marked as read.`,
      count: result.modifiedCount,
    });
  } catch (err) {
    console.error("Error marking all as read:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

// Delete notification
async function deleteNotification(req, res) {
  try {
    const { notification_id } = req.body;

    if (!notification_id) {
      return res.status(400).json({ message: "notification_id is required." });
    }

    const notification = await NotificationModel.findById(notification_id);

    if (!notification) {
      return res.status(404).json({ message: "Notification not found." });
    }

    notification.is_deleted = true;
    await notification.save();

    res.status(200).json({
      message: "Notification deleted successfully.",
    });
  } catch (err) {
    console.error("Error deleting notification:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

// Get unread count
async function getUnreadCount(req, res) {
  try {
    const { recipient_id, recipient_type } = req.body;

    if (!recipient_id || !recipient_type) {
      return res.status(400).json({
        message: "recipient_id and recipient_type are required.",
      });
    }

    // Validate recipient_type enum
    if (!["user", "admin"].includes(recipient_type)) {
      return res.status(400).json({
        message: "recipient_type must be either 'user' or 'admin'.",
      });
    }

    const count = await NotificationModel.countDocuments({
      recipient_id,
      recipient_type, // Filter by "user" or "admin"
      read: false,
      is_deleted: false,
    });

    res.status(200).json({
      message: "Unread count retrieved successfully.",
      unreadCount: count,
    });
  } catch (err) {
    console.error("Error getting unread count:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  createNotification,
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getUnreadCount,
};

