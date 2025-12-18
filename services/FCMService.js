const admin = require("firebase-admin");
const User = require("../models/User"); // Your user model

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(require("../config/firebaseServiceKey.json")),
  });
}

/**
 * Send push notification to a single user
 * @param {Object} param0
 * @param {String} param0.userId - MongoDB _id of the user
 * @param {String} param0.title - Notification title
 * @param {String} param0.body - Notification body
 * @param {String} param0.type - Notification type (optional)
 * @param {Object} param0.metadata - Additional data (optional)
 */
async function sendToUser({ userId, title, body, type = "general", metadata = {} }) {
  try {
    const user = await User.findById(userId);

    if (!user || !user.fcmToken) {
      console.log(`FCMService: No FCM token found for user ${userId}`);
      return false;
    }

    const message = {
      token: user.fcmToken,
      notification: {
        title,
        body,
      },
      data: {
        type,
        ...metadata,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    };

    const response = await admin.messaging().send(message);
    console.log(`FCMService: Notification sent to user ${userId}`, response);
    return true;
  } catch (error) {
    console.error("FCMService: Error sending notification", error);
    return false;
  }
}

/**
 * Send push notification to multiple users
 * @param {Array} userIds - Array of MongoDB _id strings
 * @param {String} title
 * @param {String} body
 * @param {String} type
 * @param {Object} metadata
 */
async function sendToUsers({ userIds = [], title, body, type = "general", metadata = {} }) {
  try {
    const users = await User.find({ _id: { $in: userIds }, fcmToken: { $exists: true } });
    const tokens = users.map(u => u.fcmToken).filter(Boolean);

    if (tokens.length === 0) {
      console.log("FCMService: No valid FCM tokens found");
      return false;
    }

    const message = {
      tokens,
      notification: {
        title,
        body,
      },
      data: {
        type,
        ...metadata,
      },
      android: {
        priority: "high",
        notification: {
          sound: "default",
        },
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    };

    const response = await admin.messaging().sendMulticast(message);
    console.log(`FCMService: Notifications sent to ${tokens.length} users`, response);
    return true;
  } catch (error) {
    console.error("FCMService: Error sending multicast notification", error);
    return false;
  }
}

module.exports = {
  sendToUser,
  sendToUsers,
};
