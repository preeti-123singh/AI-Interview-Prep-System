import urllib.request  # the emotion library forgets this import
import base64

import cv2
import numpy as np

_detector = None
_fer = None

# How "composed and confident" each expression looks (0 to 1)
WEIGHTS = {
    "Happiness": 1.0, "Neutral": 0.85, "Surprise": 0.6, "Contempt": 0.4,
    "Sadness": 0.35, "Anger": 0.3, "Disgust": 0.3, "Fear": 0.25,
}


def _load():
    global _detector, _fer
    if _detector is None:
        _detector = cv2.CascadeClassifier(
            cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
        )
    if _fer is None:
        from hsemotion_onnx.facial_emotions import HSEmotionRecognizer
        _fer = HSEmotionRecognizer(model_name="enet_b0_8_best_afew")
    return _detector, _fer


def analyze_frames(frames):
    detector, fer = _load()
    total = len(frames)
    detected = 0
    counts = {}
    weight_sum = 0.0

    for data_url in frames:
        try:
            b64 = data_url.split(",", 1)[1] if "," in data_url else data_url
            img = cv2.imdecode(np.frombuffer(base64.b64decode(b64), np.uint8), cv2.IMREAD_COLOR)
            if img is None:
                continue
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
            faces = detector.detectMultiScale(gray, 1.1, 5, minSize=(60, 60))
            if len(faces) == 0:
                continue
            x, y, w, h = max(faces, key=lambda f: f[2] * f[3])
            m = int(0.15 * w)
            x0, y0 = max(0, x - m), max(0, y - m)
            face = img[y0:y + h + m, x0:x + w + m]
            face_rgb = cv2.cvtColor(face, cv2.COLOR_BGR2RGB)
            emotion, _scores = fer.predict_emotions(face_rgb, logits=False)
            detected += 1
            counts[emotion] = counts.get(emotion, 0) + 1
            weight_sum += WEIGHTS.get(emotion, 0.5)
        except Exception as e:
            print("Face frame failed:", e)

    if detected == 0:
        return {
            "face_frames": total, "face_detected": 0, "face_presence": 0,
            "expression_score": 0, "dominant_emotion": "No face detected",
        }

    return {
        "face_frames": total,
        "face_detected": detected,
        "face_presence": round(100 * detected / total),
        "expression_score": round(100 * weight_sum / detected),
        "dominant_emotion": max(counts, key=counts.get),
    }