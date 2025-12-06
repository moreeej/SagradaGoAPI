// // const WeddingModel = require("../models/BookWedding");

// const WeddingModel = require("../models/BookWedding");
// const UserModel = require("../models/User");
// const supabase = require("../config/supabaseClient");

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
//   if (!fullName || typeof fullName !== 'string') {
//     return { first_name: '', middle_name: '', last_name: '' };
//   }

//   const parts = fullName.trim().split(/\s+/);
  
//   if (parts.length === 1) {
//     return { first_name: parts[0], middle_name: '', last_name: '' };
//   } else if (parts.length === 2) {
//     return { first_name: parts[0], middle_name: '', last_name: parts[1] };
//   } else {
//     const last_name = parts[parts.length - 1];
//     const first_name = parts[0];
//     const middle_name = parts.slice(1, -1).join(' ');
//     return { first_name, middle_name, last_name };
//   }
// }

// /**
//  * Create a new wedding booking
//  * POST /api/createWedding
//  * Body: { uid, date, time, attendees, contact_number, groom_fullname, bride_fullname, 
//  *         marriage_license, marriage_contract, groom_1x1, bride_1x1, 
//  *         groom_baptismal_cert, bride_baptismal_cert, groom_confirmation_cert, 
//  *         bride_confirmation_cert, groom_cenomar, bride_cenomar, 
//  *         groom_banns, bride_banns, groom_permission, bride_permission }
//  */
// async function createWedding(req, res) {
//   try {
//     console.log("=== Wedding Booking Creation Request ===");
//     console.log("req.body:", req.body);
//     console.log("req.files:", req.files ? JSON.stringify(Object.keys(req.files)) : "No files");
    
//     const {
//       uid,
//       date,
//       time,
//       attendees,
//       contact_number,
//       groom_fullname,
//       bride_fullname,
//       marriage_license,
//       marriage_contract,
//       groom_1x1,
//       bride_1x1,
//       groom_baptismal_cert,
//       bride_baptismal_cert,
//       groom_confirmation_cert,
//       bride_confirmation_cert,
//       groom_cenomar,
//       bride_cenomar,
//       groom_banns,
//       bride_banns,
//       groom_permission,
//       bride_permission,
//     } = req.body;

//     // Validate required fields
//     if (!uid) {
//       return res.status(400).json({ message: "User ID (uid) is required." });
//     }

//     if (!date) {
//       return res.status(400).json({ message: "Wedding date is required." });
//     }

//     if (!time) {
//       return res.status(400).json({ message: "Wedding time is required." });
//     }

//     if (!attendees || attendees <= 0) {
//       return res.status(400).json({ message: "Valid number of attendees is required." });
//     }

//     if (!contact_number) {
//       return res.status(400).json({ message: "Contact number is required." });
//     }

//     if (!groom_fullname) {
//       return res.status(400).json({ message: "Groom full name is required." });
//     }

//     if (!bride_fullname) {
//       return res.status(400).json({ message: "Bride full name is required." });
//     }

//     if (!groom_1x1) {
//       return res.status(400).json({ message: "Groom 1x1 photo is required." });
//     }

//     if (!bride_1x1) {
//       return res.status(400).json({ message: "Bride 1x1 photo is required." });
//     }

//     if (!marriage_license && !marriage_contract) {
//       return res.status(400).json({ message: "Marriage license or contract is required." });
//     }

//     if (!groom_baptismal_cert) {
//       return res.status(400).json({ message: "Groom baptismal certificate is required." });
//     }

//     if (!bride_baptismal_cert) {
//       return res.status(400).json({ message: "Bride baptismal certificate is required." });
//     }

//     if (!groom_confirmation_cert) {
//       return res.status(400).json({ message: "Groom confirmation certificate is required." });
//     }

//     if (!bride_confirmation_cert) {
//       return res.status(400).json({ message: "Bride confirmation certificate is required." });
//     }

//     // Verify user exists
//     const user = await UserModel.findOne({ uid, is_deleted: false });

//     if (!user) {
//       return res.status(404).json({ message: "User not found." });
//     }

//     // Parse full names
//     const groomName = parseFullName(groom_fullname);
//     const brideName = parseFullName(bride_fullname);

//     // Helper function to ensure bucket exists (same as donation uploads)
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
//           fileSizeLimit: 10485760 // 10MB limit for PDFs
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
//       'marriage_license', 'marriage_contract', 'groom_baptismal_cert', 'bride_baptismal_cert',
//       'groom_confirmation_cert', 'bride_confirmation_cert', 'groom_cenomar', 'bride_cenomar',
//       'groom_banns', 'bride_banns', 'groom_permission', 'bride_permission',
//       'groom_1x1', 'bride_1x1'
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
//             const folder = fieldName.includes('groom') ? 'wedding/groom' : 
//                           fieldName.includes('bride') ? 'wedding/bride' : 'wedding';
            
//             console.log(`Uploading ${fieldName} to Supabase: ${fileName}`);
            
//             const { data, error } = await supabase.storage
//               .from("bookings")
//               .upload(`${folder}/${fileName}`, file.buffer, { 
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

