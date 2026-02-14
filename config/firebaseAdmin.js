const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
if (!admin.apps.length) {
  try {
    // Try to initialize with service account key
    const serviceAccount = require("./firebaseServiceKey.json");
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
    console.log("✅ Firebase Admin initialized successfully");
  } catch (error) {
    console.error("❌ Error initializing Firebase Admin:", error.message);
    console.error("Make sure firebaseServiceKey.json exists in the config folder");
  }
}

module.exports = admin;

