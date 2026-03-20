require('dotenv').config();
const bcrypt = require('bcryptjs');
const { initFirebase, collections } = require('./config/firebase');

const db = initFirebase();

const seed = async () => {
  console.log('🌱 Seeding Firebase database...');

  const hash = (pw) => bcrypt.hashSync(pw, 10);

  // ── Teachers ──
  const teachers = [
    { id: 'teacher_001', name: 'Dr. Priya Sharma', email: 'teacher@school.edu', password: hash('teacher123'), role: 'teacher' },
    { id: 'teacher_002', name: 'Prof. Rahul Verma', email: 'rahul@school.edu', password: hash('teacher123'), role: 'teacher' },
  ];
  for (const t of teachers) {
    await db.collection(collections.USERS).doc(t.id).set({ ...t, createdAt: new Date() });
  }

  // ── Students ──
  const students = [
    { id: 'stu_001', name: 'Arjun Mehta',   email: 'arjun@student.edu',   password: hash('student123'), role: 'student', studentId: 'CS2021001' },
    { id: 'stu_002', name: 'Sneha Patel',   email: 'sneha@student.edu',   password: hash('student123'), role: 'student', studentId: 'CS2021002' },
    { id: 'stu_003', name: 'Vikram Singh',  email: 'vikram@student.edu',  password: hash('student123'), role: 'student', studentId: 'CS2021003' },
    { id: 'stu_004', name: 'Priya Nair',    email: 'priya@student.edu',   password: hash('student123'), role: 'student', studentId: 'CS2021004' },
    { id: 'stu_005', name: 'Rohan Das',     email: 'rohan@student.edu',   password: hash('student123'), role: 'student', studentId: 'CS2021005' },
    { id: 'stu_006', name: 'Ananya Iyer',   email: 'ananya@student.edu',  password: hash('student123'), role: 'student', studentId: 'CS2021006' },
  ];
  for (const s of students) {
    await db.collection(collections.USERS).doc(s.id).set({ ...s, createdAt: new Date() });
  }

  // ── Subjects ──
  const subjects = [
    { id: 'sub_001', code: 'CS301', name: 'Data Structures & Algorithms', teacherId: 'teacher_001' },
    { id: 'sub_002', code: 'CS302', name: 'Database Management Systems',  teacherId: 'teacher_001' },
    { id: 'sub_003', code: 'CS303', name: 'Computer Networks',            teacherId: 'teacher_002' },
  ];
  for (const s of subjects) {
    await db.collection(collections.SUBJECTS).doc(s.id).set({ ...s, createdAt: new Date() });
  }

  // ── Enrollments ──
  for (const stu of students) {
    for (const sub of subjects) {
      const id = `${stu.id}_${sub.id}`;
      await db.collection(collections.ENROLLMENTS).doc(id).set({
        studentId: stu.id, subjectId: sub.id, createdAt: new Date()
      });
    }
  }

  // ── Attendance (last 30 weekdays) ──
  const statuses = ['Present', 'Present', 'Present', 'Present', 'Absent', 'Late'];
  let count = 0;
  for (let i = 29; i >= 1; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = d.toISOString().split('T')[0];
    const timeStr = `${dateStr}T09:${String(Math.floor(Math.random()*30)).padStart(2,'0')}:00`;

    for (const stu of students) {
      for (const sub of subjects) {
        const status = statuses[Math.floor(Math.random() * statuses.length)];
        const id = `${stu.id}_${sub.id}_${dateStr}`;
        await db.collection(collections.ATTENDANCE).doc(id).set({
          studentId: stu.id,
          studentName: stu.name,
          studentRollNo: stu.studentId,
          subjectId: sub.id,
          subjectCode: sub.code,
          subjectName: sub.name,
          date: dateStr,
          time: timeStr,
          status,
          method: 'face_recognition',
          markedBy: 'teacher_001',
          createdAt: new Date(timeStr),
        });
        count++;
      }
    }
  }

  console.log(`✅ Seeding complete! ${count} attendance records created.`);
  console.log('\n📋 Demo Credentials:');
  console.log('   Teacher : teacher@school.edu  / teacher123');
  console.log('   Student : arjun@student.edu   / student123');
  process.exit(0);
};

seed().catch(e => { console.error(e); process.exit(1); });
