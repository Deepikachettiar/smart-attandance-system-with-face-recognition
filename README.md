<<<<<<< HEAD
# AttendAI — Smart Attendance System with Face Recognition

## How it works
1. Teacher opens portal → selects subject + date → clicks **"Take Attendance"**
2. React frontend calls Python service on `localhost:5001`
3. Python service starts reading ESP32 sensor data via serial
4. When IR sensor detects a student at the right distance, webcam captures their face
5. `face_recognition` matches the face against `dataset/` images
6. Matched student is written **directly to Firebase Firestore**
7. Portal polls every second and shows live results + webcam feed
8. Teacher can also manually override any student's status

---

## Project Structure
```
attendance-system/
├── backend/           Node.js + Express + Firebase Admin
├── frontend/          React + Tailwind
└── python-service/    Flask + face_recognition + pyserial
    ├── app.py         Main service
    ├── .env           Firebase + hardware config
    ├── requirements.txt
    └── dataset/       ← PUT STUDENT FACE IMAGES HERE
        ├── CS2021001.jpg
        ├── CS2021002.jpg
        └── ...
```

---

## Setup (run all 3 services)

### 1. Backend
```bash
cd backend
npm install
node seed.js      # run once to populate Firebase
npm run dev       # http://localhost:5000
```

### 2. Frontend
```bash
cd frontend
npm install
npm start         # http://localhost:3000
```

### 3. Python Face Recognition Service
```bash
cd python-service

# Install dependencies (once)
pip install -r requirements.txt

# Add student face images
# Copy your images to dataset/ folder
# Name them by Roll No:  CS2021001.jpg, CS2021002.jpg ...

# Edit .env if needed (serial port, camera index)

# Start service
python app.py     # http://localhost:5001
```

---

## Hardware Setup
- ESP32 connected via USB → set `SERIAL_PORT` in `python-service/.env`
- Webcam → set `CAMERA_INDEX` (1 = external, 0 = laptop)
- Sensor output format expected: `IR:0,DIST:45.2,LDR:1800`

---

## Login
- Email: `teacher@school.edu`
- Password: `teacher123`

---

## Student Face Images
Place in `python-service/dataset/` named by roll number:
```
dataset/
├── CS2021001.jpg   ← Arjun Mehta
├── CS2021002.jpg   ← Sneha Patel
└── ...
```
Roll numbers must match the `studentId` field in Firebase Firestore `users` collection.

---

## Changing Serial Port
Edit `python-service/.env`:
```
SERIAL_PORT=COM7    # Windows
SERIAL_PORT=/dev/ttyUSB0   # Linux/Mac
```
=======
# smart-attandance-system-with-face-recognition
>>>>>>> 04b51abc67847df332d7bd623b0eaa6fe62f16c5
