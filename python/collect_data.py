print("collect_data.py STARTED")

import cv2
import mediapipe as mp
import pandas as pd
import os
import time
import math

from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# Settings

DATASET_DIR = "../dataset-test"
MODEL_PATH = "../hand_landmarker.task"

CAMERA_WIDTH = 1280
CAMERA_HEIGHT = 720

CAPTURE_COOLDOWN = 0.10     # Time between automatic captures after pressing [SPACE] 

MAX_HANDS = 2

MIN_HAND_DETECTION_CONFIDENCE = 0.60
MIN_HAND_PRESENCE_CONFIDENCE = 0.60
MIN_TRACKING_CONFIDENCE = 0.60


# Check Model

if not os.path.exists(MODEL_PATH):
    print()
    print("ERROR: Could not find hand_landmarker.task")
    print()
    print("Expected:")
    print(f"    {os.path.abspath(MODEL_PATH)}")
    print()
    print("Download the Hand Landmarker model and place it")
    print("next to collect_data.py.")
    print()
    raise SystemExit(1)


# MediaPipe 

BaseOptions = python.BaseOptions

options = vision.HandLandmarkerOptions(
    base_options=BaseOptions(
        model_asset_path=MODEL_PATH
    ),

    running_mode=vision.RunningMode.VIDEO,

    num_hands=MAX_HANDS,

    min_hand_detection_confidence=MIN_HAND_DETECTION_CONFIDENCE,

    min_hand_presence_confidence=MIN_HAND_PRESENCE_CONFIDENCE,

    min_tracking_confidence=MIN_TRACKING_CONFIDENCE
)

hand_landmarker = vision.HandLandmarker.create_from_options(options)


# Dataset

os.makedirs(DATASET_DIR, exist_ok=True)


# Landmark Helpers

def distance_3d(a, b):
    dx = a.x - b.x
    dy = a.y - b.y
    dz = a.z - b.z

    return math.sqrt(dx * dx + dy * dy + dz * dz)

def normalize_hand(hand_landmarks):
    """
    Normalize a hand relative to its wrist.

    This removes the hand's position in the camera frame and scales the landmarks based on hand size.
    """

    wrist = hand_landmarks[0]
    translated = []

    for point in hand_landmarks:
        translated.append([
            point.x - wrist.x,
            point.y - wrist.y,
            point.z - wrist.z
        ])
    
    max_distance = 0.0

    for point in translated:
        distance = math.sqrt(point[0] ** 2 + point[1] ** 2 + point[2] ** 2)
        
        max_distance = max(max_distance, distance)
        
    if max_distance == 0:
        max_distance = 1.0
    
    normalized = []

    for point in translated:
        normalized.extend([
            point[0] / max_distance,
            point[1] / max_distance,
            point[2] / max_distance
        ])
    
    return normalized

def empty_hand_features():
    """
    21 landmarks * 3 coordinates = 63 values.
    """
    
    return [0.0] * 63


# Feature Extraction

def extract_features(result):
    """
    Always return: 
        left_hand = 63 features
        right_hand = 63 features
    
    Total: 
        126 landmarks features
    
    Missing hands are represented by zeros.
    """

    left_hand = None
    right_hand = None

    if result.hand_landmarks:
        for i, hand_landmarks in enumerate(result.hand_landmarks):
            
            handedness = result.handedness[i][0]
            label = handedness.category_name

            if label == "Left":
                left_hand = hand_landmarks

            elif label == "Right":
                right_hand = hand_landmarks
                  
    if left_hand is not None:
        left_features = normalize_hand(left_hand)
    else:
        left_features = empty_hand_features()

    if right_hand is not None:
        right_features = normalize_hand(right_hand)
    else:
        right_features = empty_hand_features()
    
    return left_features + right_features


# CSV Columns

def create_columns():
    columns = ["label"]

    for i in range(21):
        columns.append(f"left_{i}_x")
        columns.append(f"left_{i}_y")
        columns.append(f"left_{i}_z")

    for i in range(21):
        columns.append(f"right_{i}_x")
        columns.append(f"right_{i}_y")
        columns.append(f"right_{i}_z")

    return columns

COLUMNS = create_columns()


# Save Sample

def save_sample(label, features):
    filename = os.path.join(DATASET_DIR, f"{label}.csv")

    row = [label] + features

    if not os.path.exists(filename):
        df = pd.DataFrame([row], columns=COLUMNS)

        df.to_csv(filename, index=False)

    else:
        df = pd.DataFrame([row], columns=COLUMNS)

        df.to_csv(filename, mode="a", header=False, index=False)


# UI

def draw_text(frame, text, position, scale=0.7, color=(255, 255, 255)):
    cv2.putText(
        frame,
        text,
        position,
        cv2.FONT_HERSHEY_SIMPLEX,
        scale,
        color,
        2,
        cv2.LINE_AA
    )

def draw_rect_alpha(frame, top_left, bottom_right, color, alpha=0.65):
    """
    Draw a transparent rectangle.
    """

    overlay = frame.copy()

    cv2.rectangle(overlay, top_left, bottom_right, color, -1)
    cv2.addWeighted(overlay, alpha, frame, 1 - alpha, 0, frame)

