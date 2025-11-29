// const BaptismModel = require("../models/BookBaptism");
// const UserModel = require("../models/User");
// const supabase = require("../config/supabaseClient");

// /**
//  * Generate a unique transaction ID
//  */
// function generateTransactionId() {
//   const timestamp = Date.now();
//   const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//   return `BAP-${timestamp}-${random}`;
// }

// /**
//  * Helper function to ensure bucket exists (shared across all booking controllers)
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
//  * Create a new baptism booking
//  * POST /api/createBaptism
//  * Body: { uid, date, time, attendees, contact_number, ... }
//  * Files: birth_certificate, parents_marriage_certificate, godparent_confirmation, baptismal_seminar
//  */
// async function createBaptism(req, res) {
//   try {
//     console.log("=== Baptism Booking Creation Request ===");
//     console.log("req.body:", req.body);
//     console.log("req.files:", req.files ? JSON.stringify(Object.keys(req.files)) : "No files");

//     const {
//       uid,
//       date,
//       time,
//       attendees,
//       contact_number,
//       main_godfather,
//       main_godmother,
//       additional_godparents,
//     } = req.body;

//     // Validate required fields
//     if (!uid) {
//       return res.status(400).json({ message: "User ID (uid) is required." });
//     }

//     if (!date) {
//       return res.status(400).json({ message: "Baptism date is required." });
//     }

//     if (!time) {
//       return res.status(400).json({ message: "Baptism time is required." });
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
//       'birth_certificate',
//       'parents_marriage_certificate',
//       'godparent_confirmation',
//       'baptismal_seminar'
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
//               .upload(`baptism/${fileName}`, file.buffer, { 
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

//     // Parse godparent data
//     let godfatherData = {};
//     let godmotherData = {};
//     let additionalGodparents = [];

//     try {
//       if (main_godfather) {
//         godfatherData = typeof main_godfather === 'string' ? JSON.parse(main_godfather) : main_godfather;
//       }
//       if (main_godmother) {
//         godmotherData = typeof main_godmother === 'string' ? JSON.parse(main_godmother) : main_godmother;
//       }
//       if (additional_godparents) {
//         additionalGodparents = typeof additional_godparents === 'string' ? JSON.parse(additional_godparents) : additional_godparents;
//       }
//     } catch (parseError) {
//       console.error("Error parsing godparent data:", parseError);
//     }

//     // Create baptism booking
//     const baptismData = {
//       uid,
//       full_name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
//       email: user.email || '',
//       transaction_id,
//       date: new Date(date),
//       time: time.toString(),
//       attendees: parseInt(attendees),
//       contact_number: contact_number || user.contact_number,
//       main_godfather: godfatherData,
//       main_godmother: godmotherData,
//       additional_godparents: additionalGodparents || [],
//       birth_certificate: uploadedDocuments.birth_certificate || req.body.birth_certificate || '',
//       parents_marriage_certificate: uploadedDocuments.parents_marriage_certificate || req.body.parents_marriage_certificate || '',
//       godparent_confirmation: uploadedDocuments.godparent_confirmation || req.body.godparent_confirmation || '',
//       baptismal_seminar: uploadedDocuments.baptismal_seminar || req.body.baptismal_seminar || '',
//       status: "pending",
//     };

//     const newBaptism = new BaptismModel(baptismData);
//     await newBaptism.save();

//     res.status(201).json({
//       message: "Baptism booking created successfully.",
//       baptism: newBaptism,
//       transaction_id,
//     });

//   } catch (err) {
//     console.error("Error creating baptism booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all baptism bookings for a user
//  * POST /api/getUserBaptisms
//  * Body: { uid }
//  */
// async function getUserBaptisms(req, res) {
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

//     // Find all baptism bookings for this user's contact number
//     const baptisms = await BaptismModel.find({ contact_number: user.contact_number })
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "Baptism bookings retrieved successfully.",
//       baptisms,
//       count: baptisms.length,
//     });

