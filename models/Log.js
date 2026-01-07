const mongoose = require("mongoose");

const LogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      enum: [
        "CREATE_USER",
        "UPDATE_USER",
        "DISABLE_USER",
        "ENABLE_USER",
        "DELETE_USER",
        "CREATE_ADMIN",
        "CREATE_ANNOUNCEMENT",
        "UPDATE_ANNOUNCEMENT",
        "DELETE_ANNOUNCEMENT",
        "CREATE_EVENT",
        "UPDATE_EVENT",
        "DELETE_EVENT",
        "CREATE_BOOKING",
        "APPROVE_BOOKING",
        "REJECT_BOOKING",
        "UPDATE_BOOKING",
        "DELETE_BOOKING",
        "GENERATE_REPORT",
        "OTHER"
      ],
    },
    entity_type: {
      type: String,
      required: true,
      enum: [
        "USER",
        "ADMIN",
        "ANNOUNCEMENT",
        "EVENT",
        "BOOKING",
        "REPORT",
        "OTHER"
      ],
    },
    entity_id: {
      type: String,
    },
    entity_name: {
      type: String,
    },
    admin_id: {
      type: String,
      required: true,
    },
    admin_name: {
      type: String,
      required: true,
    },
    admin_email: {
      type: String,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ip_address: {
      type: String,
    },
    user_agent: {
      type: String,
    },
  },
  { timestamps: true }
);

// Index for faster queries
LogSchema.index({ createdAt: -1 });
LogSchema.index({ action: 1 });
LogSchema.index({ entity_type: 1 });
LogSchema.index({ admin_id: 1 });

const LogModel = mongoose.model("Logs", LogSchema);
module.exports = LogModel;