//     // Use uploaded file paths or fallback to body values
//     const marriage_docu = uploadedDocuments.marriage_license || uploadedDocuments.marriage_contract || marriage_license || marriage_contract;
//     const finalGroom1x1 = uploadedDocuments.groom_1x1 || groom_1x1;
//     const finalBride1x1 = uploadedDocuments.bride_1x1 || bride_1x1;
//     const finalGroomBaptismal = uploadedDocuments.groom_baptismal_cert || groom_baptismal_cert;
//     const finalBrideBaptismal = uploadedDocuments.bride_baptismal_cert || bride_baptismal_cert;
//     const finalGroomConfirmation = uploadedDocuments.groom_confirmation_cert || groom_confirmation_cert;
//     const finalBrideConfirmation = uploadedDocuments.bride_confirmation_cert || bride_confirmation_cert;
//     const finalGroomCenomar = uploadedDocuments.groom_cenomar || groom_cenomar || '';
//     const finalBrideCenomar = uploadedDocuments.bride_cenomar || bride_cenomar || '';
//     const finalGroomPermission = uploadedDocuments.groom_permission || groom_permission || uploadedDocuments.groom_banns || groom_banns || '';
//     const finalBridePermission = uploadedDocuments.bride_permission || bride_permission || uploadedDocuments.bride_banns || bride_banns || '';

//     // Generate transaction ID
//     const transaction_id = generateTransactionId();

//     // Create wedding booking
//     const weddingData = {
//       transaction_id,
//       date: new Date(date),
//       time: time.toString(),
//       attendees: parseInt(attendees),
//       contact_number: contact_number.trim(),
//       groom_first_name: groomName.first_name,
//       groom_middle_name: groomName.middle_name,
//       groom_last_name: groomName.last_name,
//       groom_pic: finalGroom1x1,
//       bride_first_name: brideName.first_name,
//       bride_middle_name: brideName.middle_name,
//       bride_last_name: brideName.last_name,
//       bride_pic: finalBride1x1,
//       marriage_docu,
//       groom_cenomar: finalGroomCenomar,
//       bride_cenomar: finalBrideCenomar,
//       groom_baptismal_cert: finalGroomBaptismal,
//       bride_baptismal_cert: finalBrideBaptismal,
//       groom_confirmation_cert: finalGroomConfirmation,
//       bride_confirmation_cert: finalBrideConfirmation,
//       groom_permission: finalGroomPermission,
//       bride_permission: finalBridePermission,
//       status: "pending",
//     };

//     const newWedding = new WeddingModel(weddingData);
//     await newWedding.save();

//     res.status(201).json({
//       message: "Wedding booking created successfully.",
//       wedding: newWedding,
//       transaction_id,
//     });

//   } catch (err) {
//     console.error("Error creating wedding booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all wedding bookings for a user
//  * POST /api/getUserWeddings
//  * Body: { uid }
//  */
// async function getUserWeddings(req, res) {
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

//     // Get user's contact number to match wedding bookings
//     const contactNumber = user.contact_number;

//     // Find all wedding bookings for this user's contact number
//     const weddings = await WeddingModel.find({ contact_number: contactNumber })
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "Wedding bookings retrieved successfully.",
//       weddings,
//       count: weddings.length,
//     });

//   } catch (err) {
//     console.error("Error getting wedding bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get a specific wedding booking by transaction ID
//  * POST /api/getWedding
//  * Body: { transaction_id }
//  */
// async function getWedding(req, res) {
//   try {
//     const { transaction_id } = req.body;

//     if (!transaction_id) {
//       return res.status(400).json({ message: "Transaction ID is required." });
//     }

//     const wedding = await WeddingModel.findOne({ transaction_id });

//     if (!wedding) {
//       return res.status(404).json({ message: "Wedding booking not found." });
//     }

//     res.status(200).json({
//       message: "Wedding booking retrieved successfully.",
//       wedding,
//     });

//   } catch (err) {
//     console.error("Error getting wedding booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Update wedding booking status
//  * PUT /api/updateWeddingStatus
//  * Body: { transaction_id, status }
//  */
// async function updateWeddingStatus(req, res) {
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

//     const wedding = await WeddingModel.findOne({ transaction_id });

//     if (!wedding) {
//       return res.status(404).json({ message: "Wedding booking not found." });
//     }

//     wedding.status = status;
//     await wedding.save();

//     res.status(200).json({
//       message: "Wedding booking status updated successfully.",
//       wedding,
//     });

//   } catch (err) {
//     console.error("Error updating wedding status:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all wedding bookings (admin function)
//  * GET /api/getAllWeddings
//  */
// async function getAllWeddings(req, res) {
//   try {
//     const weddings = await WeddingModel.find()
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "All wedding bookings retrieved successfully.",
//       weddings,
//       count: weddings.length,
//     });

//   } catch (err) {
//     console.error("Error getting all wedding bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// module.exports = {
//   createWedding,
//   getUserWeddings,
//   getWedding,
//   updateWeddingStatus,
//   getAllWeddings,
// };


const WeddingModel = require("../models/BookWedding");
const UserModel = require("../models/User");
const supabase = require("../config/supabaseClient");

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
 */
function parseFullName(fullName) {
  if (!fullName || typeof fullName !== 'string') return { first_name: '', middle_name: '', last_name: '' };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { first_name: parts[0], middle_name: '', last_name: '' };
  if (parts.length === 2) return { first_name: parts[0], middle_name: '', last_name: parts[1] };
  return { first_name: parts[0], middle_name: parts.slice(1, -1).join(' '), last_name: parts[parts.length - 1] };
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
    const { uid, date, time, attendees, contact_number, groom_fullname, bride_fullname } = req.body;

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
    };

    const newWedding = new WeddingModel(weddingData);
    await newWedding.save();

    res.status(201).json({ message: "Wedding booking created successfully.", wedding: newWedding, transaction_id: weddingData.transaction_id });

  } catch (err) {
    console.error("Error creating wedding booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
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

module.exports = {
  WeddingModel,
  createWedding,
  getUserWeddings,
  getWedding,
  updateWeddingStatus,
  getAllWeddings,
};
