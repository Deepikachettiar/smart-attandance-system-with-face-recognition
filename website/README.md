# AttendAI — Teacher Attendance Management System

## 🚀 QUICK START (follow exactly in order)

### Step 1 — Install backend dependencies
```bash
cd backend
npm install
```

### Step 2 — Add your Firebase credentials
Your `.env` file is already configured with your Firebase project.
It is inside the `backend/` folder.

### Step 3 — Seed the database (RUN ONCE)
This creates the teacher account + students + subjects + sample attendance in Firebase.
```bash
cd backend
node seed.js
```
After running, you will see:
```
Teacher email    : teacher@school.edu
Teacher password : teacher123
```

### Step 4 — Start the backend server
```bash
cd backend
npm run dev       # with auto-reload
# OR
node server.js    # without auto-reload
```
Server starts at: http://localhost:5000

### Step 5 — Install & start the frontend
```bash
cd frontend
npm install
npm start
```
App opens at: http://localhost:3000

---

## 🔑 Login Credentials
| Email                | Password    |
|----------------------|-------------|
| teacher@school.edu   | teacher123  |

---

## 📁 Project Structure
```
attendance-system/
├── backend/
│   ├── .env                  ← Your Firebase keys (already filled)
│   ├── server.js             ← Express entry point
│   ├── seed.js               ← Run once to populate Firebase
│   ├── config/firebase.js    ← Firebase Admin SDK
│   ├── middleware/auth.js    ← JWT verification
│   ├── routes/
│   │   ├── auth.js           ← Login endpoint
│   │   ├── attendance.js     ← Mark / import / export / analytics
│   │   └── students.js       ← Student listing
│   └── utils/email.js        ← Low attendance email alerts
│
└── frontend/
    └── src/
        ├── pages/
        │   ├── Login.jsx
        │   └── teacher/
        │       ├── TeacherDashboard.jsx
        │       ├── MarkAttendance.jsx
        │       ├── TeacherAnalytics.jsx
        │       ├── TeacherStudents.jsx
        │       └── ImportCSV.jsx
        └── App.jsx            ← Teacher-only routes
```

---

## ❓ Troubleshooting

**"Invalid credentials" on login**
→ You haven't run `node seed.js` yet. Run it, then try again.

**"Firebase not initialized" error**
→ Check that `backend/.env` exists and has the correct FIREBASE_* values.

**Frontend shows blank / crashes**
→ Make sure the backend is running on port 5000 before starting the frontend.

**Port 5000 already in use**
→ Change `PORT=5001` in `backend/.env` and update `frontend/.env` to `REACT_APP_API_URL=http://localhost:5001`

---

## 📄 Face Recognition CSV Format
Your Python script should export:
```
Name,Date,Time,Status
Arjun Mehta,2024-03-15,09:05:00,Present
Sneha Patel,2024-03-15,09:07:00,Absent
```
Upload via **Import CSV** page. Names are matched against the student database.
