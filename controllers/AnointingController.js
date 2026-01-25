const AnointingModel = require("../models/BookAnointing");
const UserModel = require("../models/User");
const AdminModel = require("../models/Admin");
const supabase = require("../config/supabaseClient");
const { notifyUser, notifyAllAdmins } = require("../utils/NotificationHelper");
const EmailService = require("../services/EmailService");

/**
 * Normalize time to HH:MM format
 * Handles ISO strings, Date objects, or already formatted HH:MM strings
 * Note: For ISO strings, we extract time from the string directly to avoid timezone issues
 */
function normalizeTime(time) {
  if (!time) return '';
  
  // If already in HH:MM format, return as is
  if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) {
    return time;
  }
  
  // If it's a string, try to extract HH:MM directly first
  if (typeof time === 'string') {
    // Check for ISO format (e.g., "2026-01-25T12:30:00.000Z")
    // Extract the time part from the ISO string directly
    const isoMatch = time.match(/T(\d{2}):(\d{2})/);
    if (isoMatch) {
      return `${isoMatch[1]}:${isoMatch[2]}`;
    }
    
    // Try to extract any HH:MM pattern
    const timeMatch = time.match(/(\d{2}):(\d{2})/);
    if (timeMatch) {
      return `${timeMatch[1]}:${timeMatch[2]}`;
    }
    
    // Try to parse as Date if no pattern found
    const dateObj = new Date(time);
    if (!isNaN(dateObj.getTime())) {
      const hours = dateObj.getHours().toString().padStart(2, '0');
      const minutes = dateObj.getMinutes().toString().padStart(2, '0');
      return `${hours}:${minutes}`;
    }
    
    return time; // Return as is if we can't parse it
  }
  
  // If it's a Date object, extract hours and minutes
  if (time instanceof Date) {
    const hours = time.getHours().toString().padStart(2, '0');
    const minutes = time.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
  }
  
  return String(time);
}

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
      payment_method,
      amount,
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
    let proofOfPaymentPath = '';

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

      // Handle proof of payment upload
      if (req.files.proof_of_payment && req.files.proof_of_payment[0]) {
        try {
          const file = req.files.proof_of_payment[0];
          const fileName = `${Date.now()}-${file.originalname || 'proof_of_payment.jpg'}`;
          const { data, error } = await supabase.storage
            .from("bookings")
            .upload(`anointing/payment/${fileName}`, file.buffer, { 
              contentType: file.mimetype || 'image/jpeg',
              upsert: false 
            });
          if (error) {
            console.error('Failed to upload proof of payment:', error);
            return res.status(500).json({ message: 'Failed to upload proof of payment.' });
          }
          proofOfPaymentPath = data.path;
        } catch (uploadError) {
          console.error('Error uploading proof of payment:', uploadError);
          return res.status(500).json({ message: 'Failed to upload proof of payment.' });
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
      time: normalizeTime(time),
      attendees: parseInt(attendees),
      contact_number: contact_number || user.contact_number,
      medical_condition: medical_condition || '',
      medical_certificate: uploadedDocuments.medical_certificate || req.body.medical_certificate || '',
      status: "pending",
      payment_method: payment_method || 'in_person',
      proof_of_payment: proofOfPaymentPath,
      amount: parseFloat(amount) || 0,
    };

    const newAnointing = new AnointingModel(anointingData);
    await newAnointing.save();

    // Notify all admins about the new booking
    try {
      const admins = await AdminModel.find({ is_deleted: false }).select("uid");
      const adminIds = admins.map((admin) => admin.uid);
      if (adminIds.length > 0) {
        const userName = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim();
        await notifyAllAdmins(
          adminIds,
          "booking",
          "New Anointing of the Sick Booking",
          `${userName} has submitted a new Anointing of the Sick booking request.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: newAnointing._id.toString(),
              transaction_id: transaction_id,
              user_id: uid,
              user_name: userName,
              sacrament_type: "Anointing of the Sick",
            },
            priority: "high",
          }
        );
      }
    } catch (notificationError) {
      console.error("Error sending admin notifications for anointing booking:", notificationError);
      // Don't fail the request if notifications fail
    }

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
    const { transaction_id, status, priest_id, priest_name, admin_comment } = req.body;

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
    
    // Save admin comment if provided
    if (admin_comment !== undefined) {
      anointing.admin_comment = admin_comment || null;
    }
    
    await anointing.save();

    // Send notifications when booking status changes
    try {
      const bookingDate = new Date(anointing.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = anointing.time || "N/A";

      if (status === "confirmed") {
        // Notify the user
        let userIdToNotify = anointing.uid;
        
        // If booking was created by admin, find user by email
        if (anointing.uid === 'admin' && anointing.email) {
          console.log(`Finding user by email: ${anointing.email}`);
          const user = await UserModel.findOne({ email: anointing.email, is_deleted: false });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${anointing.email}`);
          }
        }
        
        if (userIdToNotify && userIdToNotify !== 'admin') {
          console.log(`Sending notification to user: ${userIdToNotify}`);
          await notifyUser(
            userIdToNotify,
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
                status: "confirmed",
              },
              priority: "high",
            }
          );

          // Send email notification for confirmed anointing booking
          try {
            const userEmail = anointing.email;
            const userName = `${anointing.patient_first_name || 'Patient'} (Contact: ${anointing.contact_person || 'Family'})`;
            
            if (userEmail) {
              const emailHtml = EmailService.generateBookingApprovalEmail(userName, "Anointing of the Sick", {
                transaction_id: anointing.transaction_id,
                date: anointing.date,
                time: anointing.time,
                priest_name: anointing.priest_name
              });
              
              await EmailService.sendEmail(
                userEmail,
                "Anointing of the Sick Booking Approved - Sagrada Familia Parish",
                emailHtml
              );
              console.log(`Anointing approval email sent to: ${userEmail}`);
            } else {
              console.log("No email address found for anointing approval notification");
            }
          } catch (emailError) {
            console.error("Error sending anointing approval email:", emailError);
          }
        } else {
          console.log(`Skipping notification - invalid userId: ${userIdToNotify}`);
        }

        // Notify the priest
        if (priest_id) {
          console.log(`[ANOINTING] 📿 Notifying priest: ${priest_id}`);
          try {
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
            console.log(`[ANOINTING] ✅ Priest notification sent successfully`);
          } catch (priestNotifyError) {
            console.error(`[ANOINTING] ❌ Error notifying priest:`, priestNotifyError);
            console.error(`[ANOINTING] Error message:`, priestNotifyError.message);
            console.error(`[ANOINTING] Error stack:`, priestNotifyError.stack);
          }
        } else {
          console.log(`[ANOINTING] ⚠️ No priest_id provided, skipping priest notification`);
        }
      } else if (status === "cancelled") {
        // Notify the user when booking is rejected
        let userIdToNotify = anointing.uid;
        
        // If booking was created by admin, find user by email
        if (anointing.uid === 'admin' && anointing.email) {
          console.log(`Finding user by email: ${anointing.email}`);
          const user = await UserModel.findOne({ email: anointing.email, is_deleted: false });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${anointing.email}`);
          }
        }
        
        if (userIdToNotify && userIdToNotify !== 'admin') {
          console.log(`Sending cancellation notification to user: ${userIdToNotify}`);
          await notifyUser(
            userIdToNotify,
            "booking_status",
            "Anointing of the Sick Booking Rejected",
            `Your Anointing of the Sick booking (${anointing.transaction_id}) has been rejected. Please contact the parish for more information.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: anointing.transaction_id,
                booking_type: "Anointing",
                date: anointing.date,
                time: anointing.time,
                status: "rejected",
              },
              priority: "high",
            }
          );

          // Send email notification for rejected anointing booking
          try {
            const userEmail = anointing.email;
            const userName = `${anointing.patient_first_name || 'Patient'} (Contact: ${anointing.contact_person || 'Family'})`;
            
            if (userEmail) {
              const emailHtml = EmailService.generateBookingRejectionEmail(userName, "Anointing of the Sick", {
                transaction_id: anointing.transaction_id,
                date: anointing.date,
                time: anointing.time
              }, anointing.admin_comment);
              
              await EmailService.sendEmail(
                userEmail,
                "Anointing of the Sick Booking Update - Sagrada Familia Parish",
                emailHtml
              );
              console.log(`Anointing rejection email sent to: ${userEmail}`);
            } else {
              console.log("No email address found for anointing rejection notification");
            }
          } catch (emailError) {
            console.error("Error sending anointing rejection email:", emailError);
          }
        } else {
          console.log(`Skipping cancellation notification - invalid userId: ${userIdToNotify}`);
        }
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
      // Don't fail the request if notifications fail
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

