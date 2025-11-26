const express = require("express");
const router = express.Router();

const UserController = require("../controllers/UserController");
const AdminController = require("../controllers/AdminController")
const DonationController = require("../controllers/DonationController")
const AdminDonationController = require("../controllers/AdminDonationController");
const WeddingController = require("../controllers/WeddingController");
const CommunionController = require("../controllers/CommunionController");
const NotificationController = require("../controllers/NotificationController");
const VolunteerController = require("../controllers/VolunteerController");

const upload = require("../middleware/upload"); 

// User routes
router.post("/createUser", UserController.createUser);
router.post("/findUser", UserController.findUser)
router.post("/login", UserController.login)
router.get("/getAllUsers", UserController.getAllUsers)
router.post("/checkEmail", UserController.checkEmailExists)
router.post("/checkContact", UserController.checkContactExists)
router.put("/updateUser", UserController.updateUser)
router.post("/addVolunteer", UserController.addVolunteer)
router.put("/updateUserRole", UserController.updateUserRole)
router.put("/updateUserStatus", UserController.updateUserStatus)

// Admin routes
router.post("/createAdmin", AdminController.addAdmin)
router.post("/findAdmin", AdminController.findAdmin)

// Donation routes (user)
router.post("/createDonation", upload.fields([
  { name: "image", maxCount: 1 },
  { name: "receipt", maxCount: 1 },
]), DonationController.createDonation);

router.post("/getUserDonations", DonationController.getUserDonations);
router.post("/getDonationStats", DonationController.getDonationStats);

// Admin donation routes
router.get("/admin/getAllDonations", AdminDonationController.getAllDonations);
router.get("/admin/getDonation/:donationId", AdminDonationController.getDonationById);
router.put("/admin/updateDonationStatus", AdminDonationController.updateDonationStatus);
router.get("/admin/getDonationsByUser/:userId", AdminDonationController.getDonationsByUser);
router.get("/admin/getDonationStatistics", AdminDonationController.getDonationStatistics);
router.get("/admin/getMonthlyDonations", AdminDonationController.getMonthlyDonations);

// Wedding routes (user)
router.post("/createWedding", WeddingController.createWedding);
router.post("/getUserWeddings", WeddingController.getUserWeddings);
router.post("/getWedding", WeddingController.getWedding);
router.put("/updateWeddingStatus", WeddingController.updateWeddingStatus);

// Wedding routes (admin)
router.get("/admin/getAllWeddings", WeddingController.getAllWeddings);

// Communion routes (user)
router.post("/createCommunion", CommunionController.createCommunion);
router.post("/getUserCommunions", CommunionController.getUserCommunions);
router.post("/getCommunion", CommunionController.getCommunion);
router.put("/updateCommunionStatus", CommunionController.updateCommunionStatus);

// Communion routes (admin)
router.get("/admin/getAllCommunions", CommunionController.getAllCommunions);

// Notification routes (for both users and admins)
router.post("/createNotification", NotificationController.createNotification);
router.post("/getNotifications", NotificationController.getNotifications);
router.post("/markAsRead", NotificationController.markAsRead);
router.post("/markAllAsRead", NotificationController.markAllAsRead);
router.post("/deleteNotification", NotificationController.deleteNotification);
router.post("/getUnreadCount", NotificationController.getUnreadCount);

// Volunteer routes
router.post("/getEventVolunteers", VolunteerController.getEventVolunteers);
router.post("/getUserVolunteers", VolunteerController.getUserVolunteers);
router.put("/updateVolunteerStatus", VolunteerController.updateVolunteerStatus);

module.exports = router;  
