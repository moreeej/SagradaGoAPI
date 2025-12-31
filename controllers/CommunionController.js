const CommunionModel = require("../models/BookCommunion");
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
  return `COM-${timestamp}-${random}`;
}

/**
 * Helper function to ensure bucket exists
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
    const { data, error } = await supabase.storage.createBucket(bucketName, {
      public: false,
      allowedMimeTypes: [
        "application/pdf",
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
      ],
      fileSizeLimit: 10485760,
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
    const { uid, date, time, attendees, payment_method, amount } = req.body;
    if (!uid)
      return res.status(400).json({ message: "User ID (uid) is required." });
    if (!date)
      return res.status(400).json({ message: "Communion date is required." });
    if (!time)
      return res.status(400).json({ message: "Communion time is required." });
    if (!attendees || attendees <= 0)
      return res
        .status(400)
        .json({ message: "Valid number of attendees is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    let uploadedDocuments = {};
    const documentFields = [
      "baptismal_certificate",
      "communion_preparation",
      "parent_consent",
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

      for (const fieldName of documentFields) {
        if (req.files[fieldName] && req.files[fieldName][0]) {
          const file = req.files[fieldName][0];
          const fileName = `${Date.now()}-${
            file.originalname || `${fieldName}.pdf`
          }`;
          const { data, error } = await supabase.storage
            .from("bookings")
            .upload(`communion/${fileName}`, file.buffer, {
              contentType: file.mimetype || "application/pdf",
              upsert: false,
            });
          if (error)
            return res
              .status(500)
              .json({ message: `Failed to upload ${fieldName}.` });
          uploadedDocuments[fieldName] = data.path;
        }
      }

      // Handle proof of payment upload
      if (req.files.proof_of_payment && req.files.proof_of_payment[0]) {
        const file = req.files.proof_of_payment[0];
        const fileName = `${Date.now()}-${
          file.originalname || "proof_of_payment.jpg"
        }`;
        const { data, error } = await supabase.storage
          .from("bookings")
          .upload(`communion/payment/${fileName}`, file.buffer, {
            contentType: file.mimetype || "image/jpeg",
            upsert: false,
          });
        if (error)
          return res
            .status(500)
            .json({ message: "Failed to upload proof of payment." });
        proofOfPaymentPath = data.path;
      }
    }

    const transaction_id = generateTransactionId();

    const communionData = {
      transaction_id,
      date: new Date(date),
      time: time.toString(),
      attendees: parseInt(attendees),
      uid,
      full_name: `${user.first_name} ${user.middle_name || ""} ${
        user.last_name
      }`.trim(),
      email: user.email || "",
      contact_number: user.contact_number,
      baptismal_certificate:
        uploadedDocuments.baptismal_certificate ||
        req.body.baptismal_certificate ||
        "",
      communion_preparation:
        uploadedDocuments.communion_preparation ||
        req.body.communion_preparation ||
        "",
      parent_consent:
        uploadedDocuments.parent_consent || req.body.parent_consent || "",
      status: "pending",
      payment_method: payment_method || "in_person",
      proof_of_payment: proofOfPaymentPath,
      amount: parseFloat(amount) || 0,
    };

    const newCommunion = new CommunionModel(communionData);
    await newCommunion.save();

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
          "New First Communion Booking",
          `${userName} has submitted a new First Communion booking request.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: newCommunion._id.toString(),
              transaction_id: transaction_id,
              user_id: uid,
              user_name: userName,
              sacrament_type: "First Communion",
            },
            priority: "high",
          }
        );
      }
    } catch (notificationError) {
      console.error(
        "Error sending admin notifications for communion booking:",
        notificationError
      );
      // Don't fail the request if notifications fail
    }

    res
      .status(201)
      .json({
        message: "Communion booking created successfully.",
        communion: newCommunion,
        transaction_id,
      });
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
    if (!uid)
      return res.status(400).json({ message: "User ID (uid) is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    const communions = await CommunionModel.find({
      $or: [{ uid }, { contact_number: user.contact_number }],
    })
      .sort({ createdAt: -1 })
      .lean();
    const communionsWithUser = communions.map((c) => ({
      ...c,
      uid: user.uid,
      name: `${user.first_name} ${user.middle_name || ""} ${
        user.last_name
      }`.trim(),
      email: user.email,
    }));

    res
      .status(200)
      .json({
        message: "Communion bookings retrieved successfully.",
        communions: communionsWithUser,
        count: communionsWithUser.length,
      });
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
    if (!transaction_id)
      return res.status(400).json({ message: "Transaction ID is required." });

    const communion = await CommunionModel.findOne({ transaction_id }).lean();
    if (!communion)
      return res.status(404).json({ message: "Communion booking not found." });

    const user = await UserModel.findOne({
      uid: communion.uid,
      is_deleted: false,
    }).lean();
    const communionWithUser = {
      ...communion,
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
        message: "Communion booking retrieved successfully.",
        communion: communionWithUser,
      });
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
    const { transaction_id, status, priest_id, priest_name, admin_comment } =
      req.body;
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

    const communion = await CommunionModel.findOne({ transaction_id });
    if (!communion)
      return res.status(404).json({ message: "Communion booking not found." });

    communion.status = status;

    // Assign priest when confirming
    if (status === "confirmed" && priest_id) {
      communion.priest_id = priest_id;
      if (priest_name) {
        communion.priest_name = priest_name;
      } else if (priest_id) {
        // Fetch priest name if not provided
        const priest = await UserModel.findOne({
          uid: priest_id,
          is_priest: true,
          is_deleted: false,
        });
        if (priest) {
          communion.priest_name = `${priest.first_name} ${
            priest.middle_name || ""
          } ${priest.last_name}`.trim();
        }
      }
    }

    // Save admin comment if provided
    if (admin_comment !== undefined) {
      communion.admin_comment = admin_comment || null;
    }

    await communion.save();

    // Send notifications when booking status changes
    try {
      const bookingDate = new Date(communion.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = communion.time || "N/A";

      if (status === "confirmed") {
        // Notify the user
        let userIdToNotify = communion.uid;

        // If booking was created by admin, find user by email
        if (communion.uid === "admin" && communion.email) {
          console.log(`Finding user by email: ${communion.email}`);
          const user = await UserModel.findOne({
            email: communion.email,
            is_deleted: false,
          });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${communion.email}`);
          }
        }

        if (userIdToNotify && userIdToNotify !== "admin") {
          console.log(`Sending notification to user: ${userIdToNotify}`);
          await notifyUser(
            userIdToNotify,
            "booking_status",
            "First Communion Booking Confirmed",
            `Your First Communion booking (${
              communion.transaction_id
            }) has been confirmed. Date: ${bookingDate}, Time: ${bookingTime}${
              communion.priest_name ? `, Priest: ${communion.priest_name}` : ""
            }.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: communion.transaction_id,
                booking_type: "Communion",
                date: communion.date,
                time: communion.time,
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
          console.log(`[COMMUNION] 📿 Notifying priest: ${priest_id}`);
          try {
            await notifyUser(
              priest_id,
              "booking_status",
              "New First Communion Assignment",
              `You have been assigned to a First Communion booking (${communion.transaction_id}). Date: ${bookingDate}, Time: ${bookingTime}.`,
              {
                action: "BookingHistoryScreen",
                metadata: {
                  booking_id: communion.transaction_id,
                  booking_type: "Communion",
                  date: communion.date,
                  time: communion.time,
                },
                priority: "high",
              }
            );
            console.log(`[COMMUNION] ✅ Priest notification sent successfully`);
          } catch (priestNotifyError) {
            console.error(
              `[COMMUNION] ❌ Error notifying priest:`,
              priestNotifyError
            );
            console.error(
              `[COMMUNION] Error message:`,
              priestNotifyError.message
            );
            console.error(`[COMMUNION] Error stack:`, priestNotifyError.stack);
          }
        } else {
          console.log(
            `[COMMUNION] ⚠️ No priest_id provided, skipping priest notification`
          );
        }
      } else if (status === "cancelled") {
        // Notify the user when booking is rejected
        let userIdToNotify = communion.uid;

        // If booking was created by admin, find user by email
        if (communion.uid === "admin" && communion.email) {
          console.log(`Finding user by email: ${communion.email}`);
          const user = await UserModel.findOne({
            email: communion.email,
            is_deleted: false,
          });
          if (user && user.uid) {
            userIdToNotify = user.uid;
            console.log(`Found user with uid: ${userIdToNotify}`);
          } else {
            console.log(`No user found with email: ${communion.email}`);
          }
        }

        if (userIdToNotify && userIdToNotify !== "admin") {
          console.log(
            `Sending cancellation notification to user: ${userIdToNotify}`
          );
          await notifyUser(
            userIdToNotify,
            "booking_status",
            "First Communion Booking Rejected",
            `Your First Communion booking (${communion.transaction_id}) has been rejected. Please contact the parish for more information.`,
            {
              action: "BookingHistoryScreen",
              metadata: {
                booking_id: communion.transaction_id,
                booking_type: "Communion",
                date: communion.date,
                time: communion.time,
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
        message: "Communion booking status updated successfully.",
        communion,
      });
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
    const communions = await CommunionModel.find()
      .sort({ createdAt: -1 })
      .lean();

    const userIds = communions.map((c) => c.uid);
    const users = await UserModel.find({
      uid: { $in: userIds },
      is_deleted: false,
    }).lean();
    const userMap = {};
    users.forEach((u) => {
      userMap[u.uid] = u;
    });

    const communionsWithUser = communions.map((c) => {
      const user = userMap[c.uid];
      return {
        ...c,
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
        message: "All communion bookings retrieved successfully.",
        communions: communionsWithUser,
        count: communionsWithUser.length,
      });
  } catch (err) {
    console.error("Error getting all communion bookings:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Update communion booking details (admin only)
 */
