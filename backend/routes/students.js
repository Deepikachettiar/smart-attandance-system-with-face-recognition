const express = require('express');
const { getDb, collections } = require('../config/firebase');
const { authenticate, requireTeacher } = require('../middleware/auth');

const router = express.Router();

// GET /api/students — all students (teacher only)
router.get('/', authenticate, requireTeacher, async (req, res) => {
  try {
    const db = getDb();

    // Safe query with fallback (handles missing index gracefully)
    let snap;

    try {
      // Primary query with ordering (requires index)
      snap = await db.collection(collections.USERS)
        .where('role', '==', 'student')
        .orderBy('name')
        .get();
    } catch (indexError) {
      console.warn('[STUDENTS] Firestore index error detected. Using fallback query...');
      
      // Fallback: fetch without orderBy (no index needed)
      snap = await db.collection(collections.USERS)
        .where('role', '==', 'student')
        .get();
    }

    const students = snap.docs.map(d => {
      const data = d.data();
      return {
        id: d.id,
        name: data.name || 'Unknown',
        email: data.email || '',
        studentId: data.studentId || '',
        createdAt: data.createdAt,
      };
    });

    // If we used fallback, sort in memory
    if (!snap.query._orderBy) {
      students.sort((a, b) => a.name.localeCompare(b.name));
    }

    res.json(students);

  } catch (err) {
    console.error('[STUDENTS ROUTE ERROR]', err);
    res.status(500).json({ 
      error: 'Failed to load students. Please check Firebase indexes or run seed.js again.' 
    });
  }
});

module.exports = router;