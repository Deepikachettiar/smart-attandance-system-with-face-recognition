const admin = require('firebase-admin');

let db;

const initFirebase = () => {
  if (admin.apps.length) {
    db = admin.firestore();
    return db;
  }

  // Initialize with service account from env vars
  const serviceAccount = {
    type: 'service_account',
    project_id: process.env.FIREBASE_PROJECT_ID,
    client_email: process.env.FIREBASE_CLIENT_EMAIL,
    private_key: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
  };

  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: `https://${process.env.FIREBASE_PROJECT_ID}-default-rtdb.firebaseio.com`,
  });

  db = admin.firestore();

  // Firestore settings
  db.settings({ ignoreUndefinedProperties: true });

  console.log('✅ Firebase initialized:', process.env.FIREBASE_PROJECT_ID);
  return db;
};

// Helper: convert Firestore timestamp to ISO string
const toDate = (ts) => {
  if (!ts) return null;
  if (ts.toDate) return ts.toDate().toISOString();
  return ts;
};

// Firestore collections helper
const collections = {
  USERS: 'users',
  SUBJECTS: 'subjects',
  ENROLLMENTS: 'enrollments',
  ATTENDANCE: 'attendance',
};

module.exports = { initFirebase, getDb: () => db, toDate, collections, admin };
