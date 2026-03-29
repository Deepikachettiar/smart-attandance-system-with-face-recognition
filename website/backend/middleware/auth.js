const { admin } = require('../config/firebase');

const authenticate = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      console.log('[AUTH] No token in request headers');
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = await admin.auth().verifyIdToken(token);
    req.user = {
      id:    decoded.uid,
      email: decoded.email,
      name:  decoded.name || decoded.email,
      role:  'teacher',
    };
    next();
  } catch (err) {
    console.log('[AUTH] Token verify failed:', err.message);
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireTeacher = (req, res, next) => next();

module.exports = { authenticate, requireTeacher };