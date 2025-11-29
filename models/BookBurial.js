const mongoose = require("mongoose");

const BurialSchema = new mongoose.Schema(
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
      unique: true,
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
    contact_number: {
      type: String,
      required: true,
    },
    funeral_mass: {
      type: Boolean,
      default: false,
    },
    death_anniversary: {
      type: Boolean,
      default: false,
    },
    funeral_blessing: {
      type: Boolean,
      default: false,
    },
    tomb_blessing: {
      type: Boolean,
      default: false,
    },
    death_certificate: {
      type: String,
      default: '',
    },
    deceased_baptismal: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const BurialModel = mongoose.model("BurialBookings", BurialSchema);

module.exports = BurialModel;

