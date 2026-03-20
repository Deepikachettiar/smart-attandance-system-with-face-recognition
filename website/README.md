# AttendAI — Smart Face Recognition Attendance System

A full-stack attendance management system with AI face recognition integration, built with **React + Tailwind** (frontend) and **Node.js + Express + Firebase** (backend).

---

## 📁 Project Structure

```
attendance-system/
├── backend/                     # Node.js + Express + Firebase
│   ├── config/
│   │   └── firebase.js          # Firebase Admin SDK setup
│   ├── middleware/
│   │   └── auth.js              # JWT authentication middleware
│   ├── routes/
│   │   ├── auth.js              # Login / Register
│   │   ├── attendance.js        # All attendance CRUD + CSV import/export
│   │   └── students.js          # Student listing
│   ├── utils/
│   │   └── email.js             # Nodemailer – low attendance alerts
│   ├── seed.js                  # Populate Firebase with demo data
│   ├── server.js                # Express entry point
│   ├── package.json
│   └── .env.example             # ← Copy to .env and fill in values
│
├── frontend/                    # React 18 + Tailwind CSS
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   └── Sidebar.jsx      # Shared navigation
│   │   ├── context/
│   │   │   └── AuthContext.jsx  # Global auth state
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── student/
│   │   │   │   ├── StudentDashboard.jsx
│   │   │   │   └── StudentAttendance.jsx
│   │   │   └── teacher/
│   │   │       ├── TeacherDashboard.jsx
│   │   │       ├── MarkAttendance.jsx   # Manual override per student
│   │   │       ├── TeacherAnalytics.jsx # Charts + export
│   │   │       ├── TeacherStudents.jsx
│   │   │       └── ImportCSV.jsx        # Face-recognition CSV importer
│   │   ├── utils/
│   │   │   └── api.js           # Axios API helpers
│   │   ├── App.jsx              # Router + protected routes
│   │   ├── index.js
│   │   └── index.css            # Global design tokens + utility classes
│   ├── tailwind.config.js
│   ├── package.json
│   └── .env
│
└── README.md
```

---

## ⚙️ Setup — Step by Step

### 1. Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com) → Create project
2. Enable **Firestore Database** (start in test mode for dev)
3. Go to **Project Settings → Service Accounts → Generate new private key**
4. Download the JSON file — you'll need `project_id`, `client_email`, and `private_key`

### 2. Backend Setup

```bash
cd backend
cp .env.example .env
# Fill in your Firebase credentials and other values in .env
npm install
node seed.js        # Populate Firebase with demo data (run once)
npm run dev         # Start dev server on http://localhost:5000
```

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start           # Start React on http://localhost:3000
```

---

## 🔑 Demo Credentials (after running seed.js)

| Role    | Email                  | Password    |
|---------|------------------------|-------------|
| Teacher | teacher@school.edu     | teacher123  |
| Student | arjun@student.edu      | student123  |
| Student | sneha@student.edu      | student123  |
| Student | vikram@student.edu     | student123  |

---

## 🌟 Features

### Student Portal
- Dashboard with overall & per-subject attendance %
- Radial progress rings with colour-coded risk indicators
- Detailed records table with date/time/method filters
- Export personal attendance as CSV

### Teacher Portal
- Dashboard with KPIs: subjects, students, sessions, avg attendance
- **Mark Attendance** — select subject + date → see full class list → click Present/Absent/Late per student → Save all (bulk Firebase write). Manual override with reset button.
- **Analytics** — Bar charts, pie charts, line trend, distribution histogram, per-student progress bars, at-risk flagging. Export date-range CSV.
- **Students** — Searchable student directory
- **Import CSV** — Drag-and-drop CSV uploader that reads face-recognition output (Name, Date, Time, Status), previews data, matches by name, and saves to Firebase. Shows unmatched names.

### System Features
- JWT authentication (24h tokens)
- Role-based protected routes
- Firebase Firestore as database
- Email alerts via Nodemailer when a student drops below 75% attendance
- CSV export for any subject/date range

---

## 📄 Face Recognition CSV Integration

Your Python script (OpenCV + face_recognition) should export a CSV with these columns:

```
Name,Date,Time,Status
Arjun Mehta,2024-03-15,09:05:00,Present
Sneha Patel,2024-03-15,09:07:00,Present
Vikram Singh,2024-03-15,,Absent
```

Upload this file via **Teacher → Import CSV**, select the subject and date, preview, then import. The system matches students by name.

---

## 🛠️ Tech Stack

| Layer    | Technology                          |
|----------|-------------------------------------|
| Frontend | React 18, React Router v6, Tailwind CSS, Recharts, Lucide Icons |
| Backend  | Node.js, Express 4                  |
| Database | Firebase Firestore                  |
| Auth     | JWT (jsonwebtoken) + bcryptjs       |
| Email    | Nodemailer (Gmail SMTP)             |
| Charts   | Recharts                            |

---

## 📧 Email Alerts Setup (Optional)

1. Enable 2FA on your Gmail account
2. Go to **Google Account → Security → App Passwords**
3. Generate an app password for "Mail"
4. Add to `.env`:
   ```
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_PASS=your-16-char-app-password
   ```

Alerts fire automatically when a student's attendance in any subject drops below the threshold (default 75%).
