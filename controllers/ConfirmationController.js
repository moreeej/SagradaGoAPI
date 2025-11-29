// const ConfirmationModel = require("../models/BookConfirmation");
// const UserModel = require("../models/User");
// const supabase = require("../config/supabaseClient");

// /**
//  * Generate a unique transaction ID
//  */
// function generateTransactionId() {
//   const timestamp = Date.now();
//   const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//   return `CON-${timestamp}-${random}`;
// }

// /**
//  * Helper function to ensure bucket exists
//  */
// async function ensureBucketExists(bucketName) {
//   const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
//   if (listError) {
//     console.error("Error listing buckets:", listError);
//     return false;
//   }
  
//   const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  
//   if (!bucketExists) {
//     console.log(`Bucket "${bucketName}" does not exist. Attempting to create...`);
//     const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
//       public: false,
//       allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
//       fileSizeLimit: 10485760 // 10MB limit
//     });
    
//     if (createError) {
//       console.error(`Error creating bucket "${bucketName}":`, createError);
//       return false;
//     }
    
//     console.log(`Bucket "${bucketName}" created successfully`);
//   }
  
//   return true;
// }

// /**
//  * Create a new confirmation booking
//  * POST /api/createConfirmation
//  * Body: { uid, date, time, attendees, contact_number, sponsor_name }
//  * Files: baptismal_certificate, first_communion_certificate, confirmation_preparation, sponsor_certificate
//  */
// async function createConfirmation(req, res) {
//   try {
//     console.log("=== Confirmation Booking Creation Request ===");
//     console.log("req.body:", req.body);
//     console.log("req.files:", req.files ? JSON.stringify(Object.keys(req.files)) : "No files");

//     const {
//       uid,
//       date,
//       time,
//       attendees,
//       contact_number,
//       sponsor_name,
//     } = req.body;

//     // Validate required fields
//     if (!uid) {
//       return res.status(400).json({ message: "User ID (uid) is required." });
//     }

//     if (!date) {
//       return res.status(400).json({ message: "Confirmation date is required." });
//     }

//     if (!time) {
//       return res.status(400).json({ message: "Confirmation time is required." });
//     }

//     if (!attendees || attendees <= 0) {
//       return res.status(400).json({ message: "Valid number of attendees is required." });
//     }

//     // Verify user exists
//     const user = await UserModel.findOne({ uid, is_deleted: false });

//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // Handle uploaded PDF files
//     let uploadedDocuments = {};
//     const documentFields = [
//       'baptismal_certificate',
//       'first_communion_certificate',
//       'confirmation_preparation',
//       'sponsor_certificate'
//     ];

//     if (req.files) {
//       // Ensure bucket exists
//       const bucketReady = await ensureBucketExists("bookings");
//       if (!bucketReady) {
//         return res.status(500).json({ 
//           message: "Storage bucket not available. Please contact administrator to set up Supabase storage bucket 'bookings'." 
//         });
//       }

//       // Process each uploaded file
//       for (const fieldName of documentFields) {
//         if (req.files[fieldName] && req.files[fieldName][0]) {
//           try {
//             const file = req.files[fieldName][0];
//             const fileName = `${Date.now()}-${file.originalname || `${fieldName}.pdf`}`;
            
//             console.log(`Uploading ${fieldName} to Supabase: ${fileName}`);
            
//             const { data, error } = await supabase.storage
//               .from("bookings")
//               .upload(`confirmation/${fileName}`, file.buffer, { 
//                 contentType: file.mimetype || 'application/pdf',
//                 upsert: false 
//               });
            
//             if (error) {
//               console.error(`Supabase upload error (${fieldName}):`, error);
//               if (error.message?.includes("Bucket not found")) {
//                 return res.status(500).json({ 
//                   message: "Storage bucket 'bookings' not found. Please create it in Supabase dashboard or contact administrator." 
//                 });
//               }
//               return res.status(500).json({ message: `Failed to upload ${fieldName}. Please try again.` });
//             } else {
//               uploadedDocuments[fieldName] = data.path;
//               console.log(`${fieldName} uploaded successfully:`, data.path);
//             }
//           } catch (uploadError) {
//             console.error(`Error uploading ${fieldName}:`, uploadError);
//             return res.status(500).json({ message: `Failed to upload ${fieldName}. Please try again.` });
//           }
//         }
//       }
//     }

//     // Generate transaction ID
//     const transaction_id = generateTransactionId();

