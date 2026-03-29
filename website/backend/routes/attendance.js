const express = require('express');
const { getDb, collections } = require('../config/firebase');
const { authenticate, requireTeacher } = require('../middleware/auth');
const { sendLowAttendanceAlert } = require('../utils/email');
const router = express.Router();

const THRESHOLD = parseInt(process.env.ATTENDANCE_THRESHOLD || '75');

// GET /api/attendance/student/:studentId
router.get('/student/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role === 'student' && req.user.id !== studentId)
      return res.status(403).json({ error: 'Access denied' });

    const db = getDb();
    let query = db.collection(collections.ATTENDANCE).where('studentId', '==', studentId);
    if (req.query.subject_id)
      query = query.where('subjectId', '==', req.query.subject_id);

    const snap = await query.get();
    let records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

    if (req.query.from) records = records.filter(r => r.date >= req.query.from);
    if (req.query.to)   records = records.filter(r => r.date <= req.query.to);
    records.sort((a, b) => b.date.localeCompare(a.date));

    res.json(records);
  } catch (err) {
    console.error('[GET STUDENT ATT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/summary/:studentId
router.get('/summary/:studentId', authenticate, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role === 'student' && req.user.id !== studentId)
      return res.status(403).json({ error: 'Access denied' });

    const db = getDb();
    const snap = await db.collection(collections.ATTENDANCE).where('studentId', '==', studentId).get();
    const records = snap.docs.map(d => d.data());

    const bySubject = {};
    for (const r of records) {
      if (!bySubject[r.subjectId]) {
        bySubject[r.subjectId] = {
          subject_id: r.subjectId,
          subject_name: r.subjectName,
          subject_code: r.subjectCode,
          total: 0, present: 0, absent: 0, late: 0,
        };
      }
      bySubject[r.subjectId].total++;
      if (r.status === 'Present')      bySubject[r.subjectId].present++;
      else if (r.status === 'Absent')  bySubject[r.subjectId].absent++;
      else if (r.status === 'Late')    bySubject[r.subjectId].late++;
    }

    const summary = Object.values(bySubject).map(s => ({
      ...s,
      percentage: s.total ? Math.round(1000 * s.present / s.total) / 10 : 0,
    }));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/attendance/teacher/all-subjects  — returns ALL subjects (for new Firebase Auth users)
router.get('/teacher/all-subjects', authenticate, requireTeacher, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection(collections.SUBJECTS).get();
    res.json(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// GET /api/attendance/class/:subjectId?date=YYYY-MM-DD
router.get('/class/:subjectId', authenticate, requireTeacher, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const date = req.query.date || new Date().toISOString().split('T')[0];
    const db = getDb();

    const subDoc = await db.collection(collections.SUBJECTS).doc(subjectId).get();
    if (!subDoc.exists || subDoc.data().teacherId !== req.user.id)
      return res.status(403).json({ error: 'Not your subject' });
    const subject = { id: subDoc.id, ...subDoc.data() };

    const enrollSnap = await db.collection(collections.ENROLLMENTS)
      .where('subjectId', '==', subjectId).get();
    const studentIds = enrollSnap.docs.map(d => d.data().studentId);

    const attSnap = await db.collection(collections.ATTENDANCE)
      .where('subjectId', '==', subjectId)
      .where('date', '==', date)
      .get();
    const attMap = {};
    attSnap.docs.forEach(d => { attMap[d.data().studentId] = { id: d.id, ...d.data() }; });

    const students = [];
    for (const sid of studentIds) {
      const uDoc = await db.collection(collections.USERS).doc(sid).get();
      if (uDoc.exists) {
        const u = uDoc.data();
        const att = attMap[sid];
        students.push({
          id: sid,
          name: u.name,
          studentId: u.studentId,
          status: att?.status || 'Not Marked',
          method: att?.method || null,
          attendance_id: att?.id || null,
        });
      }
    }
    students.sort((a, b) => a.name.localeCompare(b.name));
    res.json({ subject, date, students });
  } catch (err) {
    console.error('[CLASS ATT]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/mark
router.post('/mark', authenticate, requireTeacher, async (req, res) => {
  try {
    const { student_id, subject_id, date, status, method } = req.body;
    if (!student_id || !subject_id || !date || !status)
      return res.status(400).json({ error: 'Missing required fields' });

    const db = getDb();
    const subDoc = await db.collection(collections.SUBJECTS).doc(subject_id).get();
    if (!subDoc.exists || subDoc.data().teacherId !== req.user.id)
      return res.status(403).json({ error: 'Not your subject' });
    const sub = subDoc.data();

    const stuDoc = await db.collection(collections.USERS).doc(student_id).get();
    if (!stuDoc.exists) return res.status(404).json({ error: 'Student not found' });
    const stu = stuDoc.data();

    const docId = `${student_id}_${subject_id}_${date}`;
    await db.collection(collections.ATTENDANCE).doc(docId).set({
      studentId: student_id, studentName: stu.name, studentRollNo: stu.studentId,
      subjectId: subject_id, subjectCode: sub.code, subjectName: sub.name,
      date, time: new Date().toISOString(),
      status, method: method || 'manual',
      markedBy: req.user.id, updatedAt: new Date(),
    }, { merge: true });

    checkAndAlert(db, student_id, subject_id, sub.name, stu.email, stu.name, req.user.name);
    res.json({ success: true });
  } catch (err) {
    console.error('[MARK]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/bulk-mark
router.post('/bulk-mark', authenticate, requireTeacher, async (req, res) => {
  try {
    const { subject_id, date, records } = req.body;
    if (!subject_id || !date || !records?.length)
      return res.status(400).json({ error: 'Missing fields' });

    const db = getDb();
    const subDoc = await db.collection(collections.SUBJECTS).doc(subject_id).get();
    if (!subDoc.exists || subDoc.data().teacherId !== req.user.id)
      return res.status(403).json({ error: 'Not your subject' });
    const sub = subDoc.data();

    const batch = db.batch();
    for (const r of records) {
      const docId = `${r.student_id}_${subject_id}_${date}`;
      const ref = db.collection(collections.ATTENDANCE).doc(docId);
      batch.set(ref, {
        studentId: r.student_id, studentName: r.name, studentRollNo: r.studentId,
        subjectId: subject_id, subjectCode: sub.code, subjectName: sub.name,
        date, time: new Date().toISOString(),
        status: r.status, method: r.method || 'manual',
        markedBy: req.user.id, updatedAt: new Date(),
      }, { merge: true });
    }
    await batch.commit();

    res.json({ success: true, count: records.length });
  } catch (err) {
    console.error('[BULK MARK]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/attendance/import-csv
router.post('/import-csv', authenticate, requireTeacher, async (req, res) => {
  try {
    const { records, subject_id, date } = req.body;
    if (!records || !subject_id || !date)
      return res.status(400).json({ error: 'Missing fields' });

    const db = getDb();
    const subDoc = await db.collection(collections.SUBJECTS).doc(subject_id).get();
    if (!subDoc.exists || subDoc.data().teacherId !== req.user.id)
      return res.status(403).json({ error: 'Not your subject' });
    const sub = subDoc.data();

    const stuSnap = await db.collection(collections.USERS).where('role', '==', 'student').get();
    const allStudents = stuSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const batch = db.batch();
    let imported = 0;
    const notFound = [];

    for (const r of records) {
      const name = r.Name?.trim() || r.name?.trim();
      const status = r.Status?.trim() || r.status?.trim() || 'Present';
      const time = r.Time?.trim() || r.time?.trim() || '09:00:00';
      if (!name) continue;

      const student = allStudents.find(s =>
        s.name.toLowerCase() === name.toLowerCase() ||
        s.name.toLowerCase().includes(name.toLowerCase())
      );
      if (!student) { notFound.push(name); continue; }

      const docId = `${student.id}_${subject_id}_${date}`;
      const ref = db.collection(collections.ATTENDANCE).doc(docId);
      batch.set(ref, {
        studentId: student.id, studentName: student.name, studentRollNo: student.studentId,
        subjectId: subject_id, subjectCode: sub.code, subjectName: sub.name,
        date, time: `${date}T${time}`,
        status, method: 'face_recognition',
        markedBy: req.user.id, updatedAt: new Date(),
      }, { merge: true });
      imported++;
    }
    await batch.commit();
    res.json({ success: true, imported, notFound });
  } catch (err) {
    console.error('[IMPORT CSV]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/export/:subjectId
router.get('/export/:subjectId', authenticate, requireTeacher, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const db = getDb();

    const subDoc = await db.collection(collections.SUBJECTS).doc(subjectId).get();
    if (!subDoc.exists || subDoc.data().teacherId !== req.user.id)
      return res.status(403).json({ error: 'Not your subject' });

    const snap = await db.collection(collections.ATTENDANCE)
      .where('subjectId', '==', subjectId).get();

    let rows = snap.docs.map(d => {
      const r = d.data();
      return {
        Name: r.studentName,
        Date: r.date,
        Time: r.time?.split('T')[1]?.slice(0, 8) || '',
        Status: r.status,
        Method: r.method,
        'Roll No': r.studentRollNo,
      };
    });

    if (req.query.from) rows = rows.filter(r => r.Date >= req.query.from);
    if (req.query.to)   rows = rows.filter(r => r.Date <= req.query.to);
    rows.sort((a, b) => b.Date.localeCompare(a.Date));

    res.json({ subject: { id: subjectId, ...subDoc.data() }, rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/attendance/analytics/:subjectId
router.get('/analytics/:subjectId', authenticate, requireTeacher, async (req, res) => {
  try {
    const { subjectId } = req.params;
    const db = getDb();

    const subDoc = await db.collection(collections.SUBJECTS).doc(subjectId).get();
    if (!subDoc.exists || subDoc.data().teacherId !== req.user.id)
      return res.status(403).json({ error: 'Not your subject' });

    const snap = await db.collection(collections.ATTENDANCE)
      .where('subjectId', '==', subjectId).get();
    const records = snap.docs.map(d => d.data());

    const byStudent = {};
    const byDate = {};

    for (const r of records) {
      if (!byStudent[r.studentId]) {
        byStudent[r.studentId] = {
          id: r.studentId, name: r.studentName,
          roll_no: r.studentRollNo,
          total: 0, present: 0, absent: 0, late: 0,
        };
      }
      byStudent[r.studentId].total++;
      if (r.status === 'Present')     byStudent[r.studentId].present++;
      else if (r.status === 'Absent') byStudent[r.studentId].absent++;
      else if (r.status === 'Late')   byStudent[r.studentId].late++;

      if (!byDate[r.date]) {
        byDate[r.date] = { date: r.date, present: 0, absent: 0, late: 0, total: 0 };
      }
      byDate[r.date].total++;
      if (r.status === 'Present')     byDate[r.date].present++;
      else if (r.status === 'Absent') byDate[r.date].absent++;
      else if (r.status === 'Late')   byDate[r.date].late++;
    }

    const stats = Object.values(byStudent).map(s => ({
      ...s,
      percentage: s.total ? Math.round(1000 * s.present / s.total) / 10 : 0,
    })).sort((a, b) => a.name.localeCompare(b.name));

    const daily = Object.values(byDate)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 30);

    res.json({ subject: { id: subjectId, ...subDoc.data() }, stats, daily });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper: check and send low attendance email
async function checkAndAlert(db, studentId, subjectId, subjectName, studentEmail, studentName, teacherName) {
  if (!studentEmail) return;
  try {
    const snap = await db.collection(collections.ATTENDANCE)
      .where('studentId', '==', studentId)
      .where('subjectId', '==', subjectId)
      .get();
    const records = snap.docs.map(d => d.data());
    if (records.length < 5) return;
    const present = records.filter(r => r.status === 'Present').length;
    const pct = Math.round(100 * present / records.length);
    if (pct < THRESHOLD) {
      await sendLowAttendanceAlert({ studentEmail, studentName, subjectName, percentage: pct, teacherName });
    }
  } catch {}
}

module.exports = router;