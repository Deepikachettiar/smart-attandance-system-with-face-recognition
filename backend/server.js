require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initFirebase } = require('./config/firebase');

initFirebase();

const app = express();
const PORT = process.env.PORT || 5000;

// Temporary broad CORS for debugging
app.use(cors({
  origin: '*',           // Allow all origins temporarily
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/students', require('./routes/students'));

app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    time: new Date(),
    firebase: admin.apps.length > 0 ? 'connected' : 'not connected',
    frontend_url: process.env.FRONTEND_URL || 'not set'
  });
});

app.listen(PORT, () => {
  console.log(`🚀 AttendAI Backend running on port ${PORT}`);
  console.log('Frontend URL configured:', process.env.FRONTEND_URL);
});

module.exports = app;   // for testing