//     // Create confirmation booking
//     const confirmationData = {
//       transaction_id,
//       date: new Date(date),
//       time: time.toString(),
//       attendees: parseInt(attendees),
//       contact_number: contact_number || user.contact_number,
//       sponsor_name: sponsor_name || '',
//       baptismal_certificate: uploadedDocuments.baptismal_certificate || req.body.baptismal_certificate || '',
//       first_communion_certificate: uploadedDocuments.first_communion_certificate || req.body.first_communion_certificate || '',
//       confirmation_preparation: uploadedDocuments.confirmation_preparation || req.body.confirmation_preparation || '',
//       sponsor_certificate: uploadedDocuments.sponsor_certificate || req.body.sponsor_certificate || '',
//       status: "pending",
//     };

//     const newConfirmation = new ConfirmationModel(confirmationData);
//     await newConfirmation.save();

//     res.status(201).json({
//       message: "Confirmation booking created successfully.",
//       confirmation: newConfirmation,
//       transaction_id,
//     });

//   } catch (err) {
//     console.error("Error creating confirmation booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all confirmation bookings for a user
//  * POST /api/getUserConfirmations
//  * Body: { uid }
//  */
// async function getUserConfirmations(req, res) {
//   try {
//     const { uid } = req.body;

//     if (!uid) {
//       return res.status(400).json({ message: "User ID (uid) is required." });
//     }

//     // Verify user exists
//     const user = await UserModel.findOne({ uid, is_deleted: false });

//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // Find all confirmation bookings for this user's contact number
//     const confirmations = await ConfirmationModel.find({ contact_number: user.contact_number })
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "Confirmation bookings retrieved successfully.",
//       confirmations,
//       count: confirmations.length,
//     });

//   } catch (err) {
//     console.error("Error getting confirmation bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get a specific confirmation booking by transaction ID
//  * POST /api/getConfirmation
//  * Body: { transaction_id }
//  */
// async function getConfirmation(req, res) {
//   try {
//     const { transaction_id } = req.body;

//     if (!transaction_id) {
//       return res.status(400).json({ message: "Transaction ID is required." });
//     }

//     const confirmation = await ConfirmationModel.findOne({ transaction_id });

//     if (!confirmation) {
//       return res.status(404).json({ message: "Confirmation booking not found." });
//     }

//     res.status(200).json({
//       message: "Confirmation booking retrieved successfully.",
//       confirmation,
//     });

//   } catch (err) {
//     console.error("Error getting confirmation booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Update confirmation booking status
//  * PUT /api/updateConfirmationStatus
//  * Body: { transaction_id, status }
//  */
// async function updateConfirmationStatus(req, res) {
//   try {
//     const { transaction_id, status } = req.body;

//     if (!transaction_id) {
//       return res.status(400).json({ message: "Transaction ID is required." });
//     }

//     if (!status) {
//       return res.status(400).json({ message: "Status is required." });
//     }

//     const validStatuses = ["pending", "confirmed", "cancelled"];
//     if (!validStatuses.includes(status)) {
//       return res.status(400).json({
//         message: `Status must be one of: ${validStatuses.join(", ")}`,
//       });
//     }

//     const confirmation = await ConfirmationModel.findOne({ transaction_id });

//     if (!confirmation) {
//       return res.status(404).json({ message: "Confirmation booking not found." });
//     }

//     confirmation.status = status;
//     await confirmation.save();

//     res.status(200).json({
//       message: "Confirmation booking status updated successfully.",
//       confirmation,
//     });

//   } catch (err) {
//     console.error("Error updating confirmation status:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all confirmation bookings (admin function)
//  * GET /api/getAllConfirmations
//  */
// async function getAllConfirmations(req, res) {
//   try {
//     const confirmations = await ConfirmationModel.find()
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "All confirmation bookings retrieved successfully.",
//       confirmations,
//       count: confirmations.length,
//     });

//   } catch (err) {
//     console.error("Error getting all confirmation bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// module.exports = {
//   createConfirmation,
//   getUserConfirmations,
//   getConfirmation,
//   updateConfirmationStatus,
//   getAllConfirmations,
// };


const ConfirmationModel = require("../models/BookConfirmation");
const UserModel = require("../models/User");
const supabase = require("../config/supabaseClient");

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `CON-${timestamp}-${random}`;
}

/**
 * Helper function to ensure bucket exists
 */
async function ensureBucketExists(bucketName) {
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  if (listError) {
    console.error("Error listing buckets:", listError);
    return false;
  }

  const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
  if (!bucketExists) {
    console.log(`Bucket "${bucketName}" does not exist. Attempting to create...`);
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      fileSizeLimit: 10485760
    });
    if (error) {
      console.error(`Error creating bucket "${bucketName}":`, error);
      return false;
    }
    console.log(`Bucket "${bucketName}" created successfully`);
  }
  return true;
}

/**
 * Create a new confirmation booking
 */
