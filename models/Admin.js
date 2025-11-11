
const mongoose = require("mongoose");


const AdminSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
    },
    uid:{
      type: String,
      required: true,
      unique: true
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
    profile_image: {
      type: String,
    },
    is_deleted: {
      type: Boolean,
      default: false
    },
     is_admin:{
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);




const AdminModel = mongoose.model("Admins", AdminSchema);
module.exports = AdminModel;
