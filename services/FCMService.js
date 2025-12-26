const admin = require("../config/firebaseAdmin");

// Check if Firebase Admin is initialized
let adminDb = null;
try {
  if (admin.apps.length > 0) {
    adminDb = admin.firestore();
  } else {
    console.warn("⚠️ Firebase Admin not initialized - FCM will not work");
  }
} catch (error) {
  console.error("⚠️ Error accessing Firebase Admin:", error.message);
}

/**
 * Get FCM token for a user from Firestore
 * @param {String} userId - User's uid
 * @returns {String|null} FCM token or null if not found
 */
async function getUserFCMToken(userId) {
  try {
    if (!userId) {
      console.log("FCMService: No user ID provided");
      return null;
    }

    if (!adminDb) {
      console.log("FCMService: Firebase Admin not initialized - cannot get token");
      return null;
    }

    console.log(`FCMService: Looking for token for user ID: ${userId}`);

    // Get token from pushTokens collection (as stored by mobile app)
    const tokenDoc = await adminDb.collection("pushTokens").doc(userId).get();
    
    if (tokenDoc.exists) {
      const data = tokenDoc.data();
      console.log(`FCMService: Token document found. Data:`, JSON.stringify(data, null, 2));
      // Prefer fcmToken, fallback to token field
      const token = data.fcmToken || data.token;
      if (token) {
        console.log(`FCMService: ✅ Token found for user ${userId}`);
        return token;
      } else {
        console.log(`FCMService: ❌ Token document exists but fcmToken/token field is empty`);
      }
    } else {
      console.log(`FCMService: ❌ No token document found for user ${userId} in pushTokens collection`);
      
      // Try to find token by userDocId as fallback
      try {
        const tokensQuery = await adminDb.collection("pushTokens")
          .where("userDocId", "==", userId)
          .limit(1)
          .get();
        
        if (!tokensQuery.empty) {
          const fallbackDoc = tokensQuery.docs[0];
          const fallbackData = fallbackDoc.data();
          const fallbackToken = fallbackData.fcmToken || fallbackData.token;
          if (fallbackToken) {
            console.log(`FCMService: ✅ Token found via userDocId fallback for user ${userId}`);
            return fallbackToken;
          }
        }
      } catch (fallbackError) {
        console.log(`FCMService: Fallback lookup failed:`, fallbackError.message);
      }
      
      // Debug: List available tokens to help diagnose
      try {
        const allTokens = await adminDb.collection("pushTokens").limit(10).get();
        const availableIds = allTokens.docs.map(d => ({ id: d.id, userDocId: d.data().userDocId }));
        console.log(`FCMService: Available token documents (first 10):`, JSON.stringify(availableIds, null, 2));
      } catch (debugError) {
        console.log(`FCMService: Could not list available tokens for debugging`);
      }
    }

    console.log(`FCMService: No FCM token found for user ${userId}`);
    return null;
  } catch (error) {
    console.error("FCMService: Error getting user token:", error);
    console.error("FCMService: Error stack:", error.stack);
    return null;
  }
}

/**
 * Get FCM tokens for multiple users
 * @param {Array<String>} userIds - Array of user uids
 * @returns {Object} Map of userId to token
 */
async function getUserFCMTokens(userIds) {
  try {
    if (!userIds || userIds.length === 0) {
      return {};
    }

    const tokenMap = {};
    const tokenPromises = userIds.map(async (userId) => {
      const token = await getUserFCMToken(userId);
      if (token) {
        tokenMap[userId] = token;
      }
    });

    await Promise.all(tokenPromises);
    return tokenMap;
  } catch (error) {
    console.error("FCMService: Error getting user tokens:", error);
    return {};
  }
}

/**
 * Send push notification to a single user
 * @param {String} userId - User's uid
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Boolean} Success status
 */
async function sendToUser(userId, title, body, data = {}) {
  try {
    if (!admin || admin.apps.length === 0) {
      console.log(`FCMService: Firebase Admin not initialized - cannot send notification`);
      return false;
    }

    const token = await getUserFCMToken(userId);
    
    if (!token) {
      console.log(`FCMService: No token found for user ${userId}, skipping notification`);
      return false;
    }

    const message = {
      token: token,
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        type: data.type || "general",
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`FCMService: Notification sent to user ${userId}:`, response);
    return true;
  } catch (error) {
    console.error(`FCMService: Error sending notification to user ${userId}:`, error);
    return false;
  }
}

/**
 * Send push notification to multiple users
 * @param {Array<String>} userIds - Array of user uids
 * @param {String} title - Notification title
 * @param {String} body - Notification body
 * @param {Object} data - Additional data payload
 * @returns {Object} Results with success count
 */
async function sendToUsers(userIds, title, body, data = {}) {
  try {
    if (!userIds || userIds.length === 0) {
      return { success: 0, failed: 0 };
    }

    // Get all tokens
    const tokenMap = await getUserFCMTokens(userIds);
    const tokens = Object.values(tokenMap).filter(Boolean);

    if (tokens.length === 0) {
      console.log("FCMService: No valid tokens found for any user");
      return { success: 0, failed: userIds.length };
    }

    const message = {
      tokens: tokens,
      notification: {
        title: title,
        body: body,
      },
      data: {
        ...data,
        type: data.type || "general",
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
          channelId: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
            badge: 1,
          },
        },
      },
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`FCMService: Sent ${response.successCount} notifications, ${response.failureCount} failed`);
    
    return {
      success: response.successCount,
      failed: response.failureCount,
    };
  } catch (error) {
    console.error("FCMService: Error sending multicast notification:", error);
    return { success: 0, failed: userIds.length };
  }
}

module.exports = {
  sendToUser,
  sendToUsers,
  getUserFCMToken,
  getUserFCMTokens,
};

