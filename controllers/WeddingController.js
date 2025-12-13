// JEROME'S VERSION
// const WeddingModel = require("../models/BookWedding");
// const UserModel = require("../models/User");
// const supabase = require("../config/supabaseClient");
// const { notifyUser } = require("../utils/NotificationHelper");

// /**
//  * Generate a unique transaction ID
//  */
// function generateTransactionId() {
//   const timestamp = Date.now();
//   const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//   return `WED-${timestamp}-${random}`;
// }

// /**
//  * Parse full name into first, middle, and last name
//  */
// function parseFullName(fullName) {
//   if (!fullName || typeof fullName !== 'string') return { first_name: '', middle_name: '', last_name: '' };
//   const parts = fullName.trim().split(/\s+/);
//   if (parts.length === 1) return { first_name: parts[0], middle_name: '', last_name: '' };
//   if (parts.length === 2) return { first_name: parts[0], middle_name: '', last_name: parts[1] };
//   return { first_name: parts[0], middle_name: parts.slice(1, -1).join(' '), last_name: parts[parts.length - 1] };
// }

// /**
//  * Helper function to ensure bucket exists
//  */
// async function ensureBucketExists(bucketName) {
//   const { data: buckets, error: listError } = await supabase.storage.listBuckets();
//   if (listError) { console.error("Error listing buckets:", listError); return false; }

//   const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
//   if (!bucketExists) {
//     console.log(`Bucket "${bucketName}" does not exist. Attempting to create...`);
//     const { data, error } = await supabase.storage.createBucket(bucketName, {
//       public: false,
//       allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
//       fileSizeLimit: 10485760
//     });
//     if (error) { console.error(`Error creating bucket "${bucketName}":`, error); return false; }
//     console.log(`Bucket "${bucketName}" created successfully`);
//   }
//   return true;
// }

// /**
//  * Create a new wedding booking
//  */
// async function createWedding(req, res) {
//   try {
//     const { uid, date, time, attendees, contact_number, groom_fullname, bride_fullname, payment_method, amount } = req.body;

//     if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });
//     if (!date) return res.status(400).json({ message: "Wedding date is required." });
//     if (!time) return res.status(400).json({ message: "Wedding time is required." });
//     if (!attendees || attendees <= 0) return res.status(400).json({ message: "Valid number of attendees is required." });
//     if (!contact_number) return res.status(400).json({ message: "Contact number is required." });
//     if (!groom_fullname) return res.status(400).json({ message: "Groom full name is required." });
//     if (!bride_fullname) return res.status(400).json({ message: "Bride full name is required." });

//     const user = await UserModel.findOne({ uid, is_deleted: false });
//     if (!user) return res.status(404).json({ message: "User not found." });

//     const groomName = parseFullName(groom_fullname);
//     const brideName = parseFullName(bride_fullname);

//     let uploadedDocuments = {};
//     const documentFields = [
//       'marriage_license','marriage_contract','groom_baptismal_cert','bride_baptismal_cert',
//       'groom_confirmation_cert','bride_confirmation_cert','groom_cenomar','bride_cenomar',
//       'groom_banns','bride_banns','groom_permission','bride_permission','groom_1x1','bride_1x1'
//     ];

//     let proofOfPaymentPath = '';

//     if (req.files) {
//       const bucketReady = await ensureBucketExists("bookings");
//       if (!bucketReady) return res.status(500).json({ message: "Storage bucket not available." });

//       for (const fieldName of documentFields) {
//         if (req.files[fieldName] && req.files[fieldName][0]) {
//           const file = req.files[fieldName][0];
//           const fileName = `${Date.now()}-${file.originalname || `${fieldName}.pdf`}`;
//           const folder = fieldName.includes('groom') ? 'wedding/groom' : fieldName.includes('bride') ? 'wedding/bride' : 'wedding';
//           const { data, error } = await supabase.storage.from("bookings").upload(`${folder}/${fileName}`, file.buffer, { contentType: file.mimetype || 'application/pdf', upsert: false });
//           if (error) return res.status(500).json({ message: `Failed to upload ${fieldName}.` });
//           uploadedDocuments[fieldName] = data.path;
//         }
//       }

