// const admin = require("firebase-admin");

// // Initialize Firebase Admin SDK
// if (!admin.apps.length) {
//   try {
//     // Try to initialize with service account key
//     const serviceAccount = require("./firebaseServiceKey.json");
//     admin.initializeApp({
//       credential: admin.credential.cert(serviceAccount),
//     });
//     console.log("✅ Firebase Admin initialized successfully");
//   } catch (error) {
//     console.error("❌ Error initializing Firebase Admin:", error.message);
//     console.error("Make sure firebaseServiceKey.json exists in the config folder");
//   }
// }

// module.exports = admin;

require('dotenv').config();
const admin = require("firebase-admin");

if (!admin.apps.length) {
  const serviceAccount = {
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });

  console.log("✅ Firebase Admin initialized successfully");
}

module.exports = admin;
