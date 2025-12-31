const express = require("express");
const mongoose = require("mongoose");
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
const AnnouncementController = require("../controllers/AnnouncementController");
const ConfessionController = require("../controllers/ConfessionController");
const PriestScheduleController = require("../controllers/PriestScheduleController");
const ChatController = require("../controllers/ChatController");
const BookingConflictController = require("../controllers/BookingConflictController");
const DashboardController = require("../controllers/DashboardController");
const upload = require("../middleware/upload");
const testFCMRoute = require("./testFCM"); 




// Web Routes

router.post("/createWeddingBooking", WeddingController.AddWeddingBookingWeb)

// User routes
router.post("/createUser", UserController.createUser);
router.post("/findUser", UserController.findUser)
router.post("/login", UserController.login)
router.get("/getAllUsers", UserController.getAllUsers)
router.get("/getAllPriests", UserController.getAllPriests)
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
  { name: 'proof_of_payment', maxCount: 1 },
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
router.put("/updateWedding", WeddingController.updateWedding);

// Wedding routes (admin)
router.get("/admin/getAllWeddings", WeddingController.getAllWeddings);

// Proof of payment route (public)
router.get("/getProofOfPayment", WeddingController.getProofOfPayment);

// Baptism routes (user) - with file upload support
router.post("/createBaptism", upload.fields([
  { name: 'proof_of_payment', maxCount: 1 },
  { name: "birth_certificate", maxCount: 1 },
  { name: "parents_marriage_certificate", maxCount: 1 },
  { name: "godparent_confirmation", maxCount: 1 },
  { name: "baptismal_seminar", maxCount: 1 },
]), BaptismController.createBaptism);
router.post("/getUserBaptisms", BaptismController.getUserBaptisms);
router.post("/getBaptism", BaptismController.getBaptism);
router.put("/updateBaptismStatus", BaptismController.updateBaptismStatus);
router.put("/updateBaptism", BaptismController.updateBaptism);

// Baptism routes (admin)
router.get("/admin/getAllBaptisms", BaptismController.getAllBaptisms);
router.post("/addBaptismalWeb", BaptismController.AddBaptismalWeb); 

// Burial routes (user) - with file upload support
router.post("/createBurial", upload.fields([
  { name: 'proof_of_payment', maxCount: 1 },
  { name: "death_certificate", maxCount: 1 },
  { name: "deceased_baptismal", maxCount: 1 },
]), BurialController.createBurial);
router.post("/getUserBurials", BurialController.getUserBurials);
router.post("/getBurial", BurialController.getBurial);
router.put("/updateBurialStatus", BurialController.updateBurialStatus);
router.put("/updateBurial", BurialController.updateBurial);
router.post("/createBurialWeb", BurialController.createBurialWeb);

// Burial routes (admin)
router.get("/admin/getAllBurials", BurialController.getAllBurials);

// Communion routes (user) - with file upload support
router.post("/createCommunion", upload.fields([
  { name: 'proof_of_payment', maxCount: 1 },
  { name: "baptismal_certificate", maxCount: 1 },
  { name: "communion_preparation", maxCount: 1 },
  { name: "parent_consent", maxCount: 1 },
]), CommunionController.createCommunion);
router.post("/getUserCommunions", CommunionController.getUserCommunions);
router.post("/getCommunion", CommunionController.getCommunion);
router.put("/updateCommunionStatus", CommunionController.updateCommunionStatus);
router.put("/updateCommunion", CommunionController.updateCommunion);
router.post("/createCommunionWeb", CommunionController.createCommunionWeb);

// Communion routes (admin)
router.get("/admin/getAllCommunions", CommunionController.getAllCommunions);

// Anointing routes (user) - with file upload support
router.post("/createAnointing", upload.fields([
  { name: 'proof_of_payment', maxCount: 1 },
  { name: "medical_certificate", maxCount: 1 },
]), AnointingController.createAnointing);
router.post("/getUserAnointings", AnointingController.getUserAnointings);
router.post("/getAnointing", AnointingController.getAnointing);
router.put("/updateAnointingStatus", AnointingController.updateAnointingStatus);
router.put("/updateAnointing", AnointingController.updateAnointing);


// Anointing routes (admin)
router.get("/admin/getAllAnointings", AnointingController.getAllAnointings);

