const ConfirmationModel = require("../models/BookConfirmation");
const UserModel = require("../models/User");
const AdminModel = require("../models/Admin");
const supabase = require("../config/supabaseClient");
const { notifyUser, notifyAllAdmins } = require("../utils/NotificationHelper");
const EmailService = require("../services/EmailService");

/**
 * Normalize time to HH:MM format
 * Handles ISO strings, Date objects, or already formatted HH:MM strings
 */
function normalizeTime(time) {
  if (!time) return '';
  if (typeof time === 'string' && /^\d{2}:\d{2}$/.test(time)) return time;
  if (typeof time === 'string') {
    const isoMatch = time.match(/T(\d{2}):(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}:${isoMatch[2]}`;
    const timeMatch = time.match(/(\d{2}):(\d{2})/);
    if (timeMatch) return `${timeMatch[1]}:${timeMatch[2]}`;
    const dateObj = new Date(time);
    if (!isNaN(dateObj.getTime())) {
      return `${dateObj.getHours().toString().padStart(2, '0')}:${dateObj.getMinutes().toString().padStart(2, '0')}`;
    }
    return time;
  }
  if (time instanceof Date) {
    return `${time.getHours().toString().padStart(2, '0')}:${time.getMinutes().toString().padStart(2, '0')}`;
  }
  return String(time);
}

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
    const { uid, date, time, attendees, contact_number, sponsor_name, payment_method, amount } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });
    if (!date) return res.status(400).json({ message: "Confirmation date is required." });
    if (!time) return res.status(400).json({ message: "Confirmation time is required." });
    if (!attendees || attendees <= 0) return res.status(400).json({ message: "Valid number of attendees is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    let uploadedDocuments = {};
    const documentFields = ['baptismal_certificate', 'first_communion_certificate', 'confirmation_preparation', 'sponsor_certificate'];
    let proofOfPaymentPath = '';

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

      // Handle proof of payment upload
      if (req.files.proof_of_payment && req.files.proof_of_payment[0]) {
        const file = req.files.proof_of_payment[0];
        const fileName = `${Date.now()}-${file.originalname || 'proof_of_payment.jpg'}`;
        const { data, error } = await supabase.storage.from("bookings").upload(`confirmation/payment/${fileName}`, file.buffer, { 
          contentType: file.mimetype || 'image/jpeg', 
          upsert: false 
        });
        if (error) return res.status(500).json({ message: 'Failed to upload proof of payment.' });
        proofOfPaymentPath = data.path;
      }
    }

    const transaction_id = generateTransactionId();

    const confirmationData = {
      transaction_id,
      date: new Date(date),
      time: normalizeTime(time),
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
      payment_method: payment_method || 'in_person',
      proof_of_payment: proofOfPaymentPath,
      amount: parseFloat(amount) || 0,
    };

    const newConfirmation = new ConfirmationModel(confirmationData);
    await newConfirmation.save();

    // ===== SEND CONFIRMATION EMAIL TO USER =====
    try {
      if (user.email) {
        const userName = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim();
        const emailHtml = EmailService.generateBookingReceivedEmail(
          userName,
          "Confirmation",
          {
            transaction_id,
            date,
            time: normalizeTime(time),
            attendees,
            sponsor_name: sponsor_name || ''
          }
        );

        await EmailService.sendEmail(
          user.email,
          "Confirmation Booking Received - Sagrada Familia Parish",
          emailHtml
        );

        console.log(`Confirmation booking email sent to: ${user.email}`);
      }
    } catch (emailError) {
      console.error("Error sending confirmation booking email:", emailError);
      // Don't fail the request if email sending fails
    }

    // Notify all admins about the new booking
    try {
      const admins = await AdminModel.find({ is_deleted: false }).select("uid");
      const adminIds = admins.map((admin) => admin.uid);
      if (adminIds.length > 0) {
        const userName = `${user.first_name} ${user.middle_name || ''} ${user.last_name}`.trim();
        await notifyAllAdmins(
          adminIds,
          "booking",
          "New Confirmation Booking",
          `${userName} has submitted a new Confirmation booking request.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: newConfirmation._id.toString(),
              transaction_id: transaction_id,
              user_id: uid,
              user_name: userName,
              sacrament_type: "Confirmation",
            },
            priority: "high",
          }
        );
      }
    } catch (notificationError) {
      console.error("Error sending admin notifications for confirmation booking:", notificationError);
      // Don't fail the request if notifications fail
    }

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
    const { transaction_id, status, priest_id, priest_name, admin_comment } = req.body;
    if (!transaction_id) return res.status(400).json({ message: "Transaction ID is required." });
    if (!status) return res.status(400).json({ message: "Status is required." });

    const validStatuses = ["pending", "confirmed", "cancelled"];
    if (!validStatuses.includes(status)) return res.status(400).json({ message: `Status must be one of: ${validStatuses.join(", ")}` });

    const confirmation = await ConfirmationModel.findOne({ transaction_id });
    if (!confirmation) return res.status(404).json({ message: "Confirmation booking not found." });

    confirmation.status = status;
    
    // Assign priest when confirming
    if (status === "confirmed" && priest_id) {
      confirmation.priest_id = priest_id;
      if (priest_name) {
        confirmation.priest_name = priest_name;
      } else if (priest_id) {
        // Fetch priest name if not provided
        const priest = await UserModel.findOne({ uid: priest_id, is_priest: true, is_deleted: false });
        if (priest) {
          confirmation.priest_name = `${priest.first_name} ${priest.middle_name || ''} ${priest.last_name}`.trim();
        }
      }
    }
    
    // Save admin comment if provided
    if (admin_comment !== undefined) {
      confirmation.admin_comment = admin_comment || null;
    }
    
    await confirmation.save();

    // Send notifications when booking status changes
    try {
      const bookingDate = new Date(confirmation.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = confirmation.time || "N/A";

      if (status === "confirmed") {
        // Notify the user
        let userIdToNotify = confirmation.uid;
        
        // If booking was created by admin, find user by email
        if (confirmation.uid === 'admin' && confirmation.email) {
          console.log(`Finding user by email: ${confirmation.email}`);
          const user = await UserModel.findOne({ email: confirmation.email, is_deleted: false });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${confirmation.email}`);
          }
        }
        
        if (userIdToNotify && userIdToNotify !== 'admin') {
          console.log(`Sending notification to user: ${userIdToNotify}`);
          await notifyUser(
            userIdToNotify,
            "booking_status",
            "Confirmation Booking Confirmed",
            `Your Confirmation booking (${confirmation.transaction_id}) has been confirmed. Date: ${bookingDate}, Time: ${bookingTime}${confirmation.priest_name ? `, Priest: ${confirmation.priest_name}` : ""}.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: confirmation.transaction_id,
                booking_type: "Confirmation",
                date: confirmation.date,
                time: confirmation.time,
                status: "confirmed",
              },
              priority: "high",
            }
          );

          // Send email notification for confirmed confirmation booking
          try {
            const userEmail = confirmation.email;
            const userName = `${confirmation.child_first_name || 'Child'} (Parent/Guardian: ${confirmation.parent_name || 'Parent'})`;
            
            if (userEmail) {
              const emailHtml = EmailService.generateBookingApprovalEmail(userName, "Confirmation", {
                transaction_id: confirmation.transaction_id,
                date: confirmation.date,
                time: confirmation.time,
                priest_name: confirmation.priest_name
              });
              
              await EmailService.sendEmail(
                userEmail,
                "Confirmation Booking Approved - Sagrada Familia Parish",
                emailHtml
              );
              console.log(`Confirmation approval email sent to: ${userEmail}`);
            } else {
              console.log("No email address found for confirmation approval notification");
            }
          } catch (emailError) {
            console.error("Error sending confirmation approval email:", emailError);
          }
        } else {
          console.log(`Skipping notification - invalid userId: ${userIdToNotify}`);
        }

        // Notify the priest
        if (priest_id) {
          console.log(`[CONFIRMATION] 📿 Notifying priest: ${priest_id}`);
          try {
            await notifyUser(
              priest_id,
              "booking_status",
              "New Confirmation Assignment",
              `You have been assigned to a Confirmation booking (${confirmation.transaction_id}). Date: ${bookingDate}, Time: ${bookingTime}.`,
              {
                action: "BookingHistoryScreen",
                metadata: {
                  booking_id: confirmation.transaction_id,
                  booking_type: "Confirmation",
                  date: confirmation.date,
                  time: confirmation.time,
                },
                priority: "high",
              }
            );
            console.log(`[CONFIRMATION] ✅ Priest notification sent successfully`);
          } catch (priestNotifyError) {
            console.error(`[CONFIRMATION] ❌ Error notifying priest:`, priestNotifyError);
            console.error(`[CONFIRMATION] Error message:`, priestNotifyError.message);
            console.error(`[CONFIRMATION] Error stack:`, priestNotifyError.stack);
          }
        } else {
          console.log(`[CONFIRMATION] ⚠️ No priest_id provided, skipping priest notification`);
        }
      } else if (status === "cancelled") {
        // Notify the user when booking is rejected
        let userIdToNotify = confirmation.uid;
        
        // If booking was created by admin, find user by email
        if (confirmation.uid === 'admin' && confirmation.email) {
          console.log(`Finding user by email: ${confirmation.email}`);
          const user = await UserModel.findOne({ email: confirmation.email, is_deleted: false });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${confirmation.email}`);
          }
        }
        
        if (userIdToNotify && userIdToNotify !== 'admin') {
          console.log(`Sending cancellation notification to user: ${userIdToNotify}`);
          await notifyUser(
            userIdToNotify,
            "booking_status",
            "Confirmation Booking Rejected",
            `Your Confirmation booking (${confirmation.transaction_id}) has been rejected. Please contact the parish for more information.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: confirmation.transaction_id,
                booking_type: "Confirmation",
                date: confirmation.date,
                time: confirmation.time,
                status: "rejected",
              },
              priority: "high",
            }
          );

          // Send email notification for rejected confirmation booking
          try {
            const userEmail = confirmation.email;
            const userName = `${confirmation.child_first_name || 'Child'} (Parent/Guardian: ${confirmation.parent_name || 'Parent'})`;
            
            if (userEmail) {
              const emailHtml = EmailService.generateBookingRejectionEmail(userName, "Confirmation", {
                transaction_id: confirmation.transaction_id,
                date: confirmation.date,
                time: confirmation.time
              }, confirmation.admin_comment);
              
              await EmailService.sendEmail(
                userEmail,
                "Confirmation Booking Update - Sagrada Familia Parish",
                emailHtml
              );
              console.log(`Confirmation rejection email sent to: ${userEmail}`);
            } else {
              console.log("No email address found for confirmation rejection notification");
            }
          } catch (emailError) {
            console.error("Error sending confirmation rejection email:", emailError);
          }
        } else {
          console.log(`Skipping cancellation notification - invalid userId: ${userIdToNotify}`);
        }
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
      // Don't fail the request if notifications fail
    }

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

