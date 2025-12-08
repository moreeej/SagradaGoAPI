const mongoose = require("mongoose");

const AnointingSchema = mongoose.Schema(
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
    medical_condition: {
      type: String,
      default: '',
    },
    medical_certificate: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    priest_id: {
      type: String,
      default: null,
    },
    priest_name: {
      type: String,
      default: '',
    },
    payment_method: {
      type: String,
      enum: ['gcash', 'in_person'],
      default: 'in_person',
    },
    proof_of_payment: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

const AnointingModel = mongoose.model("AnointingBookings", AnointingSchema);

module.exports = AnointingModel;