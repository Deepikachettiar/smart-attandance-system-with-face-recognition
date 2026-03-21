import serial
import cv2
import face_recognition
import os
import numpy as np
import time
from datetime import datetime

# -------- SETTINGS --------
SERIAL_PORT = 'COM7'   # change if needed
BAUD_RATE = 115200
CAMERA_INDEX = 1       # 1 = external webcam, 0 = laptop cam
DATASET_PATH = 'dataset'
ATTENDANCE_FILE = 'Attendance.csv'

# Sensor conditions
IR_TRIGGER_VALUE = 0          # change to 1 if your IR works opposite
MIN_DISTANCE = 20             # cm
MAX_DISTANCE = 80             # cm
LDR_LIGHT_THRESHOLD = 2000    # dark = high, light = low in your setup

# -------- SERIAL SETUP --------
ser = serial.Serial(SERIAL_PORT, BAUD_RATE, timeout=1)
print("Connected to ESP32...")
time.sleep(2)               # wait for ESP32 reboot
ser.reset_input_buffer()    # clear boot messages

# -------- LOAD KNOWN FACES --------
images = []
classNames = []

if not os.path.exists(DATASET_PATH):
    raise FileNotFoundError(f"Dataset folder not found: {DATASET_PATH}")

for person_name in os.listdir(DATASET_PATH):
    person_folder = os.path.join(DATASET_PATH, person_name)

    if os.path.isdir(person_folder):
        for img_name in os.listdir(person_folder):
            img_path = os.path.join(person_folder, img_name)

            img = cv2.imread(img_path)
            if img is not None:
                images.append(img)
                classNames.append(person_name)
            else:
                print(f"Could not read image: {img_path}")

if len(images) == 0:
    raise ValueError("No valid images found in dataset folder.")

def findEncodings(images, names):
    encodeList = []
    validNames = []

    for i, img in enumerate(images):
        try:
            rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
            encodings = face_recognition.face_encodings(rgb_img)

            if len(encodings) > 0:
                encodeList.append(encodings[0])
                validNames.append(names[i])
            else:
                print(f"No face found in image for {names[i]}")
        except Exception as e:
            print(f"Encoding error for {names[i]}: {e}")

    return encodeList, validNames

encodeListKnown, classNames = findEncodings(images, classNames)

if len(encodeListKnown) == 0:
    raise ValueError("No valid face encodings could be created from dataset images.")

print("Encoding Complete")

# -------- ATTENDANCE --------
def markAttendance(name):
    if not os.path.exists(ATTENDANCE_FILE):
        with open(ATTENDANCE_FILE, 'w') as f:
            f.write("Name,Time\n")

    with open(ATTENDANCE_FILE, 'r+') as f:
        data = f.readlines()
        nameList = [line.split(',')[0].strip() for line in data[1:] if ',' in line]

        if name not in nameList:
            now = datetime.now()
            time_now = now.strftime('%H:%M:%S')
            f.write(f"{name},{time_now}\n")
            print(f"Attendance marked for {name}")
            return True

    print(f"{name} already marked present")
    return False

# -------- CAMERA --------
cap = cv2.VideoCapture(CAMERA_INDEX)

if not cap.isOpened():
    raise RuntimeError(f"Could not open camera at index {CAMERA_INDEX}")

print("System running...")
print("Press Q in camera window to quit")

# -------- MAIN LOOP --------
while True:
    try:
        data = ser.readline().decode(errors='ignore').strip()

        if not data:
            continue

        if not data.startswith("IR:"):
            continue

        print("Sensor Data:", data)

        parts = data.split(',')
        ir = int(parts[0].split(':')[1])
        dist = float(parts[1].split(':')[1])
        ldr = int(parts[2].split(':')[1])

        # -------- CONDITIONS --------
        if ir == IR_TRIGGER_VALUE and MIN_DISTANCE < dist < MAX_DISTANCE and ldr < LDR_LIGHT_THRESHOLD:
            print("Conditions OK -> Running face recognition")

            success, img = cap.read()
            if not success:
                print("Could not read from camera")
                ser.write(b"ERROR\n")
                continue

            imgS = cv2.resize(img, (0, 0), None, 0.25, 0.25)
            imgS = cv2.cvtColor(imgS, cv2.COLOR_BGR2RGB)

            facesCurFrame = face_recognition.face_locations(imgS)
            encodesCurFrame = face_recognition.face_encodings(imgS, facesCurFrame)

            if len(encodesCurFrame) == 0:
                print("No face detected")
                ser.write(b"ERROR\n")
                cv2.imshow("Attendance System", img)
            else:
                recognized_anyone = False

                for encodeFace, faceLoc in zip(encodesCurFrame, facesCurFrame):
                    matches = face_recognition.compare_faces(encodeListKnown, encodeFace)
                    faceDis = face_recognition.face_distance(encodeListKnown, encodeFace)

                    if len(faceDis) == 0:
                        continue

                    matchIndex = np.argmin(faceDis)

                    top, right, bottom, left = faceLoc
                    top *= 4
                    right *= 4
                    bottom *= 4
                    left *= 4

                    if matches[matchIndex]:
                        name = classNames[matchIndex].upper()
                        recognized_anyone = True

                        cv2.rectangle(img, (left, top), (right, bottom), (0, 255, 0), 2)
                        cv2.rectangle(img, (left, bottom - 35), (right, bottom), (0, 255, 0), cv2.FILLED)
                        cv2.putText(img, name, (left + 6, bottom - 6),
                                    cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 2)

                        markAttendance(name)
                        print("Recognized:", name)
                    else:
                        cv2.rectangle(img, (left, top), (right, bottom), (0, 0, 255), 2)
                        cv2.rectangle(img, (left, bottom - 35), (right, bottom), (0, 0, 255), cv2.FILLED)
                        cv2.putText(img, "UNKNOWN", (left + 6, bottom - 6),
                                    cv2.FONT_HERSHEY_COMPLEX, 1, (255, 255, 255), 2)

                if recognized_anyone:
                    ser.write(b"SUCCESS\n")
                else:
                    print("Unknown person")
                    ser.write(b"ERROR\n")

                cv2.imshow("Attendance System", img)

        else:
            print(f"Conditions NOT met -> IR={ir}, DIST={dist:.2f}, LDR={ldr}")
            # leave this commented to avoid continuous buzzer beeping all the time
            # ser.write(b"ERROR\n")

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    except KeyboardInterrupt:
        print("Stopped by user")
        break
    except Exception as e:
        print("Error:", e)

cap.release()
cv2.destroyAllWindows()
ser.close()
print("Program closed")