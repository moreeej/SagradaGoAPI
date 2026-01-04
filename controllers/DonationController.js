const UserModel = require("../models/User");
const DonationModel = require("../models/Donation");
const AdminModel = require("../models/Admin");
const { notifyAllAdmins } = require("../utils/NotificationHelper");
const supabase = require("../config/supabaseClient"); 
const path = require("path");

/**
 * Create a new donation for a user
 * POST /api/createDonation
 * Body: { uid, amount, paymentMethod, intercession (optional) }
 * Files: image (In Kind) or receipt (GCash)
 */

async function createDonation(req, res) {
  try {
    console.log("=== Donation Creation Request ===");
    console.log("req.body:", req.body);
    console.log("req.files:", req.files ? JSON.stringify(Object.keys(req.files)) : "No files");
    
    if (req.files) {
      console.log("Files received:");
      if (req.files["image"]) {
        console.log("- image:", req.files["image"][0]?.originalname, req.files["image"][0]?.mimetype, req.files["image"][0]?.size, "bytes");
      }
      if (req.files["receipt"]) {
        console.log("- receipt:", req.files["receipt"][0]?.originalname, req.files["receipt"][0]?.mimetype, req.files["receipt"][0]?.size, "bytes");
      }
    }
    
    const { uid, amount, paymentMethod, intercession } = req.body;

    // Validate required fields
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });
    if (!paymentMethod) return res.status(400).json({ message: "Payment method is required." });

    // Validate payment method
    const validPaymentMethods = ["GCash", "Cash", "In Kind"];
    if (!validPaymentMethods.includes(paymentMethod)) {
      return res.status(400).json({
        message: `Payment method must be one of: ${validPaymentMethods.join(", ")}`,
      });
    }

    // Validate amount: allow 0 for "In Kind" donations, otherwise require positive amount
    if (paymentMethod === "In Kind") {
      // For "In Kind" donations, amount should be 0
      if (amount === undefined || amount === null || amount === "") {
        return res.status(400).json({ message: "Amount is required." });
      }
      const amountNum = parseFloat(amount);
      if (isNaN(amountNum) || amountNum !== 0) {
        return res.status(400).json({ message: "Amount must be 0 for In Kind donations." });
      }
    } else {
      // For other payment methods, amount must be positive
      if (!amount || parseFloat(amount) <= 0) {
        return res.status(400).json({ message: "Valid donation amount is required." });
      }
    }

    // Find the user
    const user = await UserModel.findOne({ uid, is_deleted: false });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Get user's full name
    const userName = [user.first_name, user.middle_name, user.last_name].filter(Boolean).join(" ").trim();

    // Handle uploaded files (if any)
    let donationImageUrl = null;
    let receiptUrl = null;

    if (req.files) {
      // Helper function to ensure bucket exists
      const ensureBucketExists = async (bucketName) => {
        // Check if bucket exists
        const { data: buckets, error: listError } = await supabase.storage.listBuckets();
        
        if (listError) {
          console.error("Error listing buckets:", listError);
          return false;
        }
        
        const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
        
        if (!bucketExists) {
          console.log(`Bucket "${bucketName}" does not exist. Attempting to create...`);
          // Try to create the bucket
          const { data: createData, error: createError } = await supabase.storage.createBucket(bucketName, {
            public: false, // Set to true if you want public access
            allowedMimeTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
            fileSizeLimit: 5242880 // 5MB limit
          });
          
          if (createError) {
            console.error(`Error creating bucket "${bucketName}":`, createError);
            return false;
          }
          
          console.log(`Bucket "${bucketName}" created successfully`);
        }
        
        return true;
      };

      // In Kind donation image upload
      if (req.files["image"] && req.files["image"][0]) {
        try {
          // Ensure bucket exists (shared helper function also used for GCash receipts)
          const bucketReady = await ensureBucketExists("donations");
          if (!bucketReady) {
            return res.status(500).json({ 
              message: "Storage bucket not available. Please contact administrator to set up Supabase storage bucket 'donations'." 
            });
          }

          const file = req.files["image"][0];
          const fileName = `${Date.now()}-${file.originalname || 'donation-image.jpg'}`;
          console.log(`Uploading donation image to Supabase: ${fileName}`);
          
          // Upload to in-kind/ folder in the donations bucket
          const { data, error } = await supabase.storage
            .from("donations")
            .upload(`in-kind/${fileName}`, file.buffer, { 
              contentType: file.mimetype || 'image/jpeg',
              upsert: false 
            });
          
          if (error) {
            console.error("Supabase upload error (donation image):", error);
            if (error.message?.includes("Bucket not found")) {
              return res.status(500).json({ 
                message: "Storage bucket 'donations' not found. Please create it in Supabase dashboard or contact administrator." 
              });
            }
            return res.status(500).json({ message: "Failed to upload donation image. Please try again." });
          } else {
            donationImageUrl = data.path;
            console.log("Donation image uploaded successfully:", donationImageUrl);
          }
        } catch (uploadError) {
          console.error("Error uploading donation image:", uploadError);
          return res.status(500).json({ message: "Failed to upload donation image. Please try again." });
        }
      }

      // GCash receipt upload - uses same logic as donation image upload
      if (req.files["receipt"] && req.files["receipt"][0]) {
        try {
          // Ensure bucket exists (same helper function as donation image)
          const bucketReady = await ensureBucketExists("donations");
          if (!bucketReady) {
            return res.status(500).json({ 
              message: "Storage bucket not available. Please contact administrator to set up Supabase storage bucket 'donations'." 
            });
          }

          const file = req.files["receipt"][0];
          const fileName = `${Date.now()}-${file.originalname || 'gcash-receipt.jpg'}`;
          console.log(`Uploading GCash receipt to Supabase: ${fileName}`);
          
          // Upload to gcash/ folder in the donations bucket
          const { data, error } = await supabase.storage
            .from("donations")
            .upload(`gcash/${fileName}`, file.buffer, { 
              contentType: file.mimetype || 'image/jpeg',
              upsert: false 
            });
          
          if (error) {
            console.error("Supabase upload error (GCash receipt):", error);
            if (error.message?.includes("Bucket not found")) {
              return res.status(500).json({ 
                message: "Storage bucket 'donations' not found. Please create it in Supabase dashboard or contact administrator." 
              });
            }
            return res.status(500).json({ message: "Failed to upload GCash receipt. Please try again." });
          } else {
            receiptUrl = data.path;
            console.log("GCash receipt uploaded successfully:", receiptUrl);
          }
        } catch (uploadError) {
          console.error("Error uploading GCash receipt:", uploadError);
          return res.status(500).json({ message: "Failed to upload GCash receipt. Please try again." });
        }
      }
    }

    // Save to main Donation collection (for admin approval)
    const newDonation = new DonationModel({
      user_id: uid,
      user_name: userName,
      user_email: user.email,
      amount: parseFloat(amount),
      paymentMethod,
      intercession: intercession || "",
      status: "pending",
      donationImage: donationImageUrl,
      receipt: receiptUrl,
    });
    await newDonation.save();

    // Save to User's donations subcollection
    const donationData = {
      donation_id: newDonation._id.toString(),
      amount: parseFloat(amount),
      paymentMethod,
      intercession: intercession || "",
      status: "pending",
      donationImage: donationImageUrl,
      receipt: receiptUrl,
    };
    user.donations.push(donationData);
    await user.save();
    const userDonation = user.donations[user.donations.length - 1];

    // Notify all admins about the new donation
    try {
      const admins = await AdminModel.find({ is_deleted: false }).select("uid");
      const adminIds = admins.map((admin) => admin.uid);
      if (adminIds.length > 0) {
        // Create appropriate notification message based on payment method
        let notificationMessage;
        if (paymentMethod === "In Kind") {
          notificationMessage = `${userName} has submitted an In Kind donation.`;
        } else {
          notificationMessage = `${userName} has submitted a donation of PHP ${parseFloat(amount).toLocaleString("en-US", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
          })} via ${paymentMethod}.`;
        }

        await notifyAllAdmins(
          adminIds,
          "donation_status",
          "New Donation Received",
          notificationMessage,
          {
            action: "DonationsScreen",
            metadata: {
              donation_id: newDonation._id.toString(),
              user_id: uid,
              user_name: userName,
              amount: parseFloat(amount),
              paymentMethod,
            },
            priority: "medium",
          }
        );
      }
    } catch (notificationError) {
      console.error("Error creating admin notifications for donation:", notificationError);
    }

    res.status(201).json({
      message: "Donation created successfully. It has been saved to your donation history and submitted for admin approval.",
      donation: userDonation,
      mainDonationId: newDonation._id,
    });
  } catch (err) {
    console.error("Error creating donation:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get all donations for a user
 * POST /api/getUserDonations
 * Body: { uid }
 */
async function getUserDonations(req, res) {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false }).select("donations");
    if (!user) return res.status(404).json({ message: "User not found." });

    const sortedDonations = user.donations.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    res.status(200).json({ message: "Donations retrieved successfully.", donations: sortedDonations, count: sortedDonations.length });
  } catch (err) {
    console.error("Error getting donations:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

/**
 * Get donation statistics for a user
 * POST /api/getDonationStats
 * Body: { uid }
 */
async function getDonationStats(req, res) {
  try {
    const { uid } = req.body;
    if (!uid) return res.status(400).json({ message: "User ID (uid) is required." });

    const user = await UserModel.findOne({ uid, is_deleted: false }).select("donations");
    if (!user) return res.status(404).json({ message: "User not found." });

    const totalAmount = user.donations.reduce((sum, donation) => sum + (donation.amount || 0), 0);
    const confirmedDonations = user.donations.filter((donation) => donation.status === "confirmed");
    const confirmedTotal = confirmedDonations.reduce((sum, donation) => sum + (donation.amount || 0), 0);

    const stats = {
      totalDonations: user.donations.length,
      totalAmount,
      confirmedCount: confirmedDonations.length,
      confirmedTotal,
      pendingCount: user.donations.filter((d) => d.status === "pending").length,
    };

    res.status(200).json({ message: "Donation statistics retrieved successfully.", stats });
  } catch (err) {
    console.error("Error getting donation stats:", err);
    res.status(500).json({ message: "Server error. Please try again later." });
  }
}

module.exports = {
  createDonation,
  getUserDonations,
  getDonationStats,
};
