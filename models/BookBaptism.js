const mongoose = require("mongoose");

const BaptismSchema = new mongoose.Schema(
  {
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

    candidate_first_name: {
      type: String,
      required: true,
    },
    candidate_middle_name: {
      type: String,
    },
    candidate_last_name: {
      type: String,
      required: true,
    },
    candidate_birthday: {
      type: Date,
      required: true,
    },
    candidate_birth_place: {
      type: String,
      required: true,
    },

    mother_first_name: {
      type: String,
      required: true,
    },
    mother_middle_name: {
      type: String,
    },
    mother_last_name: {
      type: String,
      required: true,
    },
    mother_birth_place: {
      type: String,
      required: true,
    },

    father_first_name: {
      type: String,
      required: true,
    },
    father_middle_name: {
      type: String,
    },
    father_last_name: {
      type: String,
      required: true,
    },
    father_birth_place: {
      type: String,
      required: true,
    },

    marriage_type: {
      type: String,
      required: true,
    },
    contact_number: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      required: true,
    },

    main_godfather_first_name: {
      type: String,
      required: true,
    },
    main_godfather_middle_name: {
      type: String,
    },
    main_godfather_last_name: {
      type: String,
      required: true,
    },

    main_godmother_first_name: {
      type: String,
      required: true,
    },
    main_godmother_middle_name: {
      type: String,
    },
    main_godmother_last_name: {
      type: String,
      required: true,
    },

    other_godfather: [
      {
        first_name: String,
        middle_name: String,
        last_name: String,
      },
    ],

    other_godmother: [
      {
        first_name: String,
        middle_name: String,
        last_name: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
  },
  { timestamps: true }
);

const BaptismModel = mongoose.model("BaptismBookings", BaptismSchema);

module.exports = BaptismModel;
