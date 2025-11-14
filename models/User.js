const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const UserSchema = new mongoose.Schema(
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
    // middle_name: {
    //   type: String,
    // },
    last_name: {
      type: String,
      required: true,
    },
    gender: {
      type: String,
      required: true,
    },
    contact_number: {
      type: String,
      required: true,
    },
    civil_status: {
      type: String,
    },
    birthday: {
      type: Date,
      required: true,
    },
    is_deleted:{
      type: Boolean,
      default: false
    },
    is_admin:{
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);


const UserModel = mongoose.model("Users", UserSchema);
module.exports = UserModel;
