const mongoose = require("mongoose");

// Donation subdocument schema (same as User model)
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
    },
  },
  { timestamps: true }
);

const ArchiveUserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    uid: {
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
    contact_number: {
      type: String,
      required: true,
    },
    birthday: {
      type: Date,
      required: true,
    },
    is_deleted: {
      type: Boolean,
      default: false
    },
    is_priest: {
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
    },
    is_active: { 
      type: Boolean, 
      default: true 
    },
    is_archived: {
      type: Boolean,
      default: true
    },
    archived_at: {
      type: Date,
      default: Date.now
    },
    original_uid: {
      type: String,
      required: true
    },
    donations: {
      type: [DonationSchema],
      default: [],
    },
  },
  { timestamps: true, collection: "archiveusers" }
);

const ArchiveUserModel = mongoose.model("ArchiveUsers", ArchiveUserSchema);
module.exports = ArchiveUserModel;