//       // Handle proof of payment upload
//       if (req.files.proof_of_payment && req.files.proof_of_payment[0]) {
//         const file = req.files.proof_of_payment[0];
//         const fileName = `${Date.now()}-${file.originalname || 'proof_of_payment.jpg'}`;
//         const { data, error } = await supabase.storage.from("bookings").upload(`wedding/payment/${fileName}`, file.buffer, { 
//           contentType: file.mimetype || 'image/jpeg', 
//           upsert: false 
//         });
//         if (error) return res.status(500).json({ message: 'Failed to upload proof of payment.' });
//         proofOfPaymentPath = data.path;
//       }
//     }

//     const weddingData = {
//       transaction_id: generateTransactionId(),
//       date: new Date(date),
//       time: time.toString(),
//       attendees: parseInt(attendees),
//       contact_number: contact_number.trim(),
//       groom_first_name: groomName.first_name,
//       groom_middle_name: groomName.middle_name,
//       groom_last_name: groomName.last_name,
//       groom_pic: uploadedDocuments.groom_1x1 || req.body.groom_1x1,
//       bride_first_name: brideName.first_name,
//       bride_middle_name: brideName.middle_name,
//       bride_last_name: brideName.last_name,
//       bride_pic: uploadedDocuments.bride_1x1 || req.body.bride_1x1,
//       marriage_docu: uploadedDocuments.marriage_license || uploadedDocuments.marriage_contract || req.body.marriage_license || req.body.marriage_contract,
//       groom_cenomar: uploadedDocuments.groom_cenomar || req.body.groom_cenomar || '',
//       bride_cenomar: uploadedDocuments.bride_cenomar || req.body.bride_cenomar || '',
//       groom_baptismal_cert: uploadedDocuments.groom_baptismal_cert || req.body.groom_baptismal_cert,
//       bride_baptismal_cert: uploadedDocuments.bride_baptismal_cert || req.body.bride_baptismal_cert,
//       groom_confirmation_cert: uploadedDocuments.groom_confirmation_cert || req.body.groom_confirmation_cert,
//       bride_confirmation_cert: uploadedDocuments.bride_confirmation_cert || req.body.bride_confirmation_cert,
//       groom_permission: uploadedDocuments.groom_permission || uploadedDocuments.groom_banns || req.body.groom_permission || req.body.groom_banns || '',
//       bride_permission: uploadedDocuments.bride_permission || uploadedDocuments.bride_banns || req.body.bride_permission || req.body.bride_banns || '',
//       status: "pending",
//       uid: user.uid,
//       name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
//       email: user.email || '',
//       payment_method: payment_method || 'in_person',
//       proof_of_payment: proofOfPaymentPath,
//       amount: parseFloat(amount) || 0,
//     };

//     const newWedding = new WeddingModel(weddingData);
//     await newWedding.save();

//     res.status(201).json({ message: "Wedding booking created successfully.", wedding: newWedding, transaction_id: weddingData.transaction_id });

//   } catch (err) {
//     console.error("Error creating wedding booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all wedding bookings for a user (include uid, name, email)
//  */
// async function getUserWeddings(req, res) {
//   try {
//     const { uid } = req.body;
//     if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

//     const user = await UserModel.findOne({ uid, is_deleted: false });
//     if (!user) return res.status(404).json({ message: "User not found." });

//     const weddings = await WeddingModel.find({ contact_number: user.contact_number }).sort({ createdAt: -1 }).lean();
//     const weddingsWithUser = weddings.map(w => ({
//       ...w,
//       uid: user.uid,
//       name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
//       email: user.email || ''
//     }));

//     res.status(200).json({ message: "Wedding bookings retrieved successfully.", weddings: weddingsWithUser, count: weddingsWithUser.length });

//   } catch (err) {
//     console.error("Error getting wedding bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get a specific wedding booking by transaction ID (include uid, name, email)
//  */
// async function getWedding(req, res) {
//   try {
//     const { transaction_id } = req.body;
//     if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });

//     const wedding = await WeddingModel.findOne({ transaction_id }).lean();
//     if (!wedding) return res.status(404).json({ message: "Wedding booking not found." });