//   } catch (err) {
//     console.error("Error getting baptism bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get a specific baptism booking by transaction ID
//  * POST /api/getBaptism
//  * Body: { transaction_id }
//  */
// async function getBaptism(req, res) {
//   try {
//     const { transaction_id } = req.body;

//     if (!transaction_id) {
//       return res.status(400).json({ message: "Transaction ID is required." });
//     }

//     const baptism = await BaptismModel.findOne({ transaction_id });

//     if (!baptism) {
//       return res.status(404).json({ message: "Baptism booking not found." });
//     }

//     res.status(200).json({
//       message: "Baptism booking retrieved successfully.",
//       baptism,
//     });

//   } catch (err) {
//     console.error("Error getting baptism booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Update baptism booking status
//  * PUT /api/updateBaptismStatus
//  * Body: { transaction_id, status }
//  */
// async function updateBaptismStatus(req, res) {
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

//     const baptism = await BaptismModel.findOne({ transaction_id });

//     if (!baptism) {
//       return res.status(404).json({ message: "Baptism booking not found." });
//     }

//     baptism.status = status;
//     await baptism.save();

//     res.status(200).json({
//       message: "Baptism booking status updated successfully.",
//       baptism,
//     });

//   } catch (err) {
//     console.error("Error updating baptism status:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all baptism bookings (admin function)
//  * GET /api/getAllBaptisms
//  */
// async function getAllBaptisms(req, res) {
//   try {
//     const baptisms = await BaptismModel.find()
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "All baptism bookings retrieved successfully.",
//       baptisms,
//       count: baptisms.length,
//     });

//   } catch (err) {
//     console.error("Error getting all baptism bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// module.exports = {
//   createBaptism,
//   getUserBaptisms,
//   getBaptism,
//   updateBaptismStatus,
//   getAllBaptisms,
// };

