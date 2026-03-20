const express = require('express');
const { getDb, collections } = require('../config/firebase');
const { authenticate, requireTeacher } = require('../middleware/auth');
const router = express.Router();

// GET /api/students — all students (teacher only)
router.get('/', authenticate, requireTeacher, async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection(collections.USERS).where('role', '==', 'student').orderBy('name').get();
    res.json(snap.docs.map(d => ({ id: d.id, name: d.data().name, email: d.data().email, studentId: d.data().studentId, createdAt: d.data().createdAt })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// GET /api/students/:id/subjects
router.get('/:id/subjects', authenticate, async (req, res) => {
  try {
    if (req.user.role === 'student' && req.user.id !== req.params.id)
      return res.status(403).json({ error: 'Access denied' });

    const db = getDb();
    const enrollSnap = await db.collection(collections.ENROLLMENTS).where('studentId', '==', req.params.id).get();
    const subjectIds = enrollSnap.docs.map(d => d.data().subjectId);

    const subjects = [];
    for (const sid of subjectIds) {
      const sDoc = await db.collection(collections.SUBJECTS).doc(sid).get();
      if (sDoc.exists) {
        const s = sDoc.data();
        const tDoc = await db.collection(collections.USERS).doc(s.teacherId).get();
        subjects.push({ id: sDoc.id, ...s, teacherName: tDoc.exists ? tDoc.data().name : 'Unknown' });
      }
    }
    res.json(subjects);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
