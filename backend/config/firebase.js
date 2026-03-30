const admin = require('firebase-admin');

let db;

const initFirebase = () => {
  if (admin.apps.length) {
    db = admin.firestore();
    return db;
  }

  try {
    // Preferred method: Full service account JSON from env
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log('✅ Firebase connected using SERVICE_ACCOUNT_JSON');
    } 
    // Fallback method
    else {
      const privateKey = process.env.FIREBASE_PRIVATE_KEY 
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n') 
        : undefined;

      if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
        throw new Error('Missing Firebase credentials');
      }

      admin.initializeApp({
        credential: admin.credential.cert({
          type: 'service_account',
          project_id: process.env.FIREBASE_PROJECT_ID,
          client_email: process.env.FIREBASE_CLIENT_EMAIL,
          private_key: privateKey,
        })
      });
    }

    db = admin.firestore();
    db.settings({ ignoreUndefinedProperties: true });
    console.log('✅ Firebase connected ->', process.env.FIREBASE_PROJECT_ID);
    return db;

  } catch (err) {
    console.error('❌ Firebase init failed:', err.message);
    throw err;
  }
};

const getDb = () => {
  if (!db) throw new Error('Firebase not initialized');
  return db;
};

const collections = {
  USERS: 'users',
  SUBJECTS: 'subjects',
  ENROLLMENTS: 'enrollments',
  ATTENDANCE: 'attendance',
};

module.exports = { initFirebase, getDb, collections, admin };