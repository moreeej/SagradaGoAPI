const mongoose = require("mongoose");

const BaptismSchema = new mongoose.Schema(
  {
    uid: { 
      type: String, 
      required: true 

    },
    fullname: { 
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
    // Document fields for file uploads
    birth_certificate: {
      type: String,
      default: '',
    },
    parents_marriage_certificate: {
      type: String,
      default: '',
    },
    godparent_confirmation: {
      type: String,
      default: '',
    },
    baptismal_seminar: {
      type: String,
      default: '',
    },
    // Store godparent data as objects (from frontend)
    main_godfather: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    main_godmother: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    additional_godparents: {
      type: [mongoose.Schema.Types.Mixed],
      default: [],
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
      default: 2000,
    },
    admin_comment: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

const BaptismModel = mongoose.model("BaptismBookings", BaptismSchema);

module.exports = BaptismModel;
