const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getDb, collections } = require('../config/firebase');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'attendai_super_secret_jwt_2024';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const db = getDb();
    const snap = await db.collection(collections.USERS).where('email', '==', email).limit(1).get();
    if (snap.empty) return res.status(401).json({ error: 'Invalid credentials' });

    const userDoc = snap.docs[0];
    const user = { id: userDoc.id, ...userDoc.data() };

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name, studentId: user.studentId },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, studentId: user.studentId },
    });
  } catch (err) {
    console.error('[LOGIN]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password, role, studentId } = req.body;
    if (!name || !email || !password || !role) return res.status(400).json({ error: 'All fields required' });

    const db = getDb();
    const existing = await db.collection(collections.USERS).where('email', '==', email).limit(1).get();
    if (!existing.empty) return res.status(409).json({ error: 'Email already registered' });

    const hashed = bcrypt.hashSync(password, 10);
    const ref = await db.collection(collections.USERS).add({
      name, email, password: hashed, role,
      studentId: studentId || null,
      createdAt: new Date(),
    });

    res.json({ success: true, id: ref.id });
  } catch (err) {
    console.error('[REGISTER]', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
