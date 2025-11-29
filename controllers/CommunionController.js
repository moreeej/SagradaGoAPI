// // const CommunionModel = require("../models/BookCommunion");

// const CommunionModel = require("../models/BookCommunion");
// const UserModel = require("../models/User");
// const supabase = require("../config/supabaseClient");

// /**
//  * Generate a unique transaction ID
//  */
// function generateTransactionId() {
//   const timestamp = Date.now();
//   const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//   return `COM-${timestamp}-${random}`;
// }

// /**
//  * Create a new communion booking
//  * POST /api/createCommunion
//  * Body: { uid, date, time, attendees }
//  */
// async function createCommunion(req, res) {
//   try {
//     console.log("=== Communion Booking Creation Request ===");
//     console.log("req.body:", req.body);
//     console.log("req.files:", req.files ? JSON.stringify(Object.keys(req.files)) : "No files");

//     const {
//       uid,
//       date,
//       time,
//       attendees,
//     } = req.body;

//     // Validate required fields
//     if (!uid) {
//       return res.status(400).json({ message: "User ID (uid) is required." });
//     }

//     if (!date) {
//       return res.status(400).json({ message: "Communion date is required." });
//     }

//     if (!time) {
//       return res.status(400).json({ message: "Communion time is required." });
//     }

//     if (!attendees || attendees <= 0) {
//       return res.status(400).json({ message: "Valid number of attendees is required." });
//     }

//     // Verify user exists
//     const user = await UserModel.findOne({ uid, is_deleted: false });

//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // Helper function to ensure bucket exists
//     const ensureBucketExists = async (bucketName) => {
//       const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
//       if (listError) {
//         console.error("Error listing buckets:", listError);
//         return false;
//       }
      
//       const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      
//       if (!bucketExists) {
//         console.log(`Bucket "${bucketName}" does not exist. Attempting to create...`);
//         const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
//           public: false,
//           allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
//           fileSizeLimit: 10485760 // 10MB limit
//         });
        
//         if (createError) {
//           console.error(`Error creating bucket "${bucketName}":`, createError);
//           return false;
//         }
        
//         console.log(`Bucket "${bucketName}" created successfully`);
//       }
      
//       return true;
//     };

//     // Handle uploaded PDF files
//     let uploadedDocuments = {};
//     const documentFields = [
//       'baptismal_certificate',
//       'communion_preparation',
//       'parent_consent'
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
//               .upload(`communion/${fileName}`, file.buffer, { 
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

//     // Create communion booking
//     const communionData = {
//       transaction_id,
//       date: new Date(date),
//       time: time.toString(),
//       attendees: parseInt(attendees),
//       uid: uid, // Add uid for user tracking
//       contact_number: user.contact_number,
//       baptismal_certificate: uploadedDocuments.baptismal_certificate || req.body.baptismal_certificate || '',
//       communion_preparation: uploadedDocuments.communion_preparation || req.body.communion_preparation || '',
//       parent_consent: uploadedDocuments.parent_consent || req.body.parent_consent || '',
//       status: "pending",
//     };

//     const newCommunion = new CommunionModel(communionData);
//     await newCommunion.save();

//     res.status(201).json({
//       message: "Communion booking created successfully.",
//       communion: newCommunion,
//       transaction_id,
//     });

//   } catch (err) {
//     console.error("Error creating communion booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all communion bookings for a user
//  * POST /api/getUserCommunions
//  * Body: { uid }
//  */
// async function getUserCommunions(req, res) {
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

//     // Find all communion bookings for this user
//     const communions = await CommunionModel.find({ 
//       $or: [
//         { uid: uid },
//         { contact_number: user.contact_number }
//       ]
//     })
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "Communion bookings retrieved successfully.",
//       communions,
//       count: communions.length,
//     });

//   } catch (err) {
//     console.error("Error getting communion bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get a specific communion booking by transaction ID
//  * POST /api/getCommunion
//  * Body: { transaction_id }
//  */
// async function getCommunion(req, res) {
//   try {
//     const { transaction_id } = req.body;

//     if (!transaction_id) {
//       return res.status(400).json({ message: "Transaction ID is required." });
//     }

//     const communion = await CommunionModel.findOne({ transaction_id });

//     if (!communion) {
//       return res.status(404).json({ message: "Communion booking not found." });
//     }

//     res.status(200).json({
//       message: "Communion booking retrieved successfully.",
//       communion,
//     });

//   } catch (err) {
//     console.error("Error getting communion booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Update communion booking status
//  * PUT /api/updateCommunionStatus
//  * Body: { transaction_id, status }
//  */
// async function updateCommunionStatus(req, res) {
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

//     const communion = await CommunionModel.findOne({ transaction_id });

//     if (!communion) {
//       return res.status(404).json({ message: "Communion booking not found." });
//     }

//     communion.status = status;
//     await communion.save();

//     res.status(200).json({
//       message: "Communion booking status updated successfully.",
//       communion,
//     });

//   } catch (err) {
//     console.error("Error updating communion status:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all communion bookings (admin function)
//  * GET /api/getAllCommunions
//  */
// async function getAllCommunions(req, res) {
//   try {
//     const communions = await CommunionModel.find()
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "All communion bookings retrieved successfully.",
//       communions,
//       count: communions.length,
//     });

