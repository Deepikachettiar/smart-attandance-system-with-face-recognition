const express = require('express');
const bcrypt  = require('bcryptjs');
const jwt     = require('jsonwebtoken');
const { getDb, collections } = require('../config/firebase');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'attendai_super_secret_jwt_2024';

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'Email and password are required' });

    const db = getDb();

    // Fetch ALL users — avoids Firestore composite index issues
    const allSnap = await db.collection(collections.USERS).get();
    const allUsers = allSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const user = allUsers.find(u =>
      u.email && u.email.trim().toLowerCase() === email.trim().toLowerCase()
    );

    if (!user) {
      console.log('[LOGIN] No user found. Emails in DB:', allUsers.map(u => u.email));
      return res.status(401).json({ error: 'No account found with that email' });
    }

    if (user.role !== 'teacher') {
      return res.status(403).json({ error: 'Access restricted to teachers only' });
    }

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) {
      console.log('[LOGIN] Password wrong for:', user.email);
      return res.status(401).json({ error: 'Incorrect password' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    console.log('[LOGIN] Success:', user.name);
    res.json({
      token,
      user: { id: user.id, name: user.name, email: user.email, role: user.role },
    });

  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Server error: ' + err.message });
  }
});

// Debug — see all users in Firebase
router.get('/list-users', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection(collections.USERS).get();
    const users = snap.docs.map(d => ({
      id: d.id, email: d.data().email,
      role: d.data().role, name: d.data().name,
    }));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;