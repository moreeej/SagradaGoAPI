const AdminModel = require("../models/Admin");
const bcrypt = require("bcrypt");

async function addAdmin(req, res) {
  try {
    const { 
      first_name, 
      middle_name, 
      last_name, 
      contact_number, 
      birthday, 
      profile,
      email, 
      password,
      uid
    } = req.body;

    // console.log(first_name);
    // console.log(middle_name);
    // console.log(last_name);
    // console.log(gender);
    // console.log(contact_number);
    // console.log(civil_status);
    // console.log(birthday);
    // console.log(email);
    const hashedPassword = await bcrypt.hash(password, 10);
    // console.log(hashedPassword);
    
    const newAdmin = new AdminModel({
      first_name,
      middle_name,
      last_name,
      contact_number,
      birthday,
      profile,
      email,
      password: hashedPassword,
      uid
    });

    await newAdmin.save();

    res.json({
      message: "Admin created successfully.",
      newAdmin
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}


async function findAdmin(req, res) {
  try {
    const { uid } = req.body;

    const user = await AdminModel.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "Failed to find your account." });
    }

    res.status(200).json({
      message: "Admin found successfully.",
      user,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function updateAdmin(req, res) {
  try {
    const {
      uid,
      first_name,
      middle_name,
      last_name,
      contact_number,
      birthday,
      email,
    } = req.body;

    const admin = await AdminModel.findOne({ uid });

    if (!admin) {
      return res.status(404).json({ message: "Admin not found." });
    }

    admin.first_name = first_name ?? admin.first_name;
    admin.middle_name = middle_name ?? admin.middle_name;
    admin.last_name = last_name ?? admin.last_name;
    admin.contact_number = contact_number ?? admin.contact_number;
    admin.birthday = birthday ?? admin.birthday;
    admin.email = email ?? admin.email;

    await admin.save();

    res.status(200).json({
      message: "Admin updated successfully.",
      user: admin,
    });
  } catch (err) {
    console.error("Update admin error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = { addAdmin, findAdmin, updateAdmin }
