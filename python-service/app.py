import os
import cv2
import face_recognition
import numpy as np
import threading
import base64
import time
import serial   # ← This was missing
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# ── Firebase ─────────────────────────────────────────────
try:
    cred = credentials.Certificate({
        "type": "service_account",
        "project_id": os.getenv("FIREBASE_PROJECT_ID"),
        "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
        "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
        "token_uri": "https://oauth2.googleapis.com/token",
    })
    firebase_admin.initialize_app(cred)
    db = firestore.client()
    print("✅ Firebase connected successfully")
except Exception as e:
    print("❌ Firebase connection failed:", e)
    db = None

# ── Settings ─────────────────────────────────────────────
SERIAL_PORT = os.getenv("SERIAL_PORT", "COM7")
BAUD_RATE = int(os.getenv("BAUD_RATE", "115200"))
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "1"))

IR_TRIGGER_VALUE = int(os.getenv("IR_TRIGGER_VALUE", "0"))
MIN_DISTANCE = float(os.getenv("MIN_DISTANCE", "15"))
MAX_DISTANCE = float(os.getenv("MAX_DISTANCE", "80"))
LDR_LIGHT_THRESHOLD = int(os.getenv("LDR_LIGHT_THRESHOLD", "2000"))

DATASET_PATH = os.getenv("DATASET_PATH", os.path.join(os.path.dirname(__file__), "dataset"))

# ── Global State ─────────────────────────────────────────
state = {
    "running": False,
    "marked": [],
    "frame_b64": None,
    "message": "Idle",
    "error": None,
}

known_encodings = []
known_students = []
stop_event = threading.Event()

# ── Load Encodings ───────────────────────────────────────
def load_encodings():
    global known_encodings, known_students
    known_encodings = []
    known_students = []

    print("[FACES] Loading encodings from Firebase + dataset...")

    if db is None:
        print("[FACES] Error: Firestore not initialized")
        return 0

    try:
        all_students = {}
        studs = db.collection("users").where("role", "==", "student").stream()
        for d in studs:
            doc = d.to_dict()
            sid = str(doc.get("studentId", "")).upper()
            all_students[sid] = {"id": d.id, **doc}

        count = 0
        for student_id in os.listdir(DATASET_PATH):
            folder = os.path.join(DATASET_PATH, student_id)
            if not os.path.isdir(folder):
                continue
            student_id = student_id.upper()

            for img_file in os.listdir(folder):
                if not img_file.lower().endswith(('.jpg', '.png', '.jpeg')):
                    continue
                path = os.path.join(folder, img_file)
                img = cv2.imread(path)
                if img is None:
                    continue
                rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                enc = face_recognition.face_encodings(rgb)
                if not enc:
                    continue

                student = all_students.get(student_id, {"id": None, "name": student_id, "studentId": student_id})
                known_encodings.append(enc[0])
                known_students.append(student)
                count += 1
                print(f"[FACES] Loaded: {student_id} - {student.get('name')}")

        print(f"[FACES] Total encodings loaded: {count}")
        return count
    except Exception as e:
        print("[FACES] Error loading encodings:", str(e))
        return 0

# ── Mark in Firebase ─────────────────────────────────────
def mark_in_firebase(student):
    if not student.get("id") or db is None:
        return
    now = datetime.now()
    db.collection("attendance").add({
        "studentId": student["id"],
        "studentName": student.get("name"),
        "studentRollNo": student.get("studentId"),
        "date": now.strftime("%Y-%m-%d"),
        "time": now.isoformat(),
        "status": "Present",
        "method": "face_recognition",
        "markedBy": "system",
        "updatedAt": now,
    })

