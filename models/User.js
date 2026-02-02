const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

// Donation subdocument schema
const DonationSchema = new mongoose.Schema(
  {
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    paymentMethod: {
      type: String,
      required: true,
      enum: ["GCash", "Cash", "In Kind"],
    },
    intercession: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    donation_id: {
      type: String,
      // Reference to the main Donation collection _id
      // This links the user's donation subdocument to the main donation record
    },
  },
  { timestamps: true }
);

const UserSchema = new mongoose.Schema(
  {
        uid:{
      type: String,
      required: true,
      unique: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },

    first_name: {
      type: String,
      required: true,
    },
    middle_name: {
      type: String,
    },
    last_name: {
      type: String,
      required: true,
    },
    // gender: {
    //   type: String,
    //   required: true,
    // },
    contact_number: {
      type: String,
      required: true,
    },
    // civil_status: {
    //   type: String,
    // },
    birthday: {
      type: Date,
      required: true,
    },
    is_deleted:{
      type: Boolean,
      default: false
    },
    is_priest:{
      type: Boolean,
      default: false
    },
    previous_parish: {
      type: String,
      default: "",
    },
    residency: {
      type: String,
      enum: ["Permanent", "Floating"],
      default: "Floating",
    },
    is_active: { 
      type: Boolean, 
      default: true 
    },
    is_archived: {
      type: Boolean,
      default: false
    },
    archived_at: {
      type: Date,
      default: null
    },
    donations: {
      type: [DonationSchema],
      default: [],
    },
  },
  { timestamps: true }
);


const UserModel = mongoose.model("Users", UserSchema);
module.exports = UserModel;