/**
 * Update anointing booking details (admin only)
 */
async function updateAnointing(req, res) {
  try {
    const { transaction_id, date, time, contact_number, email, medical_condition, admin_comment } = req.body;
    
    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    const anointing = await AnointingModel.findOne({ transaction_id });
    if (!anointing) {
      return res.status(404).json({ message: "Anointing booking not found." });
    }

    // Update fields if provided
    if (date !== undefined) {
      anointing.date = new Date(date);
    }
    if (time !== undefined) {
      anointing.time = time;
    }
    if (contact_number !== undefined) {
      anointing.contact_number = contact_number;
    }
    if (email !== undefined) {
      anointing.email = email;
    }
    if (medical_condition !== undefined) {
      anointing.medical_condition = medical_condition;
    }
    if (admin_comment !== undefined) {
      anointing.admin_comment = admin_comment || null;
    }

    await anointing.save();

    // Send notifications to user and priest if booking is confirmed
    try {
      const bookingDate = new Date(anointing.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = anointing.time || "N/A";

      // Notify the user
      let userIdToNotify = anointing.uid;
      
      if (anointing.uid === 'admin' && anointing.email) {
        const user = await UserModel.findOne({ email: anointing.email, is_deleted: false });
        if (user && user.uid) {
          userIdToNotify = user.uid;
        }
      }
      
      if (userIdToNotify && userIdToNotify !== 'admin') {
        await notifyUser(
          userIdToNotify,
          "booking_updated",
          "Anointing Booking Updated",
          `Your anointing booking (${anointing.transaction_id}) has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
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

      // Notify the priest if assigned
      if (anointing.priest_id && anointing.status === "confirmed") {
        await notifyUser(
          anointing.priest_id,
          "booking_updated",
          "Anointing Assignment Updated",
          `An anointing booking (${anointing.transaction_id}) you are assigned to has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
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
    }

    res.status(200).json({ message: "Anointing booking updated successfully.", anointing });

  } catch (err) {
    console.error("Error updating anointing:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}



module.exports = {
  AnointingModel,
  createAnointing,
  getUserAnointings,
  getAnointing,
  updateAnointingStatus,
  updateAnointing,
  getAllAnointings,
};
