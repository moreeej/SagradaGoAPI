const express = require("express");
const router = express.Router();

const UserController = require("../controllers/UserController");
const AdminController = require("../controllers/AdminController")
const DonationController = require("../controllers/DonationController")

// User routes
router.post("/createUser", UserController.createUser);
router.post("/findUser", UserController.findUser)
router.post("/login", UserController.login)
router.get("/getAllUsers", UserController.getAllUsers)
router.post("/checkEmail", UserController.checkEmailExists)
router.post("/checkContact", UserController.checkContactExists)
router.put("/updateUser", UserController.updateUser)

// Admin routes
router.post("/createAdmin", AdminController.addAdmin)
router.post("/findAdmin", AdminController.findAdmin)

// Donation routes
router.post("/createDonation", DonationController.createDonation);
router.post("/getUserDonations", DonationController.getUserDonations);
router.post("/getDonationStats", DonationController.getDonationStats);
router.put("/updateDonationStatus", DonationController.updateDonationStatus);

module.exports = router;  
