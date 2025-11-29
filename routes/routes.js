const express = require("express");
const router = express.Router();

const UserController = require("../controllers/UserController");
const AdminController = require("../controllers/AdminController")
const DonationController = require("../controllers/DonationController")
const AdminDonationController = require("../controllers/AdminDonationController");
const WeddingController = require("../controllers/WeddingController");
const BaptismController = require("../controllers/BaptismController");
const BurialController = require("../controllers/BurialController");
const CommunionController = require("../controllers/CommunionController");
const AnointingController = require("../controllers/AnointingController");
const ConfirmationController = require("../controllers/ConfirmationController");
const NotificationController = require("../controllers/NotificationController");
const VolunteerController = require("../controllers/VolunteerController");
const EventController = require("../controllers/EventController");
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

// Wedding routes (user) - with file upload support for PDFs and images
router.post("/createWedding", upload.fields([
  { name: "marriage_license", maxCount: 1 },
  { name: "marriage_contract", maxCount: 1 },
  { name: "groom_1x1", maxCount: 1 },
  { name: "bride_1x1", maxCount: 1 },
  { name: "groom_baptismal_cert", maxCount: 1 },
  { name: "bride_baptismal_cert", maxCount: 1 },
  { name: "groom_confirmation_cert", maxCount: 1 },
  { name: "bride_confirmation_cert", maxCount: 1 },
  { name: "groom_cenomar", maxCount: 1 },
  { name: "bride_cenomar", maxCount: 1 },
  { name: "groom_banns", maxCount: 1 },
  { name: "bride_banns", maxCount: 1 },
  { name: "groom_permission", maxCount: 1 },
  { name: "bride_permission", maxCount: 1 },
]), WeddingController.createWedding);
router.post("/getUserWeddings", WeddingController.getUserWeddings);
router.post("/getWedding", WeddingController.getWedding);
router.put("/updateWeddingStatus", WeddingController.updateWeddingStatus);

// Wedding routes (admin)
router.get("/admin/getAllWeddings", WeddingController.getAllWeddings);

// Baptism routes (user) - with file upload support
router.post("/createBaptism", upload.fields([
  { name: "birth_certificate", maxCount: 1 },
  { name: "parents_marriage_certificate", maxCount: 1 },
  { name: "godparent_confirmation", maxCount: 1 },
  { name: "baptismal_seminar", maxCount: 1 },
]), BaptismController.createBaptism);
router.post("/getUserBaptisms", BaptismController.getUserBaptisms);
router.post("/getBaptism", BaptismController.getBaptism);
router.put("/updateBaptismStatus", BaptismController.updateBaptismStatus);

// Baptism routes (admin)
router.get("/admin/getAllBaptisms", BaptismController.getAllBaptisms);

// Burial routes (user) - with file upload support
router.post("/createBurial", upload.fields([
  { name: "death_certificate", maxCount: 1 },
  { name: "deceased_baptismal", maxCount: 1 },
]), BurialController.createBurial);
router.post("/getUserBurials", BurialController.getUserBurials);
router.post("/getBurial", BurialController.getBurial);
router.put("/updateBurialStatus", BurialController.updateBurialStatus);

// Burial routes (admin)
router.get("/admin/getAllBurials", BurialController.getAllBurials);

// Communion routes (user) - with file upload support
router.post("/createCommunion", upload.fields([
  { name: "baptismal_certificate", maxCount: 1 },
  { name: "communion_preparation", maxCount: 1 },
  { name: "parent_consent", maxCount: 1 },
]), CommunionController.createCommunion);
router.post("/getUserCommunions", CommunionController.getUserCommunions);
router.post("/getCommunion", CommunionController.getCommunion);
router.put("/updateCommunionStatus", CommunionController.updateCommunionStatus);

// Communion routes (admin)
router.get("/admin/getAllCommunions", CommunionController.getAllCommunions);

// Anointing routes (user) - with file upload support
router.post("/createAnointing", upload.fields([
  { name: "medical_certificate", maxCount: 1 },
]), AnointingController.createAnointing);
router.post("/getUserAnointings", AnointingController.getUserAnointings);
router.post("/getAnointing", AnointingController.getAnointing);
router.put("/updateAnointingStatus", AnointingController.updateAnointingStatus);

// Anointing routes (admin)
router.get("/admin/getAllAnointings", AnointingController.getAllAnointings);

// Confirmation routes (user) - with file upload support
router.post("/createConfirmation", upload.fields([
  { name: "baptismal_certificate", maxCount: 1 },
  { name: "first_communion_certificate", maxCount: 1 },
  { name: "confirmation_preparation", maxCount: 1 },
  { name: "sponsor_certificate", maxCount: 1 },
]), ConfirmationController.createConfirmation);
router.post("/getUserConfirmations", ConfirmationController.getUserConfirmations);
router.post("/getConfirmation", ConfirmationController.getConfirmation);
router.put("/updateConfirmationStatus", ConfirmationController.updateConfirmationStatus);

// Confirmation routes (admin)
router.get("/admin/getAllConfirmations", ConfirmationController.getAllConfirmations);

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
router.post('/addVolunteer', VolunteerController.addVolunteer);
router.post("/getAllVolunteers", VolunteerController.getAllVolunteers);

// User can view events
router.get("/getAllEvents", EventController.getAllEvents);
router.get("/getEvent/:eventId", EventController.getEventById);

// Admin routes
router.post("/admin/createEvent", upload.single("image"), EventController.createEvent);
router.put("/admin/updateEvent", upload.single("image"), EventController.updateEvent);
router.delete("/admin/deleteEvent/:eventId", EventController.deleteEvent);
router.get("/admin/getAllLocations", EventController.getAllLocations);

module.exports = router;  
