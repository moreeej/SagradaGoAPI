const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema(
  {
    recipient_id: {
      type: String,
      required: true,
      index: true,
    },
    recipient_type: {
      type: String,
      required: true,
      enum: ["user", "admin"],
      index: true,
    },
    type: {
      type: String,
      required: true,
      enum: [
        "booking",
        "announcement",
        "event",
        "donation",
        "reminder",
        "booking_status",
        "donation_status",
        "system",
        "message",
        "volunteer"
      ],
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    read: {
      type: Boolean,
      default: false,
      index: true,
    },
    read_at: {
      type: Date,
    },
    // For navigation/action when notification is clicked
    action: {
      type: String, // e.g., "BookingHistoryScreen", "DonationsScreen"
    },
    // Additional metadata (e.g., booking_id, donation_id)
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    // Priority level (optional)
    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },
    // Expiration date (optional - for time-sensitive notifications)
    expires_at: {
      type: Date,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Index for efficient queries
NotificationSchema.index({ recipient_id: 1, recipient_type: 1, read: 1 });
NotificationSchema.index({ recipient_id: 1, recipient_type: 1, createdAt: -1 });
NotificationSchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 }); // Auto-delete expired notifications

// Method to mark as read
NotificationSchema.methods.markAsRead = function() {
  this.read = true;
  this.read_at = new Date();
  return this.save();
};

const NotificationModel = mongoose.model("Notification", NotificationSchema);
module.exports = NotificationModel;

