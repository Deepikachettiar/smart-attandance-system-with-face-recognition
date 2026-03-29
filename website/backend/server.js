require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initFirebase } = require('./config/firebase');

// Initialize Firebase
initFirebase();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth',       require('./routes/auth'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/students',   require('./routes/students'));

app.get('/api/health', (_, res) => res.json({ status: 'ok', time: new Date() }));

app.listen(PORT, () => {
  console.log(`\n🚀  AttendAI Backend  →  http://localhost:${PORT}`);
  console.log('📋  Demo Credentials:');
  console.log('    Teacher : teacher@school.edu  /  teacher123');
  console.log('    Student : arjun@student.edu   /  student123\n');
});
