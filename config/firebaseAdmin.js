const admin = require("firebase-admin");

// Initialize Firebase Admin SDK
// On Render: use FIREBASE_SERVICE_ACCOUNT_JSON env var (no JSON file).
// Locally: use firebaseServiceKey.json if present.
if (!admin.apps.length) {
  let serviceAccount = null;

  // 1) Prefer env var (for Render / production)
  const envJson = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (envJson && typeof envJson === "string") {
    try {
      serviceAccount = JSON.parse(envJson);
    } catch (e) {
      console.error("❌ FIREBASE_SERVICE_ACCOUNT_JSON is invalid JSON:", e.message);
    }
  }

  // 2) Fallback: local JSON file (for local dev)
  if (!serviceAccount) {
    try {
      serviceAccount = require("./firebaseServiceKey.json");
    } catch (e) {
      if (e.code !== "MODULE_NOT_FOUND") {
        console.error("❌ Error reading firebaseServiceKey.json:", e.message);
      }
    }
  }

  if (serviceAccount) {
    try {
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log("✅ Firebase Admin initialized successfully");
    } catch (error) {
      console.error("❌ Error initializing Firebase Admin:", error.message);
    }
  } else {
    console.error("❌ Firebase Admin not initialized: no credentials.");
    console.error("   On Render: set FIREBASE_SERVICE_ACCOUNT_JSON in Environment.");
    console.error("   Locally: add config/firebaseServiceKey.json.");
  }
}

module.exports = admin;