async function updateCommunion(req, res) {
  try {
    const {
      transaction_id,
      date,
      time,
      contact_number,
      attendees,
      email,
      admin_comment,
    } = req.body;

    if (!transaction_id) {
      return res.status(400).json({ message: "Transaction ID is required." });
    }

    const communion = await CommunionModel.findOne({ transaction_id });
    if (!communion) {
      return res.status(404).json({ message: "Communion booking not found." });
    }

    // Update fields if provided
    if (date !== undefined) {
      communion.date = new Date(date);
    }
    if (time !== undefined) {
      communion.time = time;
    }
    if (contact_number !== undefined) {
      communion.contact_number = contact_number;
    }
    if (attendees !== undefined) {
      communion.attendees = attendees;
    }
    if (email !== undefined) {
      communion.email = email;
    }
    if (admin_comment !== undefined) {
      communion.admin_comment = admin_comment || null;
    }

    await communion.save();

    // Send notifications to user and priest if booking is confirmed
    try {
      const bookingDate = new Date(communion.date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      const bookingTime = communion.time || "N/A";

      // Notify the user
      let userIdToNotify = communion.uid;

      if (communion.uid === "admin" && communion.email) {
        const user = await UserModel.findOne({
          email: communion.email,
          is_deleted: false,
        });
        if (user && user.uid) {
          userIdToNotify = user.uid;
        }
      }

      if (userIdToNotify && userIdToNotify !== "admin") {
        await notifyUser(
          userIdToNotify,
          "booking_updated",
          "Communion Booking Updated",
          `Your communion booking (${communion.transaction_id}) has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: communion.transaction_id,
              booking_type: "Communion",
              date: communion.date,
              time: communion.time,
            },
            priority: "high",
          }
        );
      }

      // Notify the priest if assigned
      if (communion.priest_id && communion.status === "confirmed") {
        await notifyUser(
          communion.priest_id,
          "booking_updated",
          "Communion Assignment Updated",
          `A communion booking (${communion.transaction_id}) you are assigned to has been updated. New Date: ${bookingDate}, Time: ${bookingTime}.`,
          {
            action: "BookingHistoryScreen",
            metadata: {
              booking_id: communion.transaction_id,
              booking_type: "Communion",
              date: communion.date,
              time: communion.time,
            },
            priority: "high",
          }
        );
      }
    } catch (notificationError) {
      console.error("Error sending notifications:", notificationError);
    }

    res
      .status(200)
      .json({ message: "Communion booking updated successfully.", communion });
  } catch (err) {
    console.error("Error updating communion:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

async function createCommunionWeb(req, res) {
  try {
    const {
      uid,
      transaction_id,
      full_name,
      email,
      date,
      time,
      attendees,
      contact_number,
      baptismal_certificate,
      communion_preparation,
      parent_consent,
    } = req.body;

    const newCommunion = new CommunionModel({
      uid,
      transaction_id,
      full_name,
      email,
      date,
      time,
      attendees,
      contact_number,
      baptismal_certificate,
      communion_preparation,
      parent_consent,
    });

    // SAVE TO DB
    const savedCommunion = await newCommunion.save();

    res.status(201).json({
      success: true,
      message: "Communion booking created successfully",
      data: savedCommunion,
    });
  } catch (err) {
    console.error("Error creating communion booking:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  CommunionModel,
  createCommunion,
  getUserCommunions,
  getCommunion,
  updateCommunionStatus,
  updateCommunion,
  getAllCommunions,
  createCommunionWeb
};
