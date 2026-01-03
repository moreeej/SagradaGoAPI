const mongoose = require("mongoose");

const VolunteerSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      ref: "Users",
    },
    event_id: {
      type: String,
      default: null, // null for general volunteers (not event-specific)
    },
    eventTitle: {
      type: String,
      default: "General Volunteer",
    },
    name: {
      type: String,
      required: true,
    },
    contact: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    registration_type: {
      type: String,
      enum: ["participant", "volunteer"],
      default: "volunteer",
    },
  },
  { timestamps: true }
);

// Index for efficient queries
VolunteerSchema.index({ user_id: 1 });
VolunteerSchema.index({ event_id: 1 });
VolunteerSchema.index({ user_id: 1, event_id: 1 });

const VolunteerModel = mongoose.model("Volunteers", VolunteerSchema);
module.exports = VolunteerModel;