//     const user = await UserModel.findOne({ uid: wedding.uid, is_deleted: false }).lean();
//     const weddingWithUser = {
//       ...wedding,
//       uid: user?.uid,
//       name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
//       email: user?.email || "N/A",
//     };

//     res.status(200).json({ message: "Wedding booking retrieved successfully.", wedding: weddingWithUser });

//   } catch (err) {
//     console.error("Error getting wedding booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Update wedding booking status
//  */
// async function updateWeddingStatus(req, res) {
//   try {
//     const { transaction_id, status, priest_id, priest_name } = req.body;
//     if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });
//     if (!status) return res.status(400).json({ message: "Status is required." });

//     const validStatuses = ["pending","confirmed","cancelled"];
//     if (!validStatuses.includes(status)) return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });

//     const wedding = await WeddingModel.findOne({ transaction_id });
//     if (!wedding) return res.status(404).json({ message: "Wedding booking not found." });

//     wedding.status = status;
    
//     // Assign priest when confirming
//     if (status === "confirmed" && priest_id) {
//       wedding.priest_id = priest_id;
//       if (priest_name) {
//         wedding.priest_name = priest_name;
//       } else if (priest_id) {
//         // Fetch priest name if not provided
//         const priest = await UserModel.findOne({ uid: priest_id, is_priest: true, is_deleted: false });
//         if (priest) {
//           wedding.priest_name = `${priest.first_name} ${priest.middle_name || ''} ${priest.last_name}`.trim();
//         }
//       }
//     }
    
//     await wedding.save();

//     // Send notifications when booking is confirmed
//     if (status === "confirmed") {
//       try {
//         const bookingDate = new Date(wedding.date).toLocaleDateString("en-US", {
//           year: "numeric",
//           month: "long",
//           day: "numeric",
//         });
//         const bookingTime = wedding.time || "N/A";

//         // Notify the user
//         if (wedding.uid) {
//           await notifyUser(
//             wedding.uid,
//             "booking_status",
//             "Wedding Booking Confirmed",
//             `Your wedding booking (${wedding.transaction_id}) has been confirmed. Date: ${bookingDate}, Time: ${bookingTime}${wedding.priest_name ? `, Priest: ${wedding.priest_name}` : ""}.`,
//             {
//               action: "BookingHistoryScreen",
//               metadata: {
//                 booking_id: wedding.transaction_id,
//                 booking_type: "Wedding",
//                 date: wedding.date,
//                 time: wedding.time,
//               },
//               priority: "high",
//             }
//           );
//         }

//         // Notify the priest
//         if (priest_id) {
//           await notifyUser(
//             priest_id,
//             "booking_status",
//             "New Wedding Assignment",
//             `You have been assigned to a wedding booking (${wedding.transaction_id}). Date: ${bookingDate}, Time: ${bookingTime}.`,
//             {
//               action: "BookingHistoryScreen",
//               metadata: {
//                 booking_id: wedding.transaction_id,
//                 booking_type: "Wedding",
//                 date: wedding.date,
//                 time: wedding.time,
//               },
//               priority: "high",
//             }
//           );
//         }
//       } catch (notificationError) {
//         console.error("Error sending notifications:", notificationError);
//       }
//     }

//     res.status(200).json({ message: "Wedding booking status updated successfully.", wedding });

//   } catch (err) {
//     console.error("Error updating wedding status:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all wedding bookings (admin, include uid, name, email)
//  */
// async function getAllWeddings(req, res) {
//   try {
//     const weddings = await WeddingModel.find().sort({ createdAt: -1 }).lean();

//     const userIds = weddings.map(w => w.uid);
//     const users = await UserModel.find({ uid: { $in: userIds }, is_deleted: false }).lean();
//     const userMap = {};
//     users.forEach(u => { userMap[u.uid] = u; });

//     const weddingsWithUser = weddings.map(w => {
//       const user = userMap[w.uid];
//       return {
//         ...w,
//         uid: user?.uid,
//         name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
//         email: user?.email || "N/A"
//       };
//     });

//     res.status(200).json({ message: "All wedding bookings retrieved successfully.", weddings: weddingsWithUser, count: weddingsWithUser.length });

