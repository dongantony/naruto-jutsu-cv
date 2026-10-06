print("predict_server.py STARTED")

import os
import joblib

from flask import Flask, request, jsonify
from flask_cors import CORS


# Configuration

MODEL_PATH = "../hand_sign_model.pkl"

HOST = "127.0.0.1"
PORT = 5000


# Flask Setup

app = Flask(__name__)
CORS(app)


# Load Model

if not os.path.exists(MODEL_PATH):
    raise RuntimeError(f"Could not find model: {MODEL_PATH}")

model_data = joblib.load(MODEL_PATH)

model = model_data["model"]
feature_columns = model_data["feature_columns"]

print("======================================")
print(" Naruto Hand Sign Prediction Server")
print("======================================")
print()
print(f"Model loaded: {MODEL_PATH}")
print(f"Features expected: {len(feature_columns)}")
print(f"Classes: {list(model.classes_)}")
print()


# Health Check Endpoint

@app.route("/health", methods=["GET"])
def health_check():
    return jsonify({
        "status": "ok",
        "model_loaded": True,
        "features": len(feature_columns),
        "classes": list(model.classes_)
    })


# Prediction Endpoint

@app.route("/predict", methods=["POST"])
def predict():
    data = request.get_json()

    if not data:
        return jsonify({"error": "No JSON data received"}), 400

    features = data.get("features")

    if features is None:
        return jsonify({"error": "Missing 'features'"}), 400

    if len(features) != len(feature_columns):
        return jsonify({
            "error": (
                f"Expected {len(feature_columns)} features, "
                f"received {len(features)}"
            )
        }), 400

    # Convert to the format expected by scikit-learn (2D array)
    X = [features]
    
    # Make prediction
    predictions = model.predict(X)

    # Get probabilities for every class     
    probabilities = model.predict_proba(X)[0]

    probability_dict = {
        class_name: float(probability)
        for class_name, probability
        in zip(model.classes_, probabilities)
    }

    return jsonify({
        "prediction": predictions[0],
        "probabilities": probability_dict
    })


# Start Server
if __name__ == "__main__":
    print(f"Server running at http://{HOST}:{PORT}")
    print()

    app.run(host=HOST, port=PORT, debug=True)