// Confirmation routes (user) - with file upload support
router.post("/createConfirmation", upload.fields([
  { name: 'proof_of_payment', maxCount: 1 },
  { name: "baptismal_certificate", maxCount: 1 },
  { name: "first_communion_certificate", maxCount: 1 },
  { name: "confirmation_preparation", maxCount: 1 },
  { name: "sponsor_certificate", maxCount: 1 },
]), ConfirmationController.createConfirmation);
router.post("/getUserConfirmations", ConfirmationController.getUserConfirmations);
router.post("/getConfirmation", ConfirmationController.getConfirmation);
router.put("/updateConfirmationStatus", ConfirmationController.updateConfirmationStatus);
router.put("/updateConfirmation", ConfirmationController.updateConfirmation);

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

// Announcement routes (public for users)
router.get("/getAnnouncements", AnnouncementController.getAnnouncements);

// Admin announcement routes
router.post("/admin/createAnnouncement", AnnouncementController.createAnnouncement);
router.put("/admin/updateAnnouncement/:id", AnnouncementController.updateAnnouncement);
router.delete("/admin/deleteAnnouncement/:id", AnnouncementController.deleteAnnouncement);

// Confession routes (user)
router.post("/createConfession", ConfessionController.createConfession);
router.post("/getUserConfessions", ConfessionController.getUserConfessions);
router.post("/getConfession", ConfessionController.getConfession);
router.put("/updateConfessionStatus", ConfessionController.updateConfessionStatus);
router.put("/updateConfession", ConfessionController.updateConfession);

// Confession routes (admin)
router.get("/admin/getAllConfessions", ConfessionController.getAllConfessions);

// Priest schedule route
router.post("/getPriestSchedule", PriestScheduleController.getPriestSchedule);

// Booking conflict check route
router.post("/checkBookingConflict", BookingConflictController.checkBookingConflict);

// Chat routes
router.post("/chat/getOrCreateChat", ChatController.getOrCreateChat);
router.get("/chat/getAllChats", ChatController.getAllChats);
router.get("/chat/getChatByUserId/:userId", ChatController.getChatByUserId);
router.post("/chat/markAsRead", ChatController.markAsRead);
router.post("/chat/markAsSeen", ChatController.markAsSeen);
router.get("/chat/getUnreadCount", ChatController.getUnreadCount);

// AI Chatbot routes
router.post("/chat/ai/response", ChatController.getAIResponse);
router.post("/chat/ai/history", ChatController.getAIChatHistory);
router.post("/chat/ai/clear", ChatController.clearAIChatHistory);

// Dashboard AI Stats route
router.get("/admin/ai/stats", DashboardController.getAIStatsAnalysis);

// Test FCM route
router.use("/", testFCMRoute);

// Cancel booking route (for all sacrament types)
router.put("/cancelBooking", async (req, res) => {
  const { transaction_id, bookingType } = req.body;

  if (!transaction_id || !bookingType) {
    return res.status(400).json({ message: "transaction_id and bookingType are required" });
  }

  let Model;
  switch (bookingType) {
    case "Wedding": 
      Model = require("../controllers/WeddingController").WeddingModel; 
      break;

    case "Baptism": 
      Model = require("../controllers/BaptismController").BaptismModel; 
      break;

    case "Burial": 
      Model = require("../controllers/BurialController").BurialModel; 
      break;

    case "Communion": 
      Model = require("../controllers/CommunionController").CommunionModel; 
      break;

    case "Confirmation": 
      Model = require("../controllers/ConfirmationController").ConfirmationModel; 
      break;

    case "Anointing": 
      Model = require("../controllers/AnointingController").AnointingModel; 
      break;

    default: 
      return res.status(400).json({ message: "Invalid bookingType" });
  }

  try {
    const result = await Model.updateOne(
      { transaction_id },
      { $set: { status: "cancelled" } }
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({ message: "Booking not found" });
    }

    res.json({ message: `${bookingType} booking cancelled successfully` });

  } catch (err) {
    console.error("Cancel booking error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

router.get("/health", async (req, res) => {
  const dbState = mongoose.connection.readyState; 
  let dbStatus;

  switch (dbState) {
    case 0: dbStatus = "disconnected"; break;
    case 1: dbStatus = "connected"; break;
    case 2: dbStatus = "connecting"; break;
    case 3: dbStatus = "disconnecting"; break;
    default: dbStatus = "unknown";
  }

  const statusCode = dbState === 1 ? 200 : 503;

  res.status(statusCode).json({
    status: dbState === 1 ? "ok" : "error",
    timestamp: new Date().toISOString(),
    message: dbState === 1 ? "API and database are healthy" : "API is running but database is not connected",
    dbStatus
  });
});

module.exports = router;  