//   } catch (err) {
//     console.error("Error getting all wedding bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get proof of payment image URL
//  * GET /api/getProofOfPayment?path=wedding/payment/filename.jpg
//  */
// async function getProofOfPayment(req, res) {
//   try {
//     const { path } = req.query;
    
//     if (!path) {
//       return res.status(400).json({ message: "Path parameter is required." });
//     }

//     const supabase = require("../config/supabaseClient");
//     const { data } = supabase.storage.from("bookings").getPublicUrl(path);
    
//     if (data?.publicUrl) {
//       return res.json({ url: data.publicUrl });
//     } else {
//       return res.status(404).json({ message: "Proof of payment not found." });
//     }
//   } catch (err) {
//     console.error("Error getting proof of payment:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// async function AddWeddingBookingWeb(req, res) {
//   try {
//     const {
//       uid,
//       email,
//       transaction_id,
//       date,
//       time,
//       attendees,
//       contact_number,
//       groom_last_name,
//       groom_first_name,
//       groom_middle_name,
//       groom_pic,
//       bride_last_name,
//       bride_first_name,
//       bride_middle_name,
//       bride_pic,
//       marriage_docu,
//       groom_cenomar,
//       bride_cenomar,
//       groom_baptismal_cert,
//       bride_baptismal_cert,
//       groom_confirmation_cert,
//       bride_confirmation_cert,
//       groom_permission,
//       bride_permission,
//     } = req.body;

//     // CREATE NEW DOCUMENT
//     const newWedding = new WeddingModel({
//       uid,
//       email,
//       transaction_id,
//       date,
//       time,
//       attendees,
//       contact_number,
//       groom_last_name,
//       groom_first_name,
//       groom_middle_name,
//       groom_pic,
//       bride_last_name,
//       bride_first_name,
//       bride_middle_name,
//       bride_pic,
//       marriage_docu,
//       groom_cenomar,
//       bride_cenomar,
//       groom_baptismal_cert,
//       bride_baptismal_cert,
//       groom_confirmation_cert,
//       bride_confirmation_cert,
//       groom_permission,
//       bride_permission,
//     });

//     // SAVE TO DB
//     const savedWedding = await newWedding.save();

//     res.status(201).json({
//       success: true,
//       message: "Wedding booking created successfully",
//       data: savedWedding,
//     });
//   } catch (error) {
//     console.error("ADD WEDDING ERROR:", error);
//     res.status(500).json({
//       success: false,
//       message: "Failed to create wedding booking",
//       error: error.message,
//     });
//   }
// };

// module.exports = {
//   WeddingModel,
//   createWedding,
//   getUserWeddings,
//   getWedding,
//   updateWeddingStatus,
//   getAllWeddings,
//   getProofOfPayment,
//   AddWeddingBookingWeb
// };


// BERLENE'S VERSION
const WeddingModel = require("../models/BookWedding");
const UserModel = require("../models/User");
const supabase = require("../config/supabaseClient");
const { notifyUser } = require("../utils/NotificationHelper");

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `WED-${timestamp}-${random}`;
}

/**
 * Parse full name into first, middle, and last name
 * Handles cases where database requires all fields (uses 'N/A' for missing middle names)
 */
function parseFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') {
    return { first_name: 'N/A', middle_name: 'N/A', last_name: 'N/A' };
  }
  const parts = fullName.trim().split(/\s+/).filter(p => p.length > 0);
  
  if (parts.length === 0) {
    return { first_name: 'N/A', middle_name: 'N/A', last_name: 'N/A' };
  }
  
  if (parts.length === 1) {
    // Single name: use it as first name, duplicate as last name, 'N/A' for middle
    return { first_name: parts[0], middle_name: 'N/A', last_name: parts[0] };
  }
  
  if (parts.length === 2) {
    // Two names: first and last, 'N/A' for middle
    return { first_name: parts[0], middle_name: 'N/A', last_name: parts[1] };
  }
  
  // Three or more names: first, middle(s), last
  return { 
    first_name: parts[0], 
    middle_name: parts.slice(1, -1).join(' ') || 'N/A', 
    last_name: parts[parts.length - 1] 
  };
}

/**
 * Helper function to ensure bucket exists
 */
