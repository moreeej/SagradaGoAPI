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
const AdminModel = require("../models/Admin");
const supabase = require("../config/supabaseClient");
const { notifyUser, notifyAllAdmins } = require("../utils/NotificationHelper");

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `BAP-${timestamp}-${random}`;
}

/**
 * Helper function to ensure bucket exists (shared across all booking controllers)
 */
async function ensureBucketExists(bucketName) {
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    console.error("Error listing buckets:", listError);
    return false;
  }

  const bucketExists = buckets?.some((bucket) => bucket.name === bucketName);

  if (!bucketExists) {
    console.log(
      `Bucket "${bucketName}" does not exist. Attempting to create...`
    );
    const { data: createData, error: createError } =
      await supabase.storage.createBucket(bucketName, {
        public: false,
        allowedMimeTypes: [
          "application/pdf",
          "image/jpeg",
          "image/jpg",
          "image/png",
          "image/webp",
        ],
        fileSizeLimit: 10485760, // 10MB limit
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
    const {
      uid,
      date,
      time,
      attendees,
      contact_number,
      main_godfather,
      main_godmother,
      additional_godparents,
      payment_method,
      amount,
    } = req.body;

    if (!uid)
      return res.status(400).json({ message: "User ID (uid) is required." });
    if (!date)
      return res.status(400).json({ message: "Baptism date is required." });
    if (!time)
      return res.status(400).json({ message: "Baptism time is required." });
    if (!attendees || attendees <= 0)
      return res
        .status(400)
        .json({ message: "Valid number of attendees is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Handle uploaded PDF files
    let uploadedDocuments = {};
    const documentFields = [
      "birth_certificate",
      "parents_marriage_certificate",
      "godparent_confirmation",
      "baptismal_seminar",
    ];
    let proofOfPaymentPath = "";

    if (req.files) {
      const bucketReady = await ensureBucketExists("bookings");
      if (!bucketReady)
        return res
          .status(500)
          .json({
            message: "Storage bucket not available. Please contact admin.",
          });

      const fs = require("fs");

      for (const fieldName of documentFields) {
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];

          // Convert multer file to buffer
          let fileBuffer;
          if (file.buffer) {
            fileBuffer = file.buffer;
          } else if (file.path) {
            fileBuffer = fs.readFileSync(file.path);
          } else {
            console.error(`No buffer or path for file ${fieldName}`);
            continue;
          }

          const fileName = `${Date.now()}-${
            file.originalname || `${fieldName}.pdf`
          }`;
          const { data, error } = await supabase.storage
            .from("bookings")
            .upload(`baptism/${fileName}`, fileBuffer, {
              contentType: file.mimetype || "application/pdf",
              upsert: false,
            });

          if (error) {
            console.error(`Failed to upload ${fieldName}:`, error);
            return res
              .status(500)
              .json({ message: `Failed to upload ${fieldName}.` });
          }

          uploadedDocuments[fieldName] = data.path;
        }
      }

      // Handle proof of payment upload
      if (req.files.proof_of_payment && req.files.proof_of_payment[0]) {
        const file = req.files.proof_of_payment[0];
        let fileBuffer;
        if (file.buffer) {
          fileBuffer = file.buffer;
        } else if (file.path) {
          fileBuffer = fs.readFileSync(file.path);
        }
        if (fileBuffer) {
          const fileName = `${Date.now()}-${
            file.originalname || "proof_of_payment.jpg"
          }`;
          const { data, error } = await supabase.storage
            .from("bookings")
            .upload(`baptism/payment/${fileName}`, fileBuffer, {
              contentType: file.mimetype || "image/jpeg",
              upsert: false,
            });
          if (error) {
            console.error("Failed to upload proof of payment:", error);
            return res
              .status(500)
              .json({ message: "Failed to upload proof of payment." });
          }
          proofOfPaymentPath = data.path;
        }
      }
    }

    const transaction_id = generateTransactionId();

    // Helper function to split name into first, middle, last
    function splitName(fullName) {
      if (!fullName || typeof fullName !== "string") {
        return { first_name: "", middle_name: "", last_name: "" };
      }
      const nameParts = fullName.trim().split(/\s+/);
      if (nameParts.length === 1) {
        return { first_name: nameParts[0], middle_name: "", last_name: "" };
      } else if (nameParts.length === 2) {
        return {
          first_name: nameParts[0],
          middle_name: "",
          last_name: nameParts[1],
        };
      } else {
        // Assume last part is last name, first part is first name, rest is middle name
        return {
          first_name: nameParts[0],
          middle_name: nameParts.slice(1, -1).join(" "),
          last_name: nameParts[nameParts.length - 1],
        };
      }
    }

    let godfatherData = {},
      godmotherData = {},
      additionalGodparentsArr = [];
    try {
      if (main_godfather)
        godfatherData =
          typeof main_godfather === "string"
            ? JSON.parse(main_godfather)
            : main_godfather;
      if (main_godmother)
        godmotherData =
          typeof main_godmother === "string"
            ? JSON.parse(main_godmother)
            : main_godmother;
      if (additional_godparents)
        additionalGodparentsArr =
          typeof additional_godparents === "string"
            ? JSON.parse(additional_godparents)
            : additional_godparents;
    } catch (parseError) {
      console.error("Error parsing godparent data:", parseError);
    }

    // Parse godparent names - handle both old format (first_name, last_name) and new format (name)
    const godfatherName = splitName(
      godfatherData.name || godfatherData.first_name || ""
    );
    const godmotherName = splitName(
      godmotherData.name || godmotherData.first_name || ""
    );

    // Use user data as defaults for candidate and parents if not provided
    const userFullNameParts = splitName(
      `${user.first_name} ${user.middle_name || ""} ${user.last_name}`.trim()
    );
    const defaultCandidateName = userFullNameParts;

    const baptismData = {
      uid,
      full_name: `${user.first_name} ${user.middle_name || ""} ${
        user.last_name
      }`.trim(),
      email: user.email || "",
      transaction_id,
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      contact_number: contact_number || user.contact_number,

      // Main godfather - parse from name field if provided, otherwise use first_name/last_name
      main_godfather_first_name:
        godfatherName.first_name || godfatherData.first_name || "TBD",
      main_godfather_last_name:
        godfatherName.last_name || godfatherData.last_name || "TBD",
      main_godfather_middle_name:
        godfatherName.middle_name || godfatherData.middle_name || "",

      // Main godmother - parse from name field if provided, otherwise use first_name/last_name
      main_godmother_first_name:
        godmotherName.first_name || godmotherData.first_name || "TBD",
      main_godmother_last_name:
        godmotherName.last_name || godmotherData.last_name || "TBD",
      main_godmother_middle_name:
        godmotherName.middle_name || godmotherData.middle_name || "",

      // Candidate - use user data as default if not provided
      candidate_first_name:
        req.body.candidate_first_name ||
        defaultCandidateName.first_name ||
        user.first_name ||
        "TBD",
      candidate_last_name:
        req.body.candidate_last_name ||
        defaultCandidateName.last_name ||
        user.last_name ||
        "TBD",
      candidate_middle_name:
        req.body.candidate_middle_name ||
        defaultCandidateName.middle_name ||
        user.middle_name ||
        "",
      candidate_birthday: req.body.candidate_birthday
        ? new Date(req.body.candidate_birthday)
        : user.birthday
        ? new Date(user.birthday)
        : new Date(),
      candidate_birth_place: req.body.candidate_birth_place || "TBD",

      // Parents - use defaults if not provided
      father_first_name: req.body.father_first_name || "TBD",
      father_last_name: req.body.father_last_name || "TBD",
      father_birth_place: req.body.father_birth_place || "TBD",
      mother_first_name: req.body.mother_first_name || "TBD",
      mother_last_name: req.body.mother_last_name || "TBD",
      mother_birth_place: req.body.mother_birth_place || "TBD",

      address: req.body.address || "TBD",
      marriage_type: req.body.marriage_type || "TBD",

      additional_godparents: additionalGodparentsArr || [],

      // Documents
      birth_certificate:
        uploadedDocuments.birth_certificate || req.body.birth_certificate || "",
      parents_marriage_certificate:
        uploadedDocuments.parents_marriage_certificate ||
        req.body.parents_marriage_certificate ||
        "",
      godparent_confirmation:
        uploadedDocuments.godparent_confirmation ||
        req.body.godparent_confirmation ||
        "",
      baptismal_seminar:
        uploadedDocuments.baptismal_seminar || req.body.baptismal_seminar || "",

      status: "pending",
      payment_method: payment_method || "in_person",
      proof_of_payment: proofOfPaymentPath,
      amount: parseFloat(amount) || 0,
    };

    // Log the data being saved for debugging
    console.log(
      "Baptism data being saved:",
      JSON.stringify(baptismData, null, 2)
    );

    const newBaptism = new BaptismModel(baptismData);

    // Validate before saving
    const validationError = newBaptism.validateSync();
    if (validationError) {
      console.error("Validation error:", validationError);
      return res.status(400).json({
        message: "Validation error",
        errors: Object.keys(validationError.errors).map((key) => ({
          field: key,
          message: validationError.errors[key].message,
        })),
      });
    }

    await newBaptism.save();

    // Notify all admins about the new booking
    try {
      const admins = await AdminModel.find({ is_deleted: false }).select("uid");
      const adminIds = admins.map((admin) => admin.uid);
      if (adminIds.length > 0) {
        const userName = `${user.first_name} ${user.middle_name || ""} ${
          user.last_name
        }`.trim();
        await notifyAllAdmins(
          adminIds,
          "booking",
          "New Baptism Booking",
          `${userName} has submitted a new Baptism booking request.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: newBaptism._id.toString(),
              transaction_id: transaction_id,
              user_id: uid,
              user_name: userName,
              sacrament_type: "Baptism",
            },
            priority: "high",
          }
        );
      }
    } catch (notificationError) {
      console.error(
        "Error sending admin notifications for baptism booking:",
        notificationError
      );
      // Don't fail the request if notifications fail
    }

    res
      .status(201)
      .json({
        message: "Baptism booking created successfully.",
        baptism: newBaptism,
        transaction_id,
      });
  } catch (err) {
    console.error("Error creating baptism booking:", err.message);
    console.error("Error stack:", err.stack);
    if (err.name === "ValidationError") {
      const errors = Object.keys(err.errors).map((key) => ({
        field: key,
        message: err.errors[key].message,
      }));
      return res.status(400).json({
        message: "Validation error",
        errors,
      });
    }
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
    if (!uid)
      return res.status(400).json({ message: "User ID (uid) is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    const baptisms = await BaptismModel.find({ uid })
      .sort({ createdAt: -1 })
      .lean();

    const baptismsWithUser = baptisms.map((b) => ({
      ...b,
      uid: user.uid,
      name: `${user.first_name} ${user.middle_name || ""} ${
        user.last_name
      }`.trim(),
      email: user.email,
    }));

    res
      .status(200)
      .json({
        message: "Baptism bookings retrieved successfully.",
        baptisms: baptismsWithUser,
        count: baptismsWithUser.length,
      });
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
    if (!transaction_id)
      return res.status(400).json({ message: "Transaction ID is required." });

    const baptism = await BaptismModel.findOne({ transaction_id }).lean();
    if (!baptism)
      return res.status(404).json({ message: "Baptism booking not found." });

    const user = await UserModel.findOne({
      uid: baptism.uid,
      is_deleted: false,
    }).lean();
    const baptismWithUser = {
      ...baptism,
      uid: user?.uid,
      name: user
        ? `${user.first_name} ${user.middle_name || ""} ${
            user.last_name
          }`.trim()
        : "N/A",
      email: user?.email || "N/A",
    };

    res
      .status(200)
      .json({
        message: "Baptism booking retrieved successfully.",
        baptism: baptismWithUser,
      });
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
    const { transaction_id, status, priest_id, priest_name, admin_comment } = req.body;
    if (!transaction_id)
      return res.status(400).json({ message: "Transaction ID is required." });
    if (!status)
      return res.status(400).json({ message: "Status is required." });

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status))
      return res
        .status(400)
        .json({
          message: `Status must be one of: ${validStatuses.join(", ")}`,
        });

    const baptism = await BaptismModel.findOne({ transaction_id });
    if (!baptism)
      return res.status(404).json({ message: "Baptism booking not found." });

    baptism.status = status;

    // Assign priest when confirming
    if (status === "confirmed" && priest_id) {
      baptism.priest_id = priest_id;
      if (priest_name) {
        baptism.priest_name = priest_name;
      } else if (priest_id) {
        // Fetch priest name if not provided
        const priest = await UserModel.findOne({
          uid: priest_id,
          is_priest: true,
          is_deleted: false,
        });
        if (priest) {
          baptism.priest_name = `${priest.first_name} ${
            priest.middle_name || ""
          } ${priest.last_name}`.trim();
        }
      }
    }

    // Save admin comment if provided
    if (admin_comment !== undefined) {
      baptism.admin_comment = admin_comment || null;
    }

    await baptism.save();

    // Send notifications when booking status changes
    try {
      const bookingDate = new Date(baptism.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = baptism.time || "N/A";

      if (status === "confirmed") {
        // Notify the user
        let userIdToNotify = baptism.uid;

        // If booking was created by admin, find user by email
        if (baptism.uid === "admin" && baptism.email) {
          console.log(`Finding user by email: ${baptism.email}`);
          const user = await UserModel.findOne({
            email: baptism.email,
            is_deleted: false,
          });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${baptism.email}`);
          }
        }

        if (userIdToNotify && userIdToNotify !== "admin") {
          console.log(`Sending notification to user: ${userIdToNotify}`);
          await notifyUser(
            userIdToNotify,
            "booking_status",
            "Baptism Booking Confirmed",
            `Your baptism booking (${
              baptism.transaction_id
            }) has been confirmed. Date: ${bookingDate}, Time: ${bookingTime}${
              baptism.priest_name ? `, Priest: ${baptism.priest_name}` : ""
            }.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: baptism.transaction_id,
                booking_type: "Baptism",
                date: baptism.date,
                time: baptism.time,
                status: "confirmed",
              },
              priority: "high",
            }
          );
        } else {
          console.log(
            `Skipping notification - invalid userId: ${userIdToNotify}`
          );
        }

        // Notify the priest
        if (priest_id) {
          console.log(`[BAPTISM] 📿 Notifying priest: ${priest_id}`);
          try {
            await notifyUser(
              priest_id,
              "booking_status",
              "New Baptism Assignment",
              `You have been assigned to a baptism booking (${baptism.transaction_id}). Date: ${bookingDate}, Time: ${bookingTime}.`,
              {
                action: "BookingHistoryScreen",
                metadata: {
                  booking_id: baptism.transaction_id,
                  booking_type: "Baptism",
                  date: baptism.date,
                  time: baptism.time,
                },
                priority: "high",
              }
            );
            console.log(`[BAPTISM] ✅ Priest notification sent successfully`);
          } catch (priestNotifyError) {
            console.error(
              `[BAPTISM] ❌ Error notifying priest:`,
              priestNotifyError
            );
            console.error(
              `[BAPTISM] Error message:`,
              priestNotifyError.message
            );
            console.error(`[BAPTISM] Error stack:`, priestNotifyError.stack);
          }
        } else {
          console.log(
            `[BAPTISM] ⚠️ No priest_id provided, skipping priest notification`
          );
        }
      } else if (status === "cancelled") {
        // Notify the user when booking is rejected
        let userIdToNotify = baptism.uid;

        // If booking was created by admin, find user by email
        if (baptism.uid === "admin" && baptism.email) {
          console.log(`Finding user by email: ${baptism.email}`);
          const user = await UserModel.findOne({
            email: baptism.email,
            is_deleted: false,
          });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${baptism.email}`);
          }
        }

        if (userIdToNotify && userIdToNotify !== "admin") {
          console.log(
            `Sending cancellation notification to user: ${userIdToNotify}`
          );
          await notifyUser(
            userIdToNotify,
            "booking_status",
            "Baptism Booking Rejected",
            `Your baptism booking (${baptism.transaction_id}) has been rejected. Please contact the parish for more information.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: baptism.transaction_id,
                booking_type: "Baptism",
                date: baptism.date,
                time: baptism.time,
                status: "rejected",
              },
              priority: "high",
            }
          );
        } else {
          console.log(
            `Skipping cancellation notification - invalid userId: ${userIdToNotify}`
          );
        }
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
      // Don't fail the request if notifications fail
    }

    res
      .status(200)
      .json({
        message: "Baptism booking status updated successfully.",
        baptism,
      });
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

    const userIds = baptisms.map((b) => b.uid);
    const users = await UserModel.find({
      uid: { $in: userIds },
      is_deleted: false,
    }).lean();
    const userMap = {};
    users.forEach((u) => {
      userMap[u.uid] = u;
    });

    const baptismsWithUser = baptisms.map((b) => {
      const user = userMap[b.uid];
      return {
        ...b,
        uid: user?.uid,
        name: user
          ? `${user.first_name} ${user.middle_name || ""} ${
              user.last_name
            }`.trim()
          : "N/A",
        email: user?.email || "N/A",
      };
    });

    res
      .status(200)
      .json({
        message: "All baptism bookings retrieved successfully.",
        baptisms: baptismsWithUser,
        count: baptismsWithUser.length,
      });
  } catch (err) {
    console.error("Error getting all baptism bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function AddBaptismalWeb(req, res) {
  try {
    const {
      uid,
      transaction_id,
      fullname,
      email,
      date,
      time,
      candidate_first_name,
      candidate_last_name,
      candidate_middle_name,
      candidate_birth_place,
      candidate_birthday,
      attendees,
      contact_number,
      address,
      mother_last_name,
      mother_first_name,
      mother_middle_name,
      mother_birth_place,
      father_last_name,
      father_first_name,
      father_middle_name,
      father_birth_place,
      marriage_type,
      main_godfather_last_name,
      main_godfather_first_name,
      main_godfather_middle_name,
      main_godmother_last_name,
      main_godmother_first_name,
      main_godmother_middle_name,
      additional_godparents,
      birth_certificate,
      parents_marriage_certificate,
      godparent_confirmation,
      baptismal_seminar,
    } = req.body;
    console.log("fullname", fullname);
    

    // CREATE NEW DOCUMENT
    const newBaptismal = new BaptismModel({
      uid,
      transaction_id,
      fullname,
      email,
      date,
      time,
      attendees,
      contact_number,
      address,
      candidate_first_name,
      candidate_middle_name,
      candidate_last_name,
      candidate_birth_place,
      candidate_birthday,

      mother_first_name,
      mother_middle_name,
      mother_last_name,
      mother_birth_place,

      father_first_name,
      father_middle_name,
      father_last_name,
      father_birth_place,

      marriage_type,

      main_godfather_first_name,
      main_godfather_middle_name,
      main_godfather_last_name,

      main_godmother_first_name,
      main_godmother_middle_name,
      main_godmother_last_name,

      additional_godparents,
      birth_certificate,
      parents_marriage_certificate,
      godparent_confirmation,
      baptismal_seminar,
    });

    // SAVE TO DB
    const savedBaptismal = await newBaptismal.save();

    res.status(201).json({
      success: true,
      message: "Baptismal booking created successfully",
      data: savedBaptismal,
    });
  } catch (error) {
    console.error("ADD BAPTISMAL ERROR:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create baptismal booking",
      error: error.message,
    });
  }
}

/**
 * Update baptism booking details (admin only)
 */
async function updateBaptism(req, res) {
  try {
    const { transaction_id, date, time, contact_number, attendees, email, admin_comment } = req.body;
    
    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    const baptism = await BaptismModel.findOne({ transaction_id });
    if (!baptism) {
      return res.status(404).json({ message: "Baptism booking not found." });
    }

    // Update fields if provided
    if (date !== undefined) {
      baptism.date = new Date(date);
    }
    if (time !== undefined) {
      baptism.time = time;
    }
    if (contact_number !== undefined) {
      baptism.contact_number = contact_number;
    }
    if (attendees !== undefined) {
      baptism.attendees = attendees;
    }
    if (email !== undefined) {
      baptism.email = email;
    }
    if (admin_comment !== undefined) {
      baptism.admin_comment = admin_comment || null;
    }

    await baptism.save();

    // Send notifications to user and priest if booking is confirmed
    try {
      const bookingDate = new Date(baptism.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = baptism.time || "N/A";

      // Notify the user
      let userIdToNotify = baptism.uid;
      
      if (baptism.uid === 'admin' && baptism.email) {
        const user = await UserModel.findOne({ email: baptism.email, is_deleted: false });
        if (user && user.uid) {
          userIdToNotify = user.uid;
        }
      }
      
      if (userIdToNotify && userIdToNotify !== 'admin') {
        await notifyUser(
          userIdToNotify,
          "booking_updated",
          "Baptism Booking Updated",
          `Your baptism booking (${baptism.transaction_id}) has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: baptism.transaction_id,
              booking_type: "Baptism",
              date: baptism.date,
              time: baptism.time,
            },
            priority: "high",
          }
        );
      }

      // Notify the priest if assigned
      if (baptism.priest_id && baptism.status === "confirmed") {
        await notifyUser(
          baptism.priest_id,
          "booking_updated",
          "Baptism Assignment Updated",
          `A baptism booking (${baptism.transaction_id}) you are assigned to has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: baptism.transaction_id,
              booking_type: "Baptism",
              date: baptism.date,
              time: baptism.time,
            },
            priority: "high",
          }
        );
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
    }

    res.status(200).json({ message: "Baptism booking updated successfully.", baptism });

  } catch (err) {
    console.error("Error updating baptism:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  BaptismModel,
  createBaptism,
  getUserBaptisms,
  getBaptism,
  updateBaptismStatus,
  updateBaptism,
  getAllBaptisms,
  AddBaptismalWeb,
};
