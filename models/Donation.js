const mongoose = require("mongoose");

const DonationSchema = new mongoose.Schema(
  {
    user_id: {
      type: String,
      required: true,
      ref: "Users",
    },
    user_name: {
      type: String,
      required: true,
    },
    user_email: {
      type: String,
      required: true,
    },
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
    donationImage: {
      type: String,
      default: null, // For In Kind donation image
    },
    receipt: {
      type: String,
      default: null, // For GCash receipt
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

DonationSchema.index({ user_id: 1, status: 1 });
DonationSchema.index({ status: 1, createdAt: -1 });

const DonationModel = mongoose.model("Donations", DonationSchema);
module.exports = DonationModel;