def draw_corner_brackets(frame, x, y, width, height, color=(0, 255, 255), thickness=2, length=25):
    """
    Draw corner brackets around a rectangle area.
    """

    # Top-Left
    cv2.line(frame, (x, y), (x + length, y), color, thickness)
    cv2.line(frame, (x, y), (x, y + length), color, thickness)

    # Top-Right
    cv2.line(frame, (x + width, y), (x + width - length, y), color, thickness) 
    cv2.line(frame, (x + width, y), (x + width, y + length), color, thickness)

    # Bottom-Left
    cv2.line(frame, (x, y + height), (x + length, y + height), color, thickness)
    cv2.line(frame, (x, y + height), (x, y + height - length), color, thickness)

    # Bottom-Right
    cv2.line(frame, (x + width, y + height), (x + width - length, y + height), color, thickness)
    cv2.line(frame, (x + width, y + height), (x + width, y + height - length), color, thickness)

def draw_hud(frame, label, capture_count, hands_detected):
    """
    HUD for the hand-sign data collector.
    """

    height, width = frame.shape[:2]

    # Colors

    CYAN = (255, 255, 0)
    YELLOW = (0, 255, 255)
    WHITE = (255, 255, 255)
    GREEN = (0, 255, 0)
    RED = (0, 0, 255)
    
    DARK = (15, 15, 15)
    DARKER = (8, 8, 8)

    # Outer HUD Frame

    draw_corner_brackets(
        frame,
        15,
        15,
        width - 30,
        height - 30,
        CYAN,
        2,
        25
    )

    # Top Header

    header_x = 25
    header_y = 25
    header_w = 430
    header_h = 75

    draw_rect_alpha(
        frame,
        (header_x, header_y),
        (header_x + header_w, header_y + header_h),
        DARKER,
        0.82
    )

    cv2.line(frame, (header_x, header_y + header_h), (header_x + header_w, header_y + header_h), CYAN, 2)

    draw_text(frame, "NINJA // HAND SIGN TRAINING", (header_x + 15, header_y + 32), 0.65, CYAN)
    draw_text(frame, "CHAKRA MOTION ANALYSIS SYSTEM", (header_x + 15, header_y + 58), 0.38, WHITE)

    # Current Sign Panel

    sign_w = 300
    sign_h = 75

    sign_x = width - sign_w - 25
    sign_y = 25

    draw_rect_alpha(
        frame,
        (sign_x, sign_y),
        (sign_x + sign_w, sign_y + sign_h),
        DARKER,
        0.82
    )

    cv2.line(frame, (sign_x, sign_y + sign_h), (sign_x + sign_w, sign_y + sign_h), YELLOW, 2)

    draw_text(frame, "CURRENT SIGN", (sign_x + 15, sign_y + 27), 0.38, WHITE)
    draw_text(frame, label.upper(), (sign_x + 15, sign_y + 57), 0.65, YELLOW)

    # Left Status

    status_x = 30
    status_y = 135

    if hands_detected:
        status_text = "● HAND DETECTED"
        status_color = GREEN

    else:
        status_text = "● WAITING FOR HAND"
        status_color = RED

    draw_text(frame, status_text, (status_x, status_y), 0.48, status_color)

    # Sample Counter
    
    counter_w = 210
    counter_h = 65

    counter_x = width - counter_w - 25
    counter_y = 120

    draw_rect_alpha(
        frame,
        (counter_x, counter_y),
        (counter_x + counter_w, counter_y + counter_h),
        DARKER,
        0.80
    )

    draw_text(frame, "SAMPLES", (counter_x + 12, counter_y + 23), 0.35, WHITE)
    draw_text(frame, f"{capture_count:04d}", (counter_x + 12, counter_y + 50), 0.62, CYAN)

    # Center Target

    center_x = width // 2
    center_y = height // 2

    target_size = 16

    cv2.line(frame, (center_x - target_size, center_y), (center_x - 5, center_y), CYAN, 1)
    cv2.line(frame, (center_x + 5, center_y), (center_x + target_size, center_y), CYAN, 1)
    cv2.line(frame, (center_x, center_y - target_size), (center_x, center_y - 5), CYAN, 1)
    cv2.line(frame, (center_x, center_y + 5), (center_x, center_y + target_size), CYAN, 1)

    # Bottom Control Bar

    bar_h = 62
    bar_y = height - bar_h - 20

    draw_rect_alpha(
        frame, 
        (25, bar_y), 
        (width - 25, height - 20), 
        DARKER, 
        0.85
    )

    cv2.line(frame, (25, bar_y), (width - 25, bar_y), CYAN, 2)

    # Controls

    controls = [
        ("SPACE", "CAPTURE"),
        ("L", "CHANGE SIGN"),
        ("Q", "QUIT")
    ]

    x = 45

    for key_name, action in controls:
        draw_text(frame, f"[{key_name}]", (x, bar_y + 28), 0.42, YELLOW)
        x += 85

        draw_text(frame, action, (x, bar_y + 28), 0.38, WHITE)
        x += 150
   
    # System Status

    draw_text(frame, "● ONLINE", (width - 105, bar_y + 28), 0.38, GREEN)   


