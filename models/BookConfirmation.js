const mongoose = require("mongoose");

const ConfirmationSchema = new mongoose.Schema(
  {
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
    sponsor_name: {
      type: String,
      default: '',
    },
    baptismal_certificate: {
      type: String,
      default: '',
    },
    first_communion_certificate: {
      type: String,
      default: '',
    },
    confirmation_preparation: {
      type: String,
      default: '',
    },
    sponsor_certificate: {
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

const ConfirmationModel = mongoose.model("ConfirmationBookings", ConfirmationSchema);

module.exports = ConfirmationModel;

