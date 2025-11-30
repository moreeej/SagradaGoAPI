const mongoose = require("mongoose");

const AnnouncementSchema = mongoose.Schema(
  {
    title: { type: String, required: true },
    content: { type: String, required: true },
    date: { type: String, required: true },
    author: { type: String, default: "Parish Office" },
    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal"
    },
    image: { type: String, default: "" },
  },
  { timestamps: true }
);

const AnnouncementModel = mongoose.model("Announcement", AnnouncementSchema);

module.exports = AnnouncementModel;
