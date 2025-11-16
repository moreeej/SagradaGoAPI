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
      is_priest: user.is_priest
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

async function checkEmailExists(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required." });
    }

    const user = await UserModel.findOne({ 
      email: email.trim().toLowerCase(),
      is_deleted: false 
    });

    return res.status(200).json({ 
      exists: !!user,
      message: user ? "Email already exists." : "Email is available."
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function checkContactExists(req, res) {
  try {
    const { contact_number } = req.body;

    if (!contact_number) {
      return res.status(400).json({ message: "Contact number is required." });
    }

    const user = await UserModel.findOne({ 
      contact_number: contact_number.trim(),
      is_deleted: false 
    });

    return res.status(200).json({ 
      exists: !!user,
      message: user ? "Contact number already exists." : "Contact number is available."
    });
  } catch (err) {
    console.error("Error:", err);
    return res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function updateUser(req, res) {
  try {
    const { uid } = req.body;
    const {
      first_name,
      middle_name,
      last_name,
      gender,
      contact_number,
      civil_status,
      birthday,
      email,
    } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID is required." });
    }

    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    if (email && email.trim().toLowerCase() !== user.email) {
      const existingEmail = await UserModel.findOne({
        email: email.trim().toLowerCase(),
        is_deleted: false,
        uid: { $ne: uid }
      });

      if (existingEmail) {
        return res.status(409).json({ message: "Email already exists. Please use a different email." });
      }
    }

    if (contact_number && contact_number.trim() !== user.contact_number) {
      const existingContact = await UserModel.findOne({
        contact_number: contact_number.trim(),
        is_deleted: false,
        uid: { $ne: uid }
      });

      if (existingContact) {
        return res.status(409).json({ message: "Contact number already exists. Please use a different contact number." });
      }
    }

    if (first_name !== undefined) user.first_name = first_name;
    if (middle_name !== undefined) user.middle_name = middle_name;
    if (last_name !== undefined) user.last_name = last_name;
    if (gender !== undefined) user.gender = gender;
    if (contact_number !== undefined) user.contact_number = contact_number.trim();
    if (civil_status !== undefined) user.civil_status = civil_status;
    if (birthday !== undefined) user.birthday = birthday;
    if (email !== undefined) user.email = email.trim().toLowerCase();

    await user.save();

    const updatedUserData = {
      uid: user.uid,
      email: user.email,
      first_name: user.first_name,
      middle_name: user.middle_name,
      last_name: user.last_name,
      gender: user.gender,
      contact_number: user.contact_number,
      civil_status: user.civil_status,
      birthday: user.birthday,
      is_priest: user.is_priest
    };

    res.status(200).json({
      message: "Profile updated successfully.",
      user: updatedUserData,
    });

  } catch (err) {
    console.error("Error:", err);

    if (err.code === 11000) {
      const field = Object.keys(err.keyPattern)[0];
      if (field === 'email') {
        return res.status(409).json({ message: "Email already exists. Please use a different email." });
        
      } else if (field === 'contact_number') {
        return res.status(409).json({ message: "Contact number already exists. Please use a different contact number." });
      }
    }

    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = { createUser, findUser, login, getAllUsers, checkEmailExists, checkContactExists, updateUser }
