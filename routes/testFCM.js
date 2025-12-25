const express = require("express");
const router = express.Router();
const { sendToUser } = require("../services/FCMService");

/**
 * Test FCM push notification
 * POST /api/test-fcm
 * Body: { userId: "user_uid_here" }
 */
router.post("/test-fcm", async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ 
        success: false, 
        message: "userId is required" 
      });
    }

    console.log(`[TEST] Attempting to send test notification to user: ${userId}`);

    const result = await sendToUser(
      userId,
      "Test Notification",
      "This is a test push notification from backend",
      { type: "test" }
    );

    if (result) {
      console.log(`[TEST] ✅ Notification sent successfully`);
      return res.json({ 
        success: true, 
        message: "Test notification sent successfully" 
      });
    } else {
      console.log(`[TEST] ❌ Failed to send notification (no token found)`);
      return res.status(400).json({ 
        success: false, 
        message: "Failed to send notification. Check if user has FCM token in Firestore." 
      });
    }

  } catch (error) {
    console.error("[TEST] Error sending test notification:", error);
    return res.status(500).json({ 
      success: false, 
      message: "Error sending notification",
      error: error.message 
    });
  }
});

module.exports = router;

