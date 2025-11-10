const UserModel = require("../models/User")

const bcrypt = require("bcrypt");

async function createUser(req, res) {
  try {
    const { 
      first_name, 
      middle_name, 
      last_name, 
      gender, 
      contact_number, 
      civil_status, 
      birthday, 
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
    
    const newUser = new UserModel({
      first_name,
      middle_name,
      last_name,
      gender,
      contact_number,
      civil_status,
      birthday,
      email,
      password: hashedPassword,
      uid
    });

    await newUser.save();

    res.json({
      message: "User created successfully.",
      newUser
    });

  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}




async function findUser(req, res) {
  try {
    const { uid } = req.body;

    const user = await UserModel.findOne({ uid });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }
    console.log("user", user);
    

    res.status(200).json({
      message: "User found successfully.",
      user,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}


module.exports = { createUser, findUser }