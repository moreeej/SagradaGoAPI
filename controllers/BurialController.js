// const BurialModel = require("../models/BookBurial");
// const UserModel = require("../models/User");
// const supabase = require("../config/supabaseClient");

// /**
//  * Generate a unique transaction ID
//  */
// function generateTransactionId() {
//   const timestamp = Date.now();
//   const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
//   return `BUR-${timestamp}-${random}`;
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
//  * Create a new burial booking
//  * POST /api/createBurial
//  * Body: { uid, date, time, attendees, contact_number, funeral_mass, death_anniversary, funeral_blessing, tomb_blessing }
//  * Files: death_certificate, deceased_baptismal
//  */
// async function createBurial(req, res) {
//   try {
//     console.log("=== Burial Booking Creation Request ===");
//     console.log("req.body:", req.body);
//     console.log("req.files:", req.files ? JSON.stringify(Object.keys(req.files)) : "No files");

//     const {
//       uid,
//       date,
//       time,
//       attendees,
//       contact_number,
//       funeral_mass,
//       death_anniversary,
//       funeral_blessing,
//       tomb_blessing,
//     } = req.body;

//     // Validate required fields
//     if (!uid) {
//       return res.status(400).json({ message: "User ID (uid) is required." });
//     }

//     if (!date) {
//       return res.status(400).json({ message: "Burial date is required." });
//     }

//     if (!time) {
//       return res.status(400).json({ message: "Burial time is required." });
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
//       'death_certificate',
//       'deceased_baptismal'
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
//               .upload(`burial/${fileName}`, file.buffer, { 
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

//     // Create burial booking
//     const burialData = {
//       transaction_id,
//       date: new Date(date),
//       time: time.toString(),
//       attendees: parseInt(attendees),
//       contact_number: contact_number || user.contact_number,
//       funeral_mass: funeral_mass || false,
//       death_anniversary: death_anniversary || false,
//       funeral_blessing: funeral_blessing || false,
//       tomb_blessing: tomb_blessing || false,
//       death_certificate: uploadedDocuments.death_certificate || req.body.death_certificate || '',
//       deceased_baptismal: uploadedDocuments.deceased_baptismal || req.body.deceased_baptismal || '',
//       status: "pending",
//     };

//     const newBurial = new BurialModel(burialData);
//     await newBurial.save();

//     res.status(201).json({
//       message: "Burial booking created successfully.",
//       burial: newBurial,
//       transaction_id,
//     });

//   } catch (err) {
//     console.error("Error creating burial booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all burial bookings for a user
//  * POST /api/getUserBurials
//  * Body: { uid }
//  */
// async function getUserBurials(req, res) {
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

//     // Find all burial bookings for this user's contact number
//     const burials = await BurialModel.find({ contact_number: user.contact_number })
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "Burial bookings retrieved successfully.",
//       burials,
//       count: burials.length,
//     });

//   } catch (err) {
//     console.error("Error getting burial bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get a specific burial booking by transaction ID
//  * POST /api/getBurial
//  * Body: { transaction_id }
//  */
// async function getBurial(req, res) {
//   try {
//     const { transaction_id } = req.body;

//     if (!transaction_id) {
//       return res.status(400).json({ message: "Transaction ID is required." });
//     }

//     const burial = await BurialModel.findOne({ transaction_id });

//     if (!burial) {
//       return res.status(404).json({ message: "Burial booking not found." });
//     }

//     res.status(200).json({
//       message: "Burial booking retrieved successfully.",
//       burial,
//     });

//   } catch (err) {
//     console.error("Error getting burial booking:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Update burial booking status
//  * PUT /api/updateBurialStatus
//  * Body: { transaction_id, status }
//  */
// async function updateBurialStatus(req, res) {
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

//     const burial = await BurialModel.findOne({ transaction_id });

//     if (!burial) {
//       return res.status(404).json({ message: "Burial booking not found." });
//     }

//     burial.status = status;
//     await burial.save();

//     res.status(200).json({
//       message: "Burial booking status updated successfully.",
//       burial,
//     });

//   } catch (err) {
//     console.error("Error updating burial status:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// /**
//  * Get all burial bookings (admin function)
//  * GET /api/getAllBurials
//  */
// async function getAllBurials(req, res) {
//   try {
//     const burials = await BurialModel.find()
//       .sort({ createdAt: -1 });

//     res.status(200).json({
//       message: "All burial bookings retrieved successfully.",
//       burials,
//       count: burials.length,
//     });