# Draw Hands

HAND_CONNECTIONS = [

    # Palm
    (0, 1),
    (0, 5),
    (5, 9),
    (9, 13),
    (13, 17),
    (0, 17),

    # Thumb
    (1, 2),
    (2, 3),
    (3, 4),

    # Index
    (5, 6),
    (6, 7),
    (7, 8),

    # Middle
    (9, 10),
    (10, 11),
    (11, 12),

    # Ring
    (13, 14),
    (14, 15),
    (15, 16),

    # Pinky
    (17, 18),
    (18, 19),
    (19, 20)
]

def draw_hand(frame, landmarks, handedness):
    height, width = frame.shape[:2]
    points = []

    for landmark in landmarks:
        x = int(landmark.x * width)
        y = int(landmark.y * height)

        points.append((x, y))

    for start, end in HAND_CONNECTIONS:
        cv2.line(frame, points[start], points[end], (0, 255, 0), 2)

    for point in points:
        cv2.circle(frame, point, 5, (0, 0, 255), -1)

    wrist_x, wrist_y = points[0]

    draw_text(frame, handedness, (wrist_x + 10, wrist_y - 10), 0.6, (0, 255, 255))


# Main

def main():
    camera = cv2.VideoCapture(0)

    camera.set(cv2.CAP_PROP_FRAME_WIDTH, CAMERA_WIDTH)
    camera.set(cv2.CAP_PROP_FRAME_HEIGHT, CAMERA_HEIGHT)

    if not camera.isOpened():
        print("ERROR: Could not open webcam.")
        return

    print()
    print("======================================")
    print(" Naruto Hand Sign Data Collector")
    print("======================================")
    print()
    print("Controls:")
    print()
    print("  L       Change label")
    print("  SPACE   Capture sample")
    print("  Q       Quit")
    print()
    print("Example Labels:")
    print()
    print("  Tiger")
    print("  Ram")
    print("  Snake")
    print("  Horse")
    print("  Bird")
    print()
    print("======================================")
    print()

    label = input("Enter hand sign label: ").strip()

    if not label:
        print("No label provided.")
        camera.release()
        return

    capture_count = 0
    last_capture_time = 0
    frame_timestamp_ms = 0

    auto_capturing = False
    samples_to_capture = 0
    
    while True:
        success, frame = camera.read()

        if not success:
            print("ERROR: Could not read webcam frame.")
            break

        frame = cv2.flip(frame, 1)                        # Flip for natural webcam interaction
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)      # MediaPipe requires RGB

        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb)             # Create MediaPipe Image
        frame_timestamp_ms = int(time.monotonic() * 1000)                                # Timestamp
        result = hand_landmarker.detect_for_video(mp_image, frame_timestamp_ms)     # Detect Hands

        if result.hand_landmarks:
            for i, hand_landmarks in enumerate(result.hand_landmarks):

                handedness = result.handedness[i][0]
                label_name = handedness.category_name
                draw_hand(frame, hand_landmarks, label_name)
                
        # Interface

        draw_hud(
            frame,
            label,
            capture_count,
            hands_detected=bool(result.hand_landmarks)
        )

        # Show

        cv2.imshow("Naruto Hand Sign Data Collector", frame)
        key = cv2.waitKey(1) & 0xFF

        # Capture

        if key == ord(" "):
            
            if not auto_capturing:
                auto_capturing = True
                samples_to_capture = 200

                print()
                print(f"[AUTO CAPTURE] Collecting 200 samples for {label}")
                print()
        
        if auto_capturing:
            current_time = time.time()

            if current_time - last_capture_time >= CAPTURE_COOLDOWN:

                if result.hand_landmarks:
                    features = extract_features(result)
                    save_sample(label, features)

                    capture_count += 1 
                    samples_to_capture -= 1

                    last_capture_time = current_time

                    print(
                        f"[Captured] {label} "
                        f"sample #{capture_count} "
                        f"({200 - samples_to_capture}/200)"
                        )

                    if samples_to_capture <= 0:
                        auto_capturing = False
                        
                        print()
                        print(f"[COMPLETE] Collected 200 samples for {label}")
                        print()
                    
                else:
                    print("[SKIPPED] No hands detected.")
                    last_capture_time = current_time

        
        elif key == ord("l"):
            cv2.destroyWindow("Naruto Hand Sign Data Collector")

            new_label = input("Enter new hand sign label: ").strip()

            if new_label:
                label = new_label
                capture_count = 0
                print(f"Now collecting: {label}")

        elif key == ord("q"):
            break

    camera.release()
    cv2.destroyAllWindows()
    hand_landmarker.close()

    print()
    print("======================================")
    print("Collection finished.")
    print(f"Dataset saved in: {DATASET_DIR}/")
    print("======================================")

if __name__ == "__main__":
    main()