const BaptismModel = require("../models/BookBaptism");
const UserModel = require("../models/User");
const supabase = require("../config/supabaseClient");

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BAP-${timestamp}-${random}`;
}

/**
 * Helper function to ensure bucket exists (shared across all booking controllers)
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
    const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
      fileSizeLimit: 10485760 // 10MB limit
    });
    
    if (createError) {
      console.error(`Error creating bucket "${bucketName}":`, createError);
      return false;
    }
    
    console.log(`Bucket "${bucketName}" created successfully`);
  }
  
  return true;
}

/**
 * Create a new baptism booking
 * POST /api/createBaptism
 */
async function createBaptism(req, res) {
  try {
    const { uid, date, time, attendees, contact_number, main_godfather, main_godmother, additional_godparents } = req.body;

    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });
    if (!date) return res.status(400).json({ message: "Baptism date is required." });
    if (!time) return res.status(400).json({ message: "Baptism time is required." });
    if (!attendees || attendees <= 0) return res.status(400).json({ message: "Valid number of attendees is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Handle uploaded PDF files
    let uploadedDocuments = {};
    const documentFields = ['birth_certificate', 'parents_marriage_certificate', 'godparent_confirmation', 'baptismal_seminar'];

    if (req.files) {
      const bucketReady = await ensureBucketExists("bookings");
      if (!bucketReady) return res.status(500).json({ message: "Storage bucket not available. Please contact admin." });

      for (const fieldName of documentFields) {
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];
          const fileName = `${Date.now()}-${file.originalname || `${fieldName}.pdf`}`;
          const { data, error } = await supabase.storage.from("bookings").upload(`baptism/${fileName}`, file.buffer, { contentType: file.mimetype || 'application/pdf', upsert: false });
          if (error) return res.status(500).json({ message: `Failed to upload ${fieldName}.` });
          uploadedDocuments[fieldName] = data.path;
        }
      }
    }

    const transaction_id = generateTransactionId();

    let godfatherData = {}, godmotherData = {}, additionalGodparentsArr = [];
    try {
      if (main_godfather) godfatherData = typeof main_godfather === 'string' ? JSON.parse(main_godfather) : main_godfather;
      if (main_godmother) godmotherData = typeof main_godmother === 'string' ? JSON.parse(main_godmother) : main_godmother;
      if (additional_godparents) additionalGodparentsArr = typeof additional_godparents === 'string' ? JSON.parse(additional_godparents) : additional_godparents;
    } catch (parseError) { console.error("Error parsing godparent data:", parseError); }

    const baptismData = {
      uid,
      full_name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email || '',
      transaction_id,
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      contact_number: contact_number || user.contact_number,
      main_godfather: godfatherData,
      main_godmother: godmotherData,
      additional_godparents: additionalGodparentsArr || [],
      birth_certificate: uploadedDocuments.birth_certificate || req.body.birth_certificate || '',
      parents_marriage_certificate: uploadedDocuments.parents_marriage_certificate || req.body.parents_marriage_certificate || '',
      godparent_confirmation: uploadedDocuments.godparent_confirmation || req.body.godparent_confirmation || '',
      baptismal_seminar: uploadedDocuments.baptismal_seminar || req.body.baptismal_seminar || '',
      status: "pending",
    };

    const newBaptism = new BaptismModel(baptismData);
    await newBaptism.save();

    res.status(201).json({ message: "Baptism booking created successfully.", baptism: newBaptism, transaction_id });

  } catch (err) {
    console.error("Error creating baptism booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all baptism bookings for a user (include uid, name, email)
 * POST /api/getUserBaptisms
 */
async function getUserBaptisms(req, res) {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    const baptisms = await BaptismModel.find({ uid }).sort({ createdAt: -1 }).lean();

    const baptismsWithUser = baptisms.map(b => ({
      ...b,
      uid: user.uid,
      name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email,
    }));

    res.status(200).json({ message: "Baptism bookings retrieved successfully.", baptisms: baptismsWithUser, count: baptismsWithUser.length });

  } catch (err) {
    console.error("Error getting baptism bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get a specific baptism booking by transaction ID (include uid, name, email)
 * POST /api/getBaptism
 */
async function getBaptism(req, res) {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });

    const baptism = await BaptismModel.findOne({ transaction_id }).lean();
    if (!baptism) return res.status(404).json({ message: "Baptism booking not found." });

    const user = await UserModel.findOne({ uid: baptism.uid, is_deleted: false }).lean();
    const baptismWithUser = {
      ...baptism,
      uid: user?.uid,
      name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
      email: user?.email || "N/A",
    };

    res.status(200).json({ message: "Baptism booking retrieved successfully.", baptism: baptismWithUser });

  } catch (err) {
    console.error("Error getting baptism booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update baptism booking status
 * PUT /api/updateBaptismStatus
 */
async function updateBaptismStatus(req, res) {
  try {
    const { transaction_id, status } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });
    if (!status) return res.status(400).json({ message: "Status is required." });

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });

    const baptism = await BaptismModel.findOne({ transaction_id });
    if (!baptism) return res.status(404).json({ message: "Baptism booking not found." });

    baptism.status = status;
    await baptism.save();

    res.status(200).json({ message: "Baptism booking status updated successfully.", baptism });

  } catch (err) {
    console.error("Error updating baptism status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all baptism bookings (admin function, include uid, name, email)
 * GET /api/getAllBaptisms
 */
async function getAllBaptisms(req, res) {
  try {
    const baptisms = await BaptismModel.find().sort({ createdAt: -1 }).lean();

    const userIds = baptisms.map(b => b.uid);
    const users = await UserModel.find({ uid: { $in: userIds }, is_deleted: false }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u; });

    const baptismsWithUser = baptisms.map(b => {
      const user = userMap[b.uid];
      return {
        ...b,
        uid: user?.uid,
        name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
        email: user?.email || "N/A",
      };
    });

    res.status(200).json({ message: "All baptism bookings retrieved successfully.", baptisms: baptismsWithUser, count: baptismsWithUser.length });

  } catch (err) {
    console.error("Error getting all baptism bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  createBaptism,
  getUserBaptisms,
  getBaptism,
  updateBaptismStatus,
  getAllBaptisms,
};
