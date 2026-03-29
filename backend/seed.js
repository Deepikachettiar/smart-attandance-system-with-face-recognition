
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initFirebase, collections } = require('./config/firebase');

const db = initFirebase();

const TEACHER_EMAIL    = 'teacher@school.edu';
const TEACHER_PASSWORD = 'teacher123';
const TEACHER_NAME     = 'Dr. Priya Sharma';

const seed = async () => {
  console.log('\n🌱 Seeding/fixing your Firebase...\n');
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // ── 1. Teacher — always upsert to fix any stale password ─────────────
  const allUsersSnap = await db.collection(collections.USERS).get();
  const allUsers = allUsersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const existingTeacher = allUsers.find(
    u => u.email?.trim().toLowerCase() === TEACHER_EMAIL.toLowerCase()
  );

  let teacherId;
  if (existingTeacher) {
    // UPDATE existing teacher — fix password and role
    await db.collection(collections.USERS).doc(existingTeacher.id).update({
      password: hash(TEACHER_PASSWORD),
      role: 'teacher',
      name: TEACHER_NAME,
    });
    teacherId = existingTeacher.id;
    console.log('✅ Teacher UPDATED (password reset):', TEACHER_EMAIL);
  } else {
    // CREATE new teacher
    const ref = await db.collection(collections.USERS).add({
      name: TEACHER_NAME,
      email: TEACHER_EMAIL,
      password: hash(TEACHER_PASSWORD),
      role: 'teacher',
      createdAt: new Date(),
    });
    teacherId = ref.id;
    console.log('✅ Teacher CREATED:', TEACHER_EMAIL);
  }

  // ── 2. Students ────────────────────────────────────────────────────────
  const studentDefs = [
    { name: 'Deepika K',  email: 'deepika@student.edu',  studentId: 'CS148' },
    { name: 'Jaya Chithra K',  email: 'jaya@student.edu',  studentId: 'CS160' },
    { name: 'Arjun Mehta',  email: 'arjun@student.edu',  studentId: 'CS2021001' },
    { name: 'Sneha Patel',  email: 'sneha@student.edu',  studentId: 'CS2021002' },
    { name: 'Vikram Singh', email: 'vikram@student.edu', studentId: 'CS2021003' },
    { name: 'Priya Nair',   email: 'priya@student.edu',  studentId: 'CS2021004' },
    { name: 'Rohan Das',    email: 'rohan@student.edu',  studentId: 'CS2021005' },
    { name: 'Ananya Iyer',  email: 'ananya@student.edu', studentId: 'CS2021006' },
  ];

  const studentIds = [];
  for (const s of studentDefs) {
    const ex = allUsers.find(u => u.email?.trim().toLowerCase() === s.email.toLowerCase());
    if (ex) {
      studentIds.push(ex.id);
    } else {
      const ref = await db.collection(collections.USERS).add({
        ...s, password: hash('student123'), role: 'student', createdAt: new Date(),
      });
      studentIds.push(ref.id);
    }
  }
  console.log('✅ Students ready:', studentIds.length);

  // ── 3. Subjects ────────────────────────────────────────────────────────
  const subjectDefs = [
    { code: 'CS301', name: 'Data Structures & Algorithms' },
    { code: 'CS302', name: 'Database Management Systems'  },
    { code: 'CS303', name: 'Computer Networks'            },
    { code: 'UE24CS25', name: 'Microprocessor and Computer Architecture' },
  ];
  const existingSubsSnap = await db.collection(collections.SUBJECTS).get();
  const existingSubs = existingSubsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

  const subjectIds = [];
  for (const s of subjectDefs) {
    const ex = existingSubs.find(x => x.code === s.code);
    if (ex) {
      // Update teacherId in case it changed
      await db.collection(collections.SUBJECTS).doc(ex.id).update({ teacherId });
      subjectIds.push(ex.id);
    } else {
      const ref = await db.collection(collections.SUBJECTS).add({
        ...s, teacherId, createdAt: new Date(),
      });
      subjectIds.push(ref.id);
    }
  }
  console.log('✅ Subjects ready:', subjectIds.length);

  // ── 4. Enrollments ─────────────────────────────────────────────────────
  for (const sid of studentIds) {
    for (const subId of subjectIds) {
      const docId = `${sid}_${subId}`;
      await db.collection(collections.ENROLLMENTS).doc(docId).set(
        { studentId: sid, subjectId: subId, createdAt: new Date() },
        { merge: true }
      );
    }
  }
  console.log('✅ Enrollments ready');

  // ── 5. Sample attendance (only if not already present) ─────────────────
  const attSnap = await db.collection(collections.ATTENDANCE).limit(1).get();
  if (attSnap.empty) {
    console.log('⏳ Creating sample attendance records...');
    const statusPool = ['Present','Present','Present','Present','Absent','Late'];
    const subDocs = subjectIds.map((id, i) => ({ id, ...subjectDefs[i] }));
    let count = 0;

    for (let daysAgo = 25; daysAgo >= 1; daysAgo--) {
      const d = new Date();
      d.setDate(d.getDate() - daysAgo);
      if (d.getDay() === 0 || d.getDay() === 6) continue;
      const dateStr = d.toISOString().split('T')[0];

      for (let si = 0; si < studentIds.length; si++) {
        for (const sub of subDocs) {
          const status = statusPool[Math.floor(Math.random() * statusPool.length)];
          const docId  = `${studentIds[si]}_${sub.id}_${dateStr}`;
          await db.collection(collections.ATTENDANCE).doc(docId).set({
            studentId: studentIds[si],
            studentName: studentDefs[si].name,
            studentRollNo: studentDefs[si].studentId,
            subjectId: sub.id,
            subjectCode: sub.code,
            subjectName: sub.name,
            date: dateStr,
            time: `${dateStr}T09:${String(Math.floor(Math.random()*30)).padStart(2,'0')}:00`,
            status,
            method: 'face_recognition',
            markedBy: teacherId,
            createdAt: new Date(),
          }, { merge: true });
          count++;
        }
      }
    }
    console.log(`✅ Attendance records created: ${count}`);
  } else {
    console.log('ℹ️  Attendance already exists, skipping...');
  }

  console.log('\n🎉 DONE! Login with:');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('  Email    :', TEACHER_EMAIL);
  console.log('  Password :', TEACHER_PASSWORD);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  process.exit(0);
};

seed().catch(e => { console.error('❌ Seed failed:', e.message); process.exit(1); });
