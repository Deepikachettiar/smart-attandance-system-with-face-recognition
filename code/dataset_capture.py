import cv2
import os

name = input("Enter student name: ").strip()

base_dir = os.path.dirname(os.path.dirname(__file__))
dataset_path = os.path.join(base_dir, "dataset", name)

os.makedirs(dataset_path, exist_ok=True)

cap = cv2.VideoCapture(1)
count = 0

print("Press 'c' to capture image")
print("Press 'q' to quit")

while True:
    ret, frame = cap.read()

    if not ret:
        print("Camera not working")
        break

    cv2.imshow("Capture Faces", frame)

    key = cv2.waitKey(1) & 0xFF

    if key == ord('c'):
        img_path = os.path.join(dataset_path, f"{count}.jpg")
        cv2.imwrite(img_path, frame)
        print(f"Saved: {img_path}")
        count += 1

    elif key == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()