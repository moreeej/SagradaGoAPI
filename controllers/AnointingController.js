const AnointingModel = require("../models/BookAnointing");
const UserModel = require("../models/User");
const supabase = require("../config/supabaseClient");
const { notifyUser } = require("../utils/NotificationHelper");

/**
 * Generate a unique transaction ID
 */
function generateTransactionId() {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `ANO-${timestamp}-${random}`;
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
 * Create a new anointing of the sick booking
 * POST /api/createAnointing
 * Body: { uid, date, time, attendees, contact_number, medical_condition }
 * Files: medical_certificate
 */
async function createAnointing(req, res) {
  try {
    console.log("=== Anointing of the Sick Booking Creation Request ===");
    console.log("req.body:", req.body);
    console.log("req.files:", req.files ? JSON.stringify(Object.keys(req.files)) : "No files");

    const {
      uid,
      date,
      time,
      attendees,
      contact_number,
      medical_condition,
    } = req.body;

    // Validate required fields
    if (!uid) {
      return res.status(400).json({ message: "User ID (uid) is required." });
    }

    if (!date) {
      return res.status(400).json({ message: "Anointing date is required." });
    }

    if (!time) {
      return res.status(400).json({ message: "Anointing time is required." });
    }

    if (!attendees || attendees <= 0) {
      return res.status(400).json({ message: "Valid number of attendees is required." });
    }

    // Verify user exists
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Handle uploaded PDF files
    let uploadedDocuments = {};
    const documentFields = ['medical_certificate'];

    if (req.files) {
      // Ensure bucket exists
      const bucketReady = await ensureBucketExists("bookings");
      if (!bucketReady) {
        return res.status(500).json({ 
          message: "Storage bucket not available. Please contact administrator to set up Supabase storage bucket 'bookings'." 
        });
      }

      // Process each uploaded file
      for (const fieldName of documentFields) {
        if (req.files[fieldName] && req.files[fieldName][0]) {
          try {
            const file = req.files[fieldName][0];
            const fileName = `${Date.now()}-${file.originalname || `${fieldName}.pdf`}`;
            
            console.log(`Uploading ${fieldName} to Supabase: ${fileName}`);
            
            const { data, error } = await supabase.storage
              .from("bookings")
              .upload(`anointing/${fileName}`, file.buffer, { 
                contentType: file.mimetype || 'application/pdf',
                upsert: false 
              });
            
            if (error) {
              console.error(`Supabase upload error (${fieldName}):`, error);
              if (error.message?.includes("Bucket not found")) {
                return res.status(500).json({ 
                  message: "Storage bucket 'bookings' not found. Please create it in Supabase dashboard or contact administrator." 
                });
              }
              return res.status(500).json({ message: `Failed to upload ${fieldName}. Please try again.` });
            } else {
              uploadedDocuments[fieldName] = data.path;
              console.log(`${fieldName} uploaded successfully:`, data.path);
            }
          } catch (uploadError) {
            console.error(`Error uploading ${fieldName}:`, uploadError);
            return res.status(500).json({ message: `Failed to upload ${fieldName}. Please try again.` });
          }
        }
      }
    }

    // Generate transaction ID
    const transaction_id = generateTransactionId();

    // Create anointing booking
    const anointingData = {
      uid,
      full_name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
      email: user.email || '',
      transaction_id,
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      contact_number: contact_number || user.contact_number,
      medical_condition: medical_condition || '',
      medical_certificate: uploadedDocuments.medical_certificate || req.body.medical_certificate || '',
      status: "pending",
    };

    const newAnointing = new AnointingModel(anointingData);
    await newAnointing.save();

    res.status(201).json({
      message: "Anointing of the Sick booking created successfully.",
      anointing: newAnointing,
      transaction_id,
    });

  } catch (err) {
    console.error("Error creating anointing booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all anointing bookings for a user
 * POST /api/getUserAnointings
 * Body: { uid }
 */
async function getUserAnointings(req, res) {
  try {
    const { uid } = req.body;

    if (!uid) {
      return res.status(400).json({ message: "User ID (uid) is required." });
    }

    // Verify user exists
    const user = await UserModel.findOne({ uid, is_deleted: false });

    if (!user) {
      return res.status(404).json({ message: "User not found." });
    }

    // Find all anointing bookings for this user's contact number
    const anointings = await AnointingModel.find({ contact_number: user.contact_number })
      .sort({ createdAt: -1 });

    res.status(200).json({
      message: "Anointing bookings retrieved successfully.",
      anointings,
      count: anointings.length,
    });

  } catch (err) {
    console.error("Error getting anointing bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get a specific anointing booking by transaction ID
 * POST /api/getAnointing
 * Body: { transaction_id }
 */
async function getAnointing(req, res) {
  try {
    const { transaction_id } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    const anointing = await AnointingModel.findOne({ transaction_id });

    if (!anointing) {
      return res.status(404).json({ message: "Anointing booking not found." });
    }

    res.status(200).json({
      message: "Anointing booking retrieved successfully.",
      anointing,
    });

  } catch (err) {
    console.error("Error getting anointing booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update anointing booking status
 * PUT /api/updateAnointingStatus
 * Body: { transaction_id, status }
 */
async function updateAnointingStatus(req, res) {
  try {
    const { transaction_id, status, priest_id, priest_name } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    if (!status) {
      return res.status(400).json({ message: "Status is required." });
    }

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        message: `Status must be one of: ${validStatuses.join(", ")}`,
      });
    }

    const anointing = await AnointingModel.findOne({ transaction_id });

    if (!anointing) {
      return res.status(404).json({ message: "Anointing booking not found." });
    }

    anointing.status = status;
    
    // Assign priest when confirming
    if (status === "confirmed" && priest_id) {
      anointing.priest_id = priest_id;
      if (priest_name) {
        anointing.priest_name = priest_name;
      } else if (priest_id) {
        // Fetch priest name if not provided
        const priest = await UserModel.findOne({ uid: priest_id, is_priest: true, is_deleted: false });
        if (priest) {
          anointing.priest_name = `${priest.first_name} ${priest.middle_name || ''} ${priest.last_name}`.trim();
        }
      }
    }
    
    await anointing.save();

    // Send notifications when booking is confirmed
    if (status === "confirmed") {
      try {
        const bookingDate = new Date(anointing.date).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        });
        const bookingTime = anointing.time || "N/A";

        // Notify the user
        if (anointing.uid) {
          await notifyUser(
            anointing.uid,
            "booking_status",
            "Anointing of the Sick Booking Confirmed",
            `Your Anointing of the Sick booking (${anointing.transaction_id}) has been confirmed. Date: ${bookingDate}, Time: ${bookingTime}${anointing.priest_name ? `, Priest: ${anointing.priest_name}` : ""}.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: anointing.transaction_id,
                booking_type: "Anointing",
                date: anointing.date,
                time: anointing.time,
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
            "New Anointing of the Sick Assignment",
            `You have been assigned to an Anointing of the Sick booking (${anointing.transaction_id}). Date: ${bookingDate}, Time: ${bookingTime}.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: anointing.transaction_id,
                booking_type: "Anointing",
                date: anointing.date,
                time: anointing.time,
              },
              priority: "high",
            }
          );
        }
      } catch (notificationError) {
        console.error("Error sending notifications:", notificationError);
        // Don't fail the request if notifications fail
      }
    }

    res.status(200).json({
      message: "Anointing booking status updated successfully.",
      anointing,
    });

  } catch (err) {
    console.error("Error updating anointing status:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all anointing bookings (admin function) with user info
 * GET /api/getAllAnointings
 */
async function getAllAnointings(req, res) {
  try {
    const anointings = await AnointingModel.find().sort({ createdAt: -1 });

    // Map each booking with user info
    const results = await Promise.all(
      anointings.map(async (booking) => {
        const user = await UserModel.findOne({ uid: booking.uid, is_deleted: false });
        return {
          ...booking.toObject(),
          user: user
            ? {
                uid: user.uid,
                name: `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim(),
                email: user.email,
                contact_number: user.contact_number,
              }
            : null,
        };
      })
    );

    res.status(200).json({
      message: "All anointing bookings retrieved successfully.",
      anointings: results,
      count: results.length,
    });

  } catch (err) {
    console.error("Error getting all anointing bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  AnointingModel,
  createAnointing,
  getUserAnointings,
  getAnointing,
  updateAnointingStatus,
  getAllAnointings,
};