//   } catch (err) {
//     console.error("Error getting all communion bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// module.exports = {
//   createCommunion,
//   getUserCommunions,
//   getCommunion,
//   updateCommunionStatus,
//   getAllCommunions,
// };


const CommunionModel = require("../models/BookCommunion");
const UserModel = require("../models/User");
const supabase = require("../config/supabaseClient");

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `COM-${timestamp}-${random}`;
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
 * Create a new communion booking
 * POST /api/createCommunion
 */
async function createCommunion(req, res) {
  try {
    const { uid, date, time, attendees } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });
    if (!date) return res.status(400).json({ message: "Communion date is required." });
    if (!time) return res.status(400).json({ message: "Communion time is required." });
    if (!attendees || attendees <= 0) return res.status(400).json({ message: "Valid number of attendees is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    let uploadedDocuments = {};
    const documentFields = ['baptismal_certificate', 'communion_preparation', 'parent_consent'];

    if (req.files) {
      const bucketReady = await ensureBucketExists("bookings");
      if (!bucketReady) return res.status(500).json({ message: "Storage bucket not available. Please contact admin." });

      for (const fieldName of documentFields) {
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];
          const fileName = `${Date.now()}-${file.originalname || `${fieldName}.pdf`}`;
          const { data, error } = await supabase.storage.from("bookings").upload(`communion/${fileName}`, file.buffer, { contentType: file.mimetype || 'application/pdf', upsert: false });
          if (error) return res.status(500).json({ message: `Failed to upload ${fieldName}.` });
          uploadedDocuments[fieldName] = data.path;
        }
      }
    }

    const transaction_id = generateTransactionId();

    const communionData = {
      transaction_id,
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      uid,
      full_name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email || '',
      contact_number: user.contact_number,
      baptismal_certificate: uploadedDocuments.baptismal_certificate || req.body.baptismal_certificate || '',
      communion_preparation: uploadedDocuments.communion_preparation || req.body.communion_preparation || '',
      parent_consent: uploadedDocuments.parent_consent || req.body.parent_consent || '',
      status: "pending",
    };

    const newCommunion = new CommunionModel(communionData);
    await newCommunion.save();

    res.status(201).json({ message: "Communion booking created successfully.", communion: newCommunion, transaction_id });

  } catch (err) {
    console.error("Error creating communion booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all communion bookings for a user (include uid, name, email)
 * POST /api/getUserCommunions
 */
async function getUserCommunions(req, res) {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    const communions = await CommunionModel.find({ $or: [{ uid }, { contact_number: user.contact_number }] }).sort({ createdAt: -1 }).lean();
    const communionsWithUser = communions.map(c => ({
      ...c,
      uid: user.uid,
      name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email,
    }));

    res.status(200).json({ message: "Communion bookings retrieved successfully.", communions: communionsWithUser, count: communionsWithUser.length });

  } catch (err) {
    console.error("Error getting communion bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get a specific communion booking by transaction ID (include uid, name, email)
 * POST /api/getCommunion
 */
async function getCommunion(req, res) {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });

    const communion = await CommunionModel.findOne({ transaction_id }).lean();
    if (!communion) return res.status(404).json({ message: "Communion booking not found." });

    const user = await UserModel.findOne({ uid: communion.uid, is_deleted: false }).lean();
    const communionWithUser = {
      ...communion,
      uid: user?.uid,
      name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
      email: user?.email || "N/A",
    };

    res.status(200).json({ message: "Communion booking retrieved successfully.", communion: communionWithUser });

  } catch (err) {
    console.error("Error getting communion booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update communion booking status
 * PUT /api/updateCommunionStatus
 */
async function updateCommunionStatus(req, res) {
  try {
    const { transaction_id, status } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });
    if (!status) return res.status(400).json({ message: "Status is required." });

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });

    const communion = await CommunionModel.findOne({ transaction_id });
    if (!communion) return res.status(404).json({ message: "Communion booking not found." });

    communion.status = status;
    await communion.save();

    res.status(200).json({ message: "Communion booking status updated successfully.", communion });

  } catch (err) {
    console.error("Error updating communion status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all communion bookings (admin function, include uid, name, email)
 * GET /api/getAllCommunions
 */
async function getAllCommunions(req, res) {
  try {
    const communions = await CommunionModel.find().sort({ createdAt: -1 }).lean();

    const userIds = communions.map(c => c.uid);
    const users = await UserModel.find({ uid: { $in: userIds }, is_deleted: false }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u; });

    const communionsWithUser = communions.map(c => {
      const user = userMap[c.uid];
      return {
        ...c,
        uid: user?.uid,
        name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
        email: user?.email || "N/A",
      };
    });

    res.status(200).json({ message: "All communion bookings retrieved successfully.", communions: communionsWithUser, count: communionsWithUser.length });

  } catch (err) {
    console.error("Error getting all communion bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  createCommunion,
  getUserCommunions,
  getCommunion,
  updateCommunionStatus,
  getAllCommunions,
};
