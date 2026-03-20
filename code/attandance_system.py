import cv2
import face_recognition
import os
import numpy as np
import pandas as pd
from datetime import datetime

# Base folders
base_dir = os.path.dirname(os.path.dirname(__file__))
dataset_dir = os.path.join(base_dir, "dataset")
attendance_dir = os.path.join(base_dir, "attendance")

os.makedirs(attendance_dir, exist_ok=True)

# Create today's attendance file
today_date = datetime.now().strftime("%d-%m-%Y")
attendance_file = os.path.join(attendance_dir, f"attendance_{today_date}.csv")

if not os.path.exists(attendance_file):
    df = pd.DataFrame(columns=["Name", "Date", "Time", "Status"])
    df.to_csv(attendance_file, index=False)

known_face_encodings = []
known_face_names = []

print("Loading dataset...")

# Load all known face images and create encodings
for person_name in os.listdir(dataset_dir):
    person_path = os.path.join(dataset_dir, person_name)

    if os.path.isdir(person_path):
        for image_name in os.listdir(person_path):
            image_path = os.path.join(person_path, image_name)

            try:
                image = face_recognition.load_image_file(image_path)
                encodings = face_recognition.face_encodings(image)

                if len(encodings) > 0:
                    known_face_encodings.append(encodings[0])
                    known_face_names.append(person_name)
                    print(f"Loaded: {person_name} - {image_name}")
                else:
                    print(f"No face found in {image_path}")

            except Exception as e:
                print(f"Error loading {image_path}: {e}")

print("Dataset loaded successfully.")

# Read names already marked today
attendance_df = pd.read_csv(attendance_file)
marked_names = set(attendance_df["Name"].tolist())

# Try external webcam first
cap = cv2.VideoCapture(1)

# If external webcam doesn't open, fallback to laptop camera
if not cap.isOpened():
    print("External webcam not found. Switching to default camera...")
    cap = cv2.VideoCapture(0)

print("Starting attendance system...")
print("Press 'q' to quit")

while True:
    ret, frame = cap.read()

    if not ret:
        print("Camera not working")
        break

    # Resize frame for faster processing
    small_frame = cv2.resize(frame, (0, 0), fx=0.25, fy=0.25)
    rgb_small_frame = cv2.cvtColor(small_frame, cv2.COLOR_BGR2RGB)

    # Detect face locations and encodings
    face_locations = face_recognition.face_locations(rgb_small_frame)
    face_encodings = face_recognition.face_encodings(rgb_small_frame, face_locations)

    for face_encoding, face_location in zip(face_encodings, face_locations):
        matches = face_recognition.compare_faces(
            known_face_encodings, face_encoding, tolerance=0.5
        )
        face_distances = face_recognition.face_distance(
            known_face_encodings, face_encoding
        )

        name = "Unknown"

        if len(face_distances) > 0:
            best_match_index = np.argmin(face_distances)
            if matches[best_match_index]:
                name = known_face_names[best_match_index]

        # Scale face coordinates back to original frame size
        top, right, bottom, left = face_location
        top *= 4
        right *= 4
        bottom *= 4
        left *= 4

        # Draw rectangle around face
        cv2.rectangle(frame, (left, top), (right, bottom), (0, 255, 0), 2)

        # Draw name label
        cv2.rectangle(frame, (left, bottom - 35), (right, bottom), (0, 255, 0), cv2.FILLED)
        cv2.putText(
            frame,
            name,
            (left + 6, bottom - 8),
            cv2.FONT_HERSHEY_SIMPLEX,
            0.8,
            (255, 255, 255),
            2
        )

        # Mark attendance only once per day
        if name != "Unknown" and name not in marked_names:
            now = datetime.now()
            new_entry = pd.DataFrame([{
                "Name": name,
                "Date": now.strftime("%d-%m-%Y"),
                "Time": now.strftime("%H:%M:%S"),
                "Status": "Present"
            }])

            new_entry.to_csv(attendance_file, mode="a", header=False, index=False)
            marked_names.add(name)
            print(f"Attendance marked for {name}")

    cv2.imshow("Automatic Attendance System", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()