/**
 * Update confirmation booking details (admin only)
 */
async function updateConfirmation(req, res) {
  try {
    const { transaction_id, date, time, contact_number, attendees, email, admin_comment } = req.body;
    
    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    const confirmation = await ConfirmationModel.findOne({ transaction_id });
    if (!confirmation) {
      return res.status(404).json({ message: "Confirmation booking not found." });
    }

    // Update fields if provided
    if (date !== undefined) {
      confirmation.date = new Date(date);
    }
    if (time !== undefined) {
      confirmation.time = time;
    }
    if (contact_number !== undefined) {
      confirmation.contact_number = contact_number;
    }
    if (attendees !== undefined) {
      confirmation.attendees = attendees;
    }
    if (email !== undefined) {
      confirmation.email = email;
    }
    if (admin_comment !== undefined) {
      confirmation.admin_comment = admin_comment || null;
    }

    await confirmation.save();

    // Send notifications to user and priest if booking is confirmed
    try {
      const bookingDate = new Date(confirmation.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = confirmation.time || "N/A";

      // Notify the user
      let userIdToNotify = confirmation.uid;
      
      if (confirmation.uid === 'admin' && confirmation.email) {
        const user = await UserModel.findOne({ email: confirmation.email, is_deleted: false });
        if (user && user.uid) {
          userIdToNotify = user.uid;
        }
      }
      
      if (userIdToNotify && userIdToNotify !== 'admin') {
        await notifyUser(
          userIdToNotify,
          "booking_updated",
          "Confirmation Booking Updated",
          `Your confirmation booking (${confirmation.transaction_id}) has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: confirmation.transaction_id,
              booking_type: "Confirmation",
              date: confirmation.date,
              time: confirmation.time,
            },
            priority: "high",
          }
        );
      }

      // Notify the priest if assigned
      if (confirmation.priest_id && confirmation.status === "confirmed") {
        await notifyUser(
          confirmation.priest_id,
          "booking_updated",
          "Confirmation Assignment Updated",
          `A confirmation booking (${confirmation.transaction_id}) you are assigned to has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: confirmation.transaction_id,
              booking_type: "Confirmation",
              date: confirmation.date,
              time: confirmation.time,
            },
            priority: "high",
          }
        );
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
    }

    res.status(200).json({ message: "Confirmation booking updated successfully.", confirmation });

  } catch (err) {
    console.error("Error updating confirmation:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  ConfirmationModel,
  createConfirmation,
  getUserConfirmations,
  getConfirmation,
  updateConfirmationStatus,
  updateConfirmation,
  getAllConfirmations,
};

