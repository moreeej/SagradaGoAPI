const mongoose = require("mongoose");

const CommunionSchema = mongoose.Schema(
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
    uid: {
      type: String,
      default: '',
    },
    contact_number: {
      type: String,
      default: '',
    },
    // Document fields for file uploads
    baptismal_certificate: {
      type: String,
      default: '',
    },
    communion_preparation: {
      type: String,
      default: '',
    },
    parent_consent: {
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

const CommunionModel = mongoose.model("CommunionBookings", CommunionSchema);

module.exports = CommunionModel;