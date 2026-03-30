import os
import cv2
import face_recognition
import numpy as np
import threading
import base64
import time
import serial
from datetime import datetime
from flask import Flask, jsonify, request
from flask_cors import CORS
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '.env'))

app = Flask(__name__)

# === CORS CONFIGURATION ===
CORS(app, resources={r"/*": {
    "origins": "*",
    "supports_credentials": True,
    "allow_headers": ["Content-Type", "Authorization", "Accept"],
    "methods": ["GET", "POST", "OPTIONS"],
    "expose_headers": ["Content-Type", "Authorization"]
}})

@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Authorization,Accept')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

# === FIREBASE ===
_fb_cred = credentials.Certificate({
    "type": "service_account",
    "project_id": os.getenv("FIREBASE_PROJECT_ID"),
    "client_email": os.getenv("FIREBASE_CLIENT_EMAIL"),
    "private_key": os.getenv("FIREBASE_PRIVATE_KEY", "").replace("\\n", "\n"),
    "token_uri": "https://oauth2.googleapis.com/token",
})

if not firebase_admin._apps:
    firebase_admin.initialize_app(_fb_cred)

db = firestore.client()

# === SETTINGS ===
SERIAL_PORT = os.getenv("SERIAL_PORT", "COM7")
BAUD_RATE = int(os.getenv("BAUD_RATE", "115200"))
CAMERA_INDEX = int(os.getenv("CAMERA_INDEX", "1"))

IR_TRIGGER_VALUE = int(os.getenv("IR_TRIGGER_VALUE", "0"))
MIN_DISTANCE = float(os.getenv("MIN_DISTANCE", "15"))
MAX_DISTANCE = float(os.getenv("MAX_DISTANCE", "80"))
LDR_LIGHT_THRESHOLD = int(os.getenv("LDR_LIGHT_THRESHOLD", "2000"))

DATASET_PATH = os.getenv("DATASET_PATH", os.path.join(os.path.dirname(__file__), "dataset"))

# === GLOBAL STATE ===
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


# === LOAD ENCODINGS ===
def load_encodings():
    global known_encodings, known_students
    known_encodings = []
    known_students = []

    print("[FACES] Loading encodings from dataset...")
    all_students = {}

    # Firebase optional
    try:
        studs = db.collection("users").where(
            filter=firestore.FieldFilter("role", "==", "student")
        ).stream()

        for d in studs:
            doc = d.to_dict()
            sid = str(doc.get("studentId", "")).strip().upper()
            if sid:
                all_students[sid] = {"id": d.id, **doc}

        print(f"[FACES] Firebase students loaded: {len(all_students)}")
    except Exception as e:
        print(f"[FACES] Firebase unavailable, continuing with dataset only: {e}")

    if not os.path.exists(DATASET_PATH):
        print(f"[FACES] Dataset path not found: {DATASET_PATH}")
        return

    for student_id in os.listdir(DATASET_PATH):
        folder = os.path.join(DATASET_PATH, student_id)
        if not os.path.isdir(folder):
            continue

        student_id_clean = student_id.strip().upper()

        student = all_students.get(student_id_clean, {
            "id": None,
            "name": student_id_clean,
            "studentId": student_id_clean
        })

        loaded_for_this_student = 0

        for img_file in os.listdir(folder):
            if not img_file.lower().endswith((".jpg", ".jpeg", ".png")):
                continue

            path = os.path.join(folder, img_file)
            img = cv2.imread(path)
            if img is None:
                print(f"[FACES] Skipped unreadable image: {path}")
                continue

            rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            encodings = face_recognition.face_encodings(rgb)

            if not encodings:
                print(f"[FACES] No face found in: {path}")
                continue

            known_encodings.append(encodings[0])
            known_students.append(student)
            loaded_for_this_student += 1

        if loaded_for_this_student > 0:
            print(f"[FACES] Loaded {loaded_for_this_student} encoding(s) for {student_id_clean} - {student.get('name')}")

    print(f"[FACES] Total encodings loaded: {len(known_encodings)}")


# === MARK ATTENDANCE IN FIREBASE ===
def mark_in_firebase(student):
    if not student.get("id"):
        print(f"[ATTENDANCE] Dataset-only student marked locally: {student.get('studentId')}")
        return

    try:
        now = datetime.now()
        db.collection("attendance").add({
            "studentId": student["id"],
            "studentName": student.get("name"),
            "studentRollNo": student.get("studentId"),
            "subjectId": None,
            "subjectName": None,
            "subjectCode": None,
            "date": now.strftime("%Y-%m-%d"),
            "time": now.isoformat(),
            "status": "Present",
            "method": "face_recognition",
            "markedBy": "system",
            "updatedAt": now,
        })
    except Exception as e:
        print(f"[ATTENDANCE] Firebase write failed: {e}")


