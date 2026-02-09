const mongoose = require("mongoose");

const WeddingSchema = new mongoose.Schema(
  {
    uid: { 
      type: String, 
      required: true 

    },
    // full_name: { 
    //   type: String, 
    //   default: '' 
    // },
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
    contact_number: {
      type: String,
      required: true,
    },
    groom_last_name: {
      type: String,
      required: true,
    },
    groom_first_name: {
      type: String,
      required: true,
    },
    groom_middle_name: {
      type: String,
      default: '',
    },
    groom_pic: {
      type: String,
      required: true,
    },
    bride_last_name: {
      type: String,
      required: true,
    },
    bride_first_name: {
      type: String,
      required: true,
    },
    bride_middle_name: {
      type: String,
      default: '',  
    },
    bride_pic: {
      type: String,
      required: true,
    },
    marriage_docu: {
      type: String,
      default: '',
    },
    groom_cenomar: {
      type: String,
    },
    bride_cenomar: {
      type: String,
    },
    groom_baptismal_cert: {
      type: String,
      default: '',
    },
    bride_baptismal_cert: {
      type: String,
      default: '',
    },
    groom_confirmation_cert: {
      type: String,
      default: '',
    },
    bride_confirmation_cert: {
      type: String,
      default: '',
    },
    groom_permission: {
      type: String,
    },
    bride_permission: {
      type: String,
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
      default: 5000,
    },
    admin_comment: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const WeddingModel = mongoose.model("WeddingBookings", WeddingSchema);
module.exports = WeddingModel;
