require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initFirebase, collections } = require('./config/firebase');

const db = initFirebase();

const TEACHER_EMAIL    = 'teacher@school.edu';
const TEACHER_PASSWORD = 'teacher123';
const TEACHER_NAME     = 'Dr. Priya Sharma';

const seed = async () => {
  console.log('\n🌱 Fixing Firebase teacher account...\n');

  // Get ALL existing users
  const allSnap = await db.collection(collections.USERS).get();
  const allUsers = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const existing = allUsers.find(
    u => u.email?.trim().toLowerCase() === TEACHER_EMAIL.toLowerCase()
  );

  const hashed = bcrypt.hashSync(TEACHER_PASSWORD, 10);

  if (existing) {
    // FORCE UPDATE password + role on existing doc
    await db.collection(collections.USERS).doc(existing.id).update({
      name: TEACHER_NAME,
      email: TEACHER_EMAIL,
      password: hashed,
      role: 'teacher',
    });
    console.log('✅ Teacher UPDATED — password reset to:', TEACHER_PASSWORD);
  } else {
    await db.collection(collections.USERS).add({
      name: TEACHER_NAME,
      email: TEACHER_EMAIL,
      password: hashed,
      role: 'teacher',
      createdAt: new Date(),
    });
    console.log(' Teacher CREATED:', TEACHER_EMAIL);
  }

  console.log('\n Done! Login with:');
  console.log('  Email    :', TEACHER_EMAIL);
  console.log('  Password :', TEACHER_PASSWORD);
  console.log('\nNow restart: npm run dev\n');
  process.exit(0);
};

seed().catch(e => { console.error('❌ Failed:', e.message); process.exit(1); });