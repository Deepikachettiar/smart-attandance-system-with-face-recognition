const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb, collections } = require('../config/firebase');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'attendai_super_secret_jwt_2024';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const db = getDb();
    const emailClean = email.trim().toLowerCase();

    // Fetch ALL users and find by email (avoids Firestore index issues)
    const allSnap = await db.collection(collections.USERS).get();
    const allUsers = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const user = allUsers.find(u =>
      u.email && u.email.trim().toLowerCase() === emailClean
    );

    if (!user) {
      console.log('[LOGIN] No user found for email:', emailClean);
      console.log('[LOGIN] Available emails:', allUsers.map(u => u.email));
      return res.status(401).json({ error: 'No account found with that email' });
    }

    // Only teachers allowed
    if (user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access restricted to teachers only' });
    }

    // Verify password
    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      console.log('[LOGIN] Password mismatch for:', emailClean);
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('[LOGIN] Success:', user.name, user.email);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// POST /api/auth/fix-teacher
// Call this ONCE if teacher password is wrong — resets it
router.post('/fix-teacher', async (req, res) => {
  try {
    const { adminKey, email, newPassword } = req.body;
    if (adminKey !== 'fix_attendai_now')
      return res.status(403).json({ error: 'Wrong admin key' });

    const bcrypt = require('bcryptjs');
    const db = getDb();
    const snap = await db.collection(collections.USERS).get();
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    const user = docs.find(u => u.email?.trim().toLowerCase() === email.trim().toLowerCase());

    if (!user) return res.status(404).json({ error: 'User not found' });

    const hashed = bcrypt.hashSync(newPassword, 10);
    await db.collection(collections.USERS).doc(user.id).update({
      password: hashed,
      role: 'teacher',
    });

    res.json({ success: true, message: `Password updated for ${user.email}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/list-users  — debug, see what's in Firebase
router.get('/list-users', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection(collections.USERS).get();
    const users = snap.docs.map(d => ({
      id: d.id,
      email: d.data().email,
      role: d.data().role,
      name: d.data().name,
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