async function createConfirmation(req, res) {
  try {
    const { uid, date, time, attendees, contact_number, sponsor_name } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });
    if (!date) return res.status(400).json({ message: "Confirmation date is required." });
    if (!time) return res.status(400).json({ message: "Confirmation time is required." });
    if (!attendees || attendees <= 0) return res.status(400).json({ message: "Valid number of attendees is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    let uploadedDocuments = {};
    const documentFields = ['baptismal_certificate', 'first_communion_certificate', 'confirmation_preparation', 'sponsor_certificate'];

    if (req.files) {
      const bucketReady = await ensureBucketExists("bookings");
      if (!bucketReady) return res.status(500).json({ message: "Storage bucket not available. Please contact admin." });

      for (const fieldName of documentFields) {
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];
          const fileName = `${Date.now()}-${file.originalname || `${fieldName}.pdf`}`;
          const { data, error } = await supabase.storage.from("bookings").upload(`confirmation/${fileName}`, file.buffer, { contentType: file.mimetype || 'application/pdf', upsert: false });
          if (error) return res.status(500).json({ message: `Failed to upload ${fieldName}.` });
          uploadedDocuments[fieldName] = data.path;
        }
      }
    }

    const transaction_id = generateTransactionId();

    const confirmationData = {
      transaction_id,
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      uid,
      full_name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email || '',
      contact_number: contact_number || user.contact_number,
      sponsor_name: sponsor_name || '',
      baptismal_certificate: uploadedDocuments.baptismal_certificate || req.body.baptismal_certificate || '',
      first_communion_certificate: uploadedDocuments.first_communion_certificate || req.body.first_communion_certificate || '',
      confirmation_preparation: uploadedDocuments.confirmation_preparation || req.body.confirmation_preparation || '',
      sponsor_certificate: uploadedDocuments.sponsor_certificate || req.body.sponsor_certificate || '',
      status: "pending",
    };

    const newConfirmation = new ConfirmationModel(confirmationData);
    await newConfirmation.save();

    res.status(201).json({ message: "Confirmation booking created successfully.", confirmation: newConfirmation, transaction_id });

  } catch (err) {
    console.error("Error creating confirmation booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all confirmation bookings for a user (include uid, name, email)
 */
async function getUserConfirmations(req, res) {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    const confirmations = await ConfirmationModel.find({ contact_number: user.contact_number }).sort({ createdAt: -1 }).lean();
    const confirmationsWithUser = confirmations.map(c => ({
      ...c,
      uid: user.uid,
      name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email,
    }));

    res.status(200).json({ message: "Confirmation bookings retrieved successfully.", confirmations: confirmationsWithUser, count: confirmationsWithUser.length });

  } catch (err) {
    console.error("Error getting confirmation bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get a specific confirmation booking by transaction ID (include uid, name, email)
 */
async function getConfirmation(req, res) {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });

    const confirmation = await ConfirmationModel.findOne({ transaction_id }).lean();
    if (!confirmation) return res.status(404).json({ message: "Confirmation booking not found." });

    const user = await UserModel.findOne({ uid: confirmation.uid, is_deleted: false }).lean();
    const confirmationWithUser = {
      ...confirmation,
      uid: user?.uid,
      name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
      email: user?.email || "N/A",
    };

    res.status(200).json({ message: "Confirmation booking retrieved successfully.", confirmation: confirmationWithUser });

  } catch (err) {
    console.error("Error getting confirmation booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update confirmation booking status
 */
async function updateConfirmationStatus(req, res) {
  try {
    const { transaction_id, status } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });
    if (!status) return res.status(400).json({ message: "Status is required." });

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });

    const confirmation = await ConfirmationModel.findOne({ transaction_id });
    if (!confirmation) return res.status(404).json({ message: "Confirmation booking not found." });

    confirmation.status = status;
    await confirmation.save();

    res.status(200).json({ message: "Confirmation booking status updated successfully.", confirmation });

  } catch (err) {
    console.error("Error updating confirmation status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all confirmation bookings (admin function, include uid, name, email)
 */
async function getAllConfirmations(req, res) {
  try {
    const confirmations = await ConfirmationModel.find().sort({ createdAt: -1 }).lean();

    const userIds = confirmations.map(c => c.uid);
    const users = await UserModel.find({ uid: { $in: userIds }, is_deleted: false }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u; });

    const confirmationsWithUser = confirmations.map(c => {
      const user = userMap[c.uid];
      return {
        ...c,
        uid: user?.uid,
        name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
        email: user?.email || "N/A",
      };
    });

    res.status(200).json({ message: "All confirmation bookings retrieved successfully.", confirmations: confirmationsWithUser, count: confirmationsWithUser.length });

  } catch (err) {
    console.error("Error getting all confirmation bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  ConfirmationModel,
  createConfirmation,
  getUserConfirmations,
  getConfirmation,
  updateConfirmationStatus,
  getAllConfirmations,
};