# === RECOGNITION WORKER ===
def worker():
    cap = cv2.VideoCapture(CAMERA_INDEX, cv2.CAP_DSHOW)
    if not cap.isOpened():
        state["message"] = f"Failed to open camera index {CAMERA_INDEX}"
        state["error"] = state["message"]
        state["running"] = False
        print("[CAMERA]", state["message"])
        return

    try:
        ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
    except Exception as e:
        state["message"] = f"Failed to open serial port: {e}"
        state["error"] = state["message"]
        state["running"] = False
        print("[SERIAL]", state["message"])
        cap.release()
        return

    time.sleep(2)
    ser.reset_input_buffer()

    marked_ids = set()

    while not stop_event.is_set():
        try:
            data = ser.readline().decode(errors="ignore").strip()

            if not data.startswith("IR:"):
                continue

            parts = data.split(',')

            if len(parts) < 3:
                continue

            ir = int(parts[0].split(':')[1])
            dist = float(parts[1].split(':')[1])
            ldr = int(parts[2].split(':')[1])

            if ir == IR_TRIGGER_VALUE and MIN_DISTANCE < dist < MAX_DISTANCE and ldr < LDR_LIGHT_THRESHOLD:
                ret, img = cap.read()

                if not ret:
                    state["message"] = "Camera frame capture failed"
                    continue

                display_img = img.copy()
                small = cv2.resize(img, (0, 0), None, 0.25, 0.25)
                small_rgb = cv2.cvtColor(small, cv2.COLOR_BGR2RGB)

                faces = face_recognition.face_locations(small_rgb)
                encs = face_recognition.face_encodings(small_rgb, faces)

                state["message"] = f"Detecting... {len(faces)} face(s) found"

                recognized_this_frame = False

                for encFace, loc in zip(encs, faces):
                    if len(known_encodings) == 0:
                        continue

                    matches = face_recognition.compare_faces(known_encodings, encFace, tolerance=0.5)
                    dista = face_recognition.face_distance(known_encodings, encFace)

                    if len(dista) == 0:
                        continue

                    idx = np.argmin(dista)

                    if matches[idx]:
                        student = known_students[idx]
                        unique_id = student.get("id") or student.get("studentId")

                        if unique_id and unique_id not in marked_ids:
                            marked_ids.add(unique_id)
                            mark_in_firebase(student)

                            state["marked"].append({
                                "studentId": unique_id,
                                "name": student.get("name"),
                                "rollNo": student.get("studentId"),
                                "time": datetime.now().strftime("%H:%M:%S")
                            })

                            ser.write(b"SUCCESS\n")
                            recognized_this_frame = True

                            top, right, bottom, left = [i * 4 for i in loc]
                            cv2.rectangle(display_img, (left, top), (right, bottom), (0, 255, 0), 3)
                            cv2.putText(
                                display_img,
                                student.get("name", "Unknown"),
                                (left, top - 10),
                                cv2.FONT_HERSHEY_SIMPLEX,
                                0.9,
                                (0, 255, 0),
                                2
                            )

                if not recognized_this_frame:
                    if len(faces) > 0:
                        ser.write(b"ERROR\n")
                        state["message"] = "Face detected but not recognized"
                    else:
                        state["message"] = "No face detected"

                success, buffer = cv2.imencode('.jpg', display_img, [cv2.IMWRITE_JPEG_QUALITY, 70])
                if success:
                    state["frame_b64"] = base64.b64encode(buffer).decode('utf-8')

            else:
                ser.write(b"STOP\n")

        except Exception as e:
            print("[ERROR]", e)
            state["message"] = f"Worker error: {e}"

    cap.release()
    ser.close()


# === API ROUTES ===
@app.route("/api/face/start", methods=["POST"])
def start():
    if state["running"]:
        return jsonify({"error": "Already running"}), 400

    try:
        load_encodings()
    except Exception as e:
        state["error"] = str(e)
        state["message"] = f"Failed to load encodings: {e}"
        return jsonify({"error": state["message"]}), 500

    if len(known_encodings) == 0:
        return jsonify({"error": "No face encodings loaded. Check dataset folder images."}), 400

    state["running"] = True
    state["marked"] = []
    state["frame_b64"] = None
    state["message"] = "Session started - Waiting for sensor trigger..."
    state["error"] = None

    stop_event.clear()
    threading.Thread(target=worker, daemon=True).start()

    return jsonify({
        "success": True,
        "message": "Face recognition started",
        "encodings_loaded": len(known_encodings)
    })


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
        "serial_port": SERIAL_PORT,
        "camera_index": CAMERA_INDEX,
        "dataset_path": DATASET_PATH,
        "error": state["error"],
        "message": state["message"]
    })


if __name__ == "__main__":
    print("\n🚀 AttendAI Face Recognition Service running on http://localhost:5001\n")
    app.run(host="0.0.0.0", port=5001, debug=False)