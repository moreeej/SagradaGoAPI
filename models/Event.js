const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ["event", "activity"],
      default: "event",
    },
    date: {
      type: Date,
      required: true,
    },
    time_start: {
      type: String,
      default: "",
    },
    time_end: {
      type: String,
      default: "",
    },
    location: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String, 
      default: "",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Event", eventSchema);