//   } catch (err) {
//     console.error("Error getting all burial bookings:", err);
//     res.status(500).json({ message: "Server error. Please try again later." });
//   }
// }

// module.exports = {
//   createBurial,
//   getUserBurials,
//   getBurial,
//   updateBurialStatus,
//   getAllBurials,
// };


const BurialModel = require("../models/BookBurial");
const UserModel = require("../models/User");
const AdminModel = require("../models/Admin");
const supabase = require("../config/supabaseClient");
const { notifyUser, notifyAllAdmins } = require("../utils/NotificationHelper");

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `BUR-${timestamp}-${random}`;
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
 * Create a new burial booking
 * POST /api/createBurial
 */
async function createBurial(req, res) {
  try {
    const {
      uid,
      date,
      time,
      attendees,
      contact_number,
      deceased_name,
      deceased_age,
      deceased_civil_status,
      requested_by,
      relationship_to_deceased,
      address,
      place_of_mass,
      mass_address,
      funeral_mass,
      death_anniversary,
      funeral_blessing,
      tomb_blessing,
    } = req.body;

    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });
    if (!date) return res.status(400).json({ message: "Burial date is required." });
    if (!time) return res.status(400).json({ message: "Burial time is required." });
    if (!attendees || attendees <= 0) return res.status(400).json({ message: "Valid number of attendees is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    let uploadedDocuments = {};
    const documentFields = ['death_certificate', 'deceased_baptismal'];

    if (req.files) {
      const bucketReady = await ensureBucketExists("bookings");
      if (!bucketReady) return res.status(500).json({ message: "Storage bucket not available. Please contact admin." });

      for (const fieldName of documentFields) {
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];
          const fileName = `${Date.now()}-${file.originalname || `${fieldName}.pdf`}`;
          const { data, error } = await supabase.storage.from("bookings").upload(`burial/${fileName}`, file.buffer, { contentType: file.mimetype || 'application/pdf', upsert: false });
          if (error) return res.status(500).json({ message: `Failed to upload ${fieldName}.` });
          uploadedDocuments[fieldName] = data.path;
        }
      }
    }

    const transaction_id = generateTransactionId();

    const burialData = {
      uid,
      full_name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email || '',
      transaction_id,
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      contact_number: contact_number || user.contact_number,
      deceased_name: deceased_name || '',
      deceased_age: deceased_age || '',
      deceased_civil_status: deceased_civil_status || '',
      requested_by: requested_by || '',
      relationship_to_deceased: relationship_to_deceased || '',
      address: address || '',
      place_of_mass: place_of_mass || '',
      mass_address: mass_address || '',
      funeral_mass: funeral_mass || false,
      death_anniversary: death_anniversary || false,
      funeral_blessing: funeral_blessing || false,
      tomb_blessing: tomb_blessing || false,
      death_certificate: uploadedDocuments.death_certificate || req.body.death_certificate || '',
      deceased_baptismal: uploadedDocuments.deceased_baptismal || req.body.deceased_baptismal || '',
      status: "pending",
    };

    const newBurial = new BurialModel(burialData);
    await newBurial.save();

    // Notify all admins about the new booking
    try {
      const admins = await AdminModel.find({ is_deleted: false }).select("uid");
      const adminIds = admins.map((admin) => admin.uid);
      if (adminIds.length > 0) {
        const userName = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim();
        await notifyAllAdmins(
          adminIds,
          "booking",
          "New Burial Booking",
          `${userName} has submitted a new Burial booking request.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: newBurial._id.toString(),
              transaction_id: transaction_id,
              user_id: uid,
              user_name: userName,
              sacrament_type: "Burial",
            },
            priority: "high",
          }
        );
      }
    } catch (notificationError) {
      console.error("Error sending admin notifications for burial booking:", notificationError);
      // Don't fail the request if notifications fail
    }

    res.status(201).json({ message: "Burial booking created successfully.", burial: newBurial, transaction_id });

  } catch (err) {
    console.error("Error creating burial booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all burial bookings for a user (include uid, name, email)
 * POST /api/getUserBurials
 */
async function getUserBurials(req, res) {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    const burials = await BurialModel.find({ uid }).sort({ createdAt: -1 }).lean();

    const burialsWithUser = burials.map(b => ({
      ...b,
      uid: user.uid,
      name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email,
    }));

    res.status(200).json({ message: "Burial bookings retrieved successfully.", burials: burialsWithUser, count: burialsWithUser.length });

  } catch (err) {
    console.error("Error getting burial bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get a specific burial booking by transaction ID (include uid, name, email)
 * POST /api/getBurial
 */
async function getBurial(req, res) {
  try {
    const { transaction_id } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });

    const burial = await BurialModel.findOne({ transaction_id }).lean();
    if (!burial) return res.status(404).json({ message: "Burial booking not found." });

    const user = await UserModel.findOne({ uid: burial.uid, is_deleted: false }).lean();
    const burialWithUser = {
      ...burial,
      uid: user?.uid,
      name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
      email: user?.email || "N/A",
    };

    res.status(200).json({ message: "Burial booking retrieved successfully.", burial: burialWithUser });

  } catch (err) {
    console.error("Error getting burial booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update burial booking status
 * PUT /api/updateBurialStatus
 */
async function updateBurialStatus(req, res) {
  try {
    const { transaction_id, status, priest_id, priest_name, admin_comment } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });
    if (!status) return res.status(400).json({ message: "Status is required." });

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });

    const burial = await BurialModel.findOne({ transaction_id });
    if (!burial) return res.status(404).json({ message: "Burial booking not found." });

    burial.status = status;
    
    // Assign priest when confirming
    if (status === "confirmed" && priest_id) {
      burial.priest_id = priest_id;
      if (priest_name) {
        burial.priest_name = priest_name;
      } else if (priest_id) {
        // Fetch priest name if not provided
        const priest = await UserModel.findOne({ uid: priest_id, is_priest: true, is_deleted: false });
        if (priest) {
          burial.priest_name = `${priest.first_name} ${priest.middle_name || ''} ${priest.last_name}`.trim();
        }
      }
    }
    
    // Save admin comment if provided
    if (admin_comment !== undefined) {
      burial.admin_comment = admin_comment || null;
    }
    
    await burial.save();

    // Send notifications when booking status changes
    try {
      const bookingDate = new Date(burial.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = burial.time || "N/A";

      if (status === "confirmed") {
        // Notify the user
        let userIdToNotify = burial.uid;
        
        // If booking was created by admin, find user by email
        if (burial.uid === 'admin' && burial.email) {
          console.log(`Finding user by email: ${burial.email}`);
          const user = await UserModel.findOne({ email: burial.email, is_deleted: false });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${burial.email}`);
          }
        }
        
        if (userIdToNotify && userIdToNotify !== 'admin') {
          console.log(`[BURIAL] Sending notification to user: ${userIdToNotify}`);
          try {
            await notifyUser(
              userIdToNotify,
              "booking_status",
              "Burial Booking Confirmed",
              `Your burial booking (${burial.transaction_id}) has been confirmed. Date: ${bookingDate}, Time: ${bookingTime}${burial.priest_name ? `, Priest: ${burial.priest_name}` : ""}.`,
              {
                action: "BookingHistoryScreen",
                metadata: {
                  booking_id: burial.transaction_id,
                  booking_type: "Burial",
                  date: burial.date,
                  time: burial.time,
                  status: "confirmed",
                },
                priority: "high",
              }
            );
            console.log(`[BURIAL] ✅ notifyUser call completed for user: ${userIdToNotify}`);
          } catch (notifyError) {
            console.error(`[BURIAL] ❌ Error calling notifyUser:`, notifyError);
            console.error(`[BURIAL] Error message:`, notifyError.message);
            console.error(`[BURIAL] Error stack:`, notifyError.stack);
          }
        } else {
          console.log(`[BURIAL] Skipping notification - invalid userId: ${userIdToNotify}`);
        }

        // Notify the priest
        if (priest_id) {
          console.log(`[BURIAL] 📿 Notifying priest: ${priest_id}`);
          try {
            await notifyUser(
              priest_id,
              "booking_status",
              "New Burial Assignment",
              `You have been assigned to a burial booking (${burial.transaction_id}). Date: ${bookingDate}, Time: ${bookingTime}.`,
              {
                action: "BookingHistoryScreen",
                metadata: {
                  booking_id: burial.transaction_id,
                  booking_type: "Burial",
                  date: burial.date,
                  time: burial.time,
                },
                priority: "high",
              }
            );
            console.log(`[BURIAL] ✅ Priest notification sent successfully`);
          } catch (priestNotifyError) {
            console.error(`[BURIAL] ❌ Error notifying priest:`, priestNotifyError);
            console.error(`[BURIAL] Error message:`, priestNotifyError.message);
            console.error(`[BURIAL] Error stack:`, priestNotifyError.stack);
          }
        } else {
          console.log(`[BURIAL] ⚠️ No priest_id provided, skipping priest notification`);
        }
      } else if (status === "cancelled") {
        // Notify the user when booking is rejected
        let userIdToNotify = burial.uid;
        
        // If booking was created by admin, find user by email
        if (burial.uid === 'admin' && burial.email) {
          console.log(`Finding user by email: ${burial.email}`);
          const user = await UserModel.findOne({ email: burial.email, is_deleted: false });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${burial.email}`);
          }
        }
        
        if (userIdToNotify && userIdToNotify !== 'admin') {
          console.log(`Sending cancellation notification to user: ${userIdToNotify}`);
          await notifyUser(
            userIdToNotify,
            "booking_status",
            "Burial Booking Rejected",
            `Your burial booking (${burial.transaction_id}) has been rejected. Please contact the parish for more information.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: burial.transaction_id,
                booking_type: "Burial",
                date: burial.date,
                time: burial.time,
                status: "rejected",
              },
              priority: "high",
            }
          );
        } else {
          console.log(`Skipping cancellation notification - invalid userId: ${userIdToNotify}`);
        }
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
      // Don't fail the request if notifications fail
    }

    res.status(200).json({ message: "Burial booking status updated successfully.", burial });

  } catch (err) {
    console.error("Error updating burial status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all burial bookings (admin function, include uid, name, email)
 * GET /api/getAllBurials
 */
async function getAllBurials(req, res) {
  try {
    const burials = await BurialModel.find().sort({ createdAt: -1 }).lean();

    const userIds = burials.map(b => b.uid);
    const users = await UserModel.find({ uid: { $in: userIds }, is_deleted: false }).lean();
    const userMap = {};
    users.forEach(u => { userMap[u.uid] = u; });

    const burialsWithUser = burials.map(b => {
      const user = userMap[b.uid];
      return {
        ...b,
        uid: user?.uid,
        name: user ? `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim() : "N/A",
        email: user?.email || "N/A",
      };
    });

    res.status(200).json({ message: "All burial bookings retrieved successfully.", burials: burialsWithUser, count: burialsWithUser.length });

  } catch (err) {
    console.error("Error getting all burial bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update burial booking details (admin only)
 */
async function updateBurial(req, res) {
  try {
    const { transaction_id, date, time, contact_number, attendees, email, admin_comment } = req.body;
    
    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    const burial = await BurialModel.findOne({ transaction_id });
    if (!burial) {
      return res.status(404).json({ message: "Burial booking not found." });
    }

    // Update fields if provided
    if (date !== undefined) {
      burial.date = new Date(date);
    }
    if (time !== undefined) {
      burial.time = time;
    }
    if (contact_number !== undefined) {
      burial.contact_number = contact_number;
    }
    if (attendees !== undefined) {
      burial.attendees = attendees;
    }
    if (email !== undefined) {
      burial.email = email;
    }
    if (admin_comment !== undefined) {
      burial.admin_comment = admin_comment || null;
    }

    await burial.save();

    // Send notifications to user and priest if booking is confirmed
    try {
      const bookingDate = new Date(burial.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = burial.time || "N/A";

      // Notify the user
      let userIdToNotify = burial.uid;
      
      if (burial.uid === 'admin' && burial.email) {
        const user = await UserModel.findOne({ email: burial.email, is_deleted: false });
        if (user && user.uid) {
          userIdToNotify = user.uid;
        }
      }
      
      if (userIdToNotify && userIdToNotify !== 'admin') {
        await notifyUser(
          userIdToNotify,
          "booking_updated",
          "Burial Booking Updated",
          `Your burial booking (${burial.transaction_id}) has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: burial.transaction_id,
              booking_type: "Burial",
              date: burial.date,
              time: burial.time,
            },
            priority: "high",
          }
        );
      }

      // Notify the priest if assigned
      if (burial.priest_id && burial.status === "confirmed") {
        await notifyUser(
          burial.priest_id,
          "booking_updated",
          "Burial Assignment Updated",
          `A burial booking (${burial.transaction_id}) you are assigned to has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: burial.transaction_id,
              booking_type: "Burial",
              date: burial.date,
              time: burial.time,
            },
            priority: "high",
          }
        );
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
    }

    res.status(200).json({ message: "Burial booking updated successfully.", burial });

  } catch (err) {
    console.error("Error updating burial:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  BurialModel,
  createBurial,
  getUserBurials,
  getBurial,
  updateBurialStatus,
  updateBurial,
  getAllBurials,
};