# ── Recognition Worker ───────────────────────────────────
def worker():
    try:
        cap = cv2.VideoCapture(CAMERA_INDEX)
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
        time.sleep(2)
        ser.reset_input_buffer()

        marked_ids = set()

        while not stop_event.is_set():
            data = ser.readline().decode(errors="ignore").strip()
            if not data.startswith("IR:"):
                continue

            try:
                parts = data.split(',')
                ir = int(parts[0].split(':')[1])
                dist = float(parts[1].split(':')[1])
                ldr = int(parts[2].split(':')[1])

                # Update sensor values live
                state["message"] = f"IR:{ir} | Dist:{dist:.1f}cm | LDR:{ldr}"

                if ir == IR_TRIGGER_VALUE and MIN_DISTANCE < dist < MAX_DISTANCE and ldr < LDR_LIGHT_THRESHOLD:
                    ret, img = cap.read()
                    if not ret:
                        continue

                    display_img = img.copy()
                    small = cv2.resize(img, (0,0), None, 0.25, 0.25)
                    small_rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

                    faces = face_recognition.face_locations(small_rgb)
                    encs = face_recognition.face_encodings(small_rgb, faces)

                    for encFace, loc in zip(encs, faces):
                        matches = face_recognition.compare_faces(known_encodings, encFace, tolerance=0.5)
                        dista = face_recognition.face_distance(known_encodings, encFace)
                        if len(dista) == 0:
                            continue
                        idx = np.argmin(dista)
                        if matches[idx]:
                            student = known_students[idx]
                            sid = student.get("id")
                            if sid and sid not in marked_ids:
                                marked_ids.add(sid)
                                mark_in_firebase(student)
                                state["marked"].append({
                                    "studentId": sid,
                                    "name": student.get("name"),
                                    "rollNo": student.get("studentId"),
                                    "time": datetime.now().strftime("%H:%M:%S")
                                })
                                ser.write(b"SUCCESS\n")

                                top, right, bottom, left = [i*4 for i in loc]
                                cv2.rectangle(display_img, (left, top), (right, bottom), (0, 255, 0), 3)
                                cv2.putText(display_img, student.get("name", "Unknown"), 
                                          (left, top-10), cv2.FONT_HERSHEY_SIMPLEX, 0.9, (0, 255, 0), 2)

                    _, buffer = cv2.imencode('.jpg', display_img, [cv2.IMWRITE_JPEG_QUALITY, 70])
                    state["frame_b64"] = base64.b64encode(buffer).decode('utf-8')

                else:
                    ser.write(b"STOP\n")

            except Exception as e:
                print("[SENSOR ERROR]", e)
                state["message"] = f"Sensor error: {str(e)}"

        cap.release()
        ser.close()

    except Exception as e:
        print("[WORKER CRITICAL ERROR]", e)
        state["message"] = f"Critical error: {str(e)}"
        state["error"] = str(e)

# ── Routes ───────────────────────────────────────────────
@app.route("/api/face/start", methods=["POST"])
def start():
    if state["running"]:
        return jsonify({"error": "Already running"}), 400

    load_encodings()

    if len(known_encodings) == 0:
        return jsonify({"error": "No face encodings loaded. Check dataset folder."}), 400

    state["running"] = True
    state["marked"] = []
    state["frame_b64"] = None
    state["message"] = "Session started - Waiting for sensor trigger..."
    state["error"] = None

    stop_event.clear()
    threading.Thread(target=worker, daemon=True).start()

    return jsonify({"success": True, "message": "Face recognition started"})


@app.route("/api/face/stop", methods=["POST"])
def stop():
    stop_event.set()
    state["running"] = False
    state["message"] = "Session stopped"
    return jsonify({"success": True})


@app.route("/api/face/status", methods=["GET"])
def status():
    return jsonify(state)


@app.route("/api/face/health", methods=["GET"])
def health():
    return jsonify({
        "status": "ok",
        "running": state["running"],
        "encodings_loaded": len(known_encodings),
        "message": "Python service is running"
    })


if __name__ == "__main__":
    print("\n🚀 AttendAI Face Recognition Service running on http://localhost:5001")
    app.run(port=5001, debug=False, use_reloader=False)