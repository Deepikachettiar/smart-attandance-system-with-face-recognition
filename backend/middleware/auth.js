const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'attendai_super_secret_jwt_2024';

const authenticate = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
};

const requireTeacher = (req, res, next) => {
  if (req.user?.role !== 'teacher') return res.status(403).json({ error: 'Teacher access required' });
  next();
};

module.exports = { authenticate, requireTeacher };
