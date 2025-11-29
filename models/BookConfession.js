const mongoose = require("mongoose");

const ConfessionSchema = mongoose.Schema(
  {
    uid: { 
      type: String, 
      required: true 

    },
    full_name: { 
      type: String, 
      default: '' 
    },
    email: { 
      type: String, 
      default: '' 
    },
    transaction_id: {
      type: String,
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    time: {
      type: String,
      required: true,
    },
    attendees: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);


const ConfessionModel = mongoose.model("ConfessionBookings", ConfessionSchema)

module.exports = ConfessionModel;