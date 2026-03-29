const admin = require('firebase-admin');

let db;

const initFirebase = () => {
  if (admin.apps.length) {
    db = admin.firestore();
    return db;
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : undefined;

  if (!privateKey || !process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL) {
    throw new Error('Missing Firebase env vars. Check .env file.');
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      type: 'service_account',
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: privateKey,
    }),
  });

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  console.log('✅ Firebase connected ->', process.env.FIREBASE_PROJECT_ID);
  return db;
};

const getDb = () => {
  if (!db) throw new Error('Firebase not initialized');
  return db;
};

const collections = {
  USERS:       'users',
  SUBJECTS:    'subjects',
  ENROLLMENTS: 'enrollments',
  ATTENDANCE:  'attendance',
};

module.exports = { initFirebase, getDb, collections, admin };
