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
    
    res.status(200).json({
      message: "User found successfully.",
      user,
    });
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required." });
    }

    const user = await UserModel.findOne({ email, is_deleted: false });

    if (!user) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid email or password." });
    }

    const userData = {
      uid: user.uid,
      email: user.email,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      gender: user.gender,
      contact_number: user.contact_number,
      civil_status: user.civil_status,
      birthday: user.birthday,
      is_admin: user.is_admin
    };

    res.status(200).json({
      message: "Login successful.",
      user: userData,
    });
    
  } catch (err) {
    console.error("Error:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function getAllUsers(req, res) {
  try {
    const users = await UserModel.find({});
    return res.json(users);
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
}


module.exports = { createUser, findUser, login }