async function ensureBucketExists(bucketName) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) { console.error("Error listing buckets:", listError); return false; }

  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  if (!bucketExists) {
    console.log(`Bucket "${bucketName}" does not exist. Attempting to create...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      fileSizeLimit: 10485760
    });
    if (error) { console.error(`Error creating bucket "${bucketName}":`, error); return false; }
    console.log(`Bucket "${bucketName}" created successfully`);
  }
  return true;
}

/**
 * Create a new wedding booking
 */
async function createWedding(req, res) {
  try {
    const { uid, date, time, attendees, contact_number, groom_fullname, bride_fullname, payment_method, amount } = req.body;

    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });
    if (!date) return res.status(400).json({ message: "Wedding date is required." });
    if (!time) return res.status(400).json({ message: "Wedding time is required." });
    if (!attendees || attendees <= 0) return res.status(400).json({ message: "Valid number of attendees is required." });
    if (!contact_number) return res.status(400).json({ message: "Contact number is required." });
    if (!groom_fullname) return res.status(400).json({ message: "Groom full name is required." });
    if (!bride_fullname) return res.status(400).json({ message: "Bride full name is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    const groomName = parseFullName(groom_fullname);
    const brideName = parseFullName(bride_fullname);

    let uploadedDocuments = {};
    const documentFields = [
      'marriage_license','marriage_contract','groom_baptismal_cert','bride_baptismal_cert',
      'groom_confirmation_cert','bride_confirmation_cert','groom_cenomar','bride_cenomar',
      'groom_banns','bride_banns','groom_permission','bride_permission','groom_1x1','bride_1x1'
    ];

    let proofOfPaymentPath = '';

    if (req.files) {
      const bucketReady = await ensureBucketExists("bookings");
      if (!bucketReady) return res.status(500).json({ message: "Storage bucket not available." });

      for (const fieldName of documentFields) {
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];
          const fileName = `${Date.now()}-${file.originalname || `${fieldName}.pdf`}`;
          const folder = fieldName.includes('groom') ? 'wedding/groom' : fieldName.includes('bride') ? 'wedding/bride' : 'wedding';
          const { data, error } = await supabase.storage.from("bookings").upload(`${folder}/${fileName}`, file.buffer, { contentType: file.mimetype || 'application/pdf', upsert: false });
          if (error) return res.status(500).json({ message: `Failed to upload ${fieldName}.` });
          uploadedDocuments[fieldName] = data.path;
        }
      }

      // Handle proof of payment upload
      if (req.files.proof_of_payment && req.files.proof_of_payment[0]) {
        const file = req.files.proof_of_payment[0];
        const fileName = `${Date.now()}-${file.originalname || 'proof_of_payment.jpg'}`;
        const { data, error } = await supabase.storage.from("bookings").upload(`wedding/payment/${fileName}`, file.buffer, { 
          contentType: file.mimetype || 'image/jpeg', 
          upsert: false 
        });
        if (error) return res.status(500).json({ message: 'Failed to upload proof of payment.' });
        proofOfPaymentPath = data.path;
      }
    }

    const weddingData = {
      transaction_id: generateTransactionId(),
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      contact_number: contact_number.trim(),
      groom_first_name: groomName.first_name,
      groom_middle_name: groomName.middle_name,
      groom_last_name: groomName.last_name,
      groom_pic: uploadedDocuments.groom_1x1 || req.body.groom_1x1,
      bride_first_name: brideName.first_name,
      bride_middle_name: brideName.middle_name,
      bride_last_name: brideName.last_name,
      bride_pic: uploadedDocuments.bride_1x1 || req.body.bride_1x1,
      marriage_docu: uploadedDocuments.marriage_license || uploadedDocuments.marriage_contract || req.body.marriage_license || req.body.marriage_contract,
      groom_cenomar: uploadedDocuments.groom_cenomar || req.body.groom_cenomar || '',
      bride_cenomar: uploadedDocuments.bride_cenomar || req.body.bride_cenomar || '',
      groom_baptismal_cert: uploadedDocuments.groom_baptismal_cert || req.body.groom_baptismal_cert,
      bride_baptismal_cert: uploadedDocuments.bride_baptismal_cert || req.body.bride_baptismal_cert,
      groom_confirmation_cert: uploadedDocuments.groom_confirmation_cert || req.body.groom_confirmation_cert,
      bride_confirmation_cert: uploadedDocuments.bride_confirmation_cert || req.body.bride_confirmation_cert,
      groom_permission: uploadedDocuments.groom_permission || uploadedDocuments.groom_banns || req.body.groom_permission || req.body.groom_banns || '',
      bride_permission: uploadedDocuments.bride_permission || uploadedDocuments.bride_banns || req.body.bride_permission || req.body.bride_banns || '',
      status: "pending",
      uid: user.uid,
      name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email || '',
      payment_method: payment_method || 'in_person',
      proof_of_payment: proofOfPaymentPath,
      amount: parseFloat(amount) || 0,
    };

    const newWedding = new WeddingModel(weddingData);
    await newWedding.save();

    res.status(201).json({ message: "Wedding booking created successfully.", wedding: newWedding, transaction_id: weddingData.transaction_id });

  } catch (err) {
    console.error("Error creating wedding booking:", err);
    console.error("Error stack:", err.stack);
    console.error("Error details:", {
      message: err.message,
      name: err.name,
      code: err.code,
      keyPattern: err.keyPattern,
      keyValue: err.keyValue
    });
    
    // Provide more detailed error message
    let errorMessage = "Server error. Please try again later.";
    if (err.name === 'ValidationError') {
      errorMessage = `Validation error: ${Object.keys(err.errors).map(key => `${key}: ${err.errors[key].message}`).join(', ')}`;
    } else if (err.message) {
      errorMessage = err.message;
    }
    
    res.status(500).json({ 
      message: errorMessage,
      error: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
}

/**
 * Get all wedding bookings for a user (include uid, name, email)
 */
async function getUserWeddings(req, res) {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    const weddings = await WeddingModel.find({ contact_number: user.contact_number }).sort({ createdAt: -1 }).lean();
    const weddingsWithUser = weddings.map(w => ({
      ...w,
      uid: user.uid,
      name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email || ''
    }));

    res.status(200).json({ message: "Wedding bookings retrieved successfully.", weddings: weddingsWithUser, count: weddingsWithUser.length });

  } catch (err) {
    console.error("Error getting wedding bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get a specific wedding booking by transaction ID (include uid, name, email)
 */
async function getWedding(req, res) {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });

    const wedding = await WeddingModel.findOne({ transaction_id }).lean();
    if (!wedding) return res.status(404).json({ message: "Wedding booking not found." });

    const user = await UserModel.findOne({ uid: wedding.uid, is_deleted: false }).lean();
    const weddingWithUser = {
      ...wedding,
      uid: user?.uid,
      name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
      email: user?.email || "N/A",
    };

    res.status(200).json({ message: "Wedding booking retrieved successfully.", wedding: weddingWithUser });

  } catch (err) {
    console.error("Error getting wedding booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update wedding booking status
 */
async function updateWeddingStatus(req, res) {
  try {
    const { transaction_id, status, priest_id, priest_name } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });
    if (!status) return res.status(400).json({ message: "Status is required." });

    const validStatuses = ["pending","confirmed","cancelled"];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });

    const wedding = await WeddingModel.findOne({ transaction_id });
    if (!wedding) return res.status(404).json({ message: "Wedding booking not found." });

    wedding.status = status;
    
    // Assign priest when confirming
    if (status === "confirmed" && priest_id) {
      wedding.priest_id = priest_id;
      if (priest_name) {
        wedding.priest_name = priest_name;
      } else if (priest_id) {
        // Fetch priest name if not provided
        const priest = await UserModel.findOne({ uid: priest_id, is_priest: true, is_deleted: false });
        if (priest) {
          wedding.priest_name = `${priest.first_name} ${priest.middle_name || ''} ${priest.last_name}`.trim();
        }
      }
    }
    
    await wedding.save();

    // Send notifications when booking is confirmed
    if (status === "confirmed") {
      try {
        const bookingDate = new Date(wedding.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const bookingTime = wedding.time || "N/A";

        // Notify the user
        if (wedding.uid) {
          await notifyUser(
            wedding.uid,
            "booking_status",
            "Wedding Booking Confirmed",
            `Your wedding booking (${wedding.transaction_id}) has been confirmed. Date: ${bookingDate}, Time: ${bookingTime}${wedding.priest_name ? `, Priest: ${wedding.priest_name}` : ""}.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: wedding.transaction_id,
                booking_type: "Wedding",
                date: wedding.date,
                time: wedding.time,
              },
              priority: "high",
            }
          );
        }

        // Notify the priest
        if (priest_id) {
          await notifyUser(
            priest_id,
            "booking_status",
            "New Wedding Assignment",
            `You have been assigned to a wedding booking (${wedding.transaction_id}). Date: ${bookingDate}, Time: ${bookingTime}.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: wedding.transaction_id,
                booking_type: "Wedding",
                date: wedding.date,
                time: wedding.time,
              },
              priority: "high",
            }
          );
        }
      } catch (notificationError) {
        console.error("Error sending notifications:", notificationError);
      }
    }

    res.status(200).json({ message: "Wedding booking status updated successfully.", wedding });

  } catch (err) {
    console.error("Error updating wedding status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all wedding bookings (admin, include uid, name, email)
 */
async function getAllWeddings(req, res) {
  try {
    const weddings = await WeddingModel.find().sort({ createdAt: -1 }).lean();

    const userIds = weddings.map(w => w.uid);
    const users = await UserModel.find({ uid: { $in: userIds }, is_deleted: false }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u; });

    const weddingsWithUser = weddings.map(w => {
      const user = userMap[w.uid];
      return {
        ...w,
        uid: user?.uid,
        name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
        email: user?.email || "N/A"
      };
    });

    res.status(200).json({ message: "All wedding bookings retrieved successfully.", weddings: weddingsWithUser, count: weddingsWithUser.length });

  } catch (err) {
    console.error("Error getting all wedding bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get proof of payment image URL
 * GET /api/getProofOfPayment?path=wedding/payment/filename.jpg
 */
async function getProofOfPayment(req, res) {
  try {
    const { path } = req.query;
    
    if (!path) {
      return res.status(400).json({ message: "Path parameter is required." });
    }

    const supabase = require("../config/supabaseClient");
    const { data } = supabase.storage.from("bookings").getPublicUrl(path);
    
    if (data?.publicUrl) {
      return res.json({ url: data.publicUrl });
    } else {
      return res.status(404).json({ message: "Proof of payment not found." });
    }
  } catch (err) {
    console.error("Error getting proof of payment:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function AddWeddingBookingWeb(req, res) {
  try {
    const {
      uid,
      email,
      transaction_id,
      date,
      time,
      attendees,
      contact_number,
      groom_last_name,
      groom_first_name,
      groom_middle_name,
      groom_pic,
      bride_last_name,
      bride_first_name,
      bride_middle_name,
      bride_pic,
      marriage_docu,
      groom_cenomar,
      bride_cenomar,
      groom_baptismal_cert,
      bride_baptismal_cert,
      groom_confirmation_cert,
      bride_confirmation_cert,
      groom_permission,
      bride_permission,
    } = req.body;

    // CREATE NEW DOCUMENT
    const newWedding = new WeddingModel({
      uid,
      email,
      transaction_id,
      date,
      time,
      attendees,
      contact_number,
      groom_last_name,
      groom_first_name,
      groom_middle_name,
      groom_pic,
      bride_last_name,
      bride_first_name,
      bride_middle_name,
      bride_pic,
      marriage_docu,
      groom_cenomar,
      bride_cenomar,
      groom_baptismal_cert,
      bride_baptismal_cert,
      groom_confirmation_cert,
      bride_confirmation_cert,
      groom_permission,
      bride_permission,
    });

    // SAVE TO DB
    const savedWedding = await newWedding.save();

    res.status(201).json({
      success: true,
      message: "Wedding booking created successfully",
      data: savedWedding,
    });
  } catch (error) {
    console.error("ADD WEDDING ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create wedding booking",
      error: error.message,
    });
  }
};

module.exports = {
  WeddingModel,
  createWedding,
  getUserWeddings,
  getWedding,
  updateWeddingStatus,
  getAllWeddings,
  getProofOfPayment,
  AddWeddingBookingWeb
};
