"""
predict_server.py

Lightweight Flask microservice for ML predictions + anomaly detection.
Runs on port 5001 alongside the Node.js server (port 5000).
"""

import os
import sys
import numpy as np
import pandas as pd
from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
from sklearn.ensemble import IsolationForest

app = Flask(__name__)
CORS(app)

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_DIR = os.path.join(SCRIPT_DIR, 'models')

LABEL_COLS = ['hypoxia', 'fever', 'cardiac_risk', 'stress']

# Load models at startup
models = {}
feature_columns = None
anomaly_model = None


def load_models():
    global models, feature_columns, anomaly_model
    try:
        for label in LABEL_COLS:
            model_path = os.path.join(MODEL_DIR, f'{label}_model.joblib')
            models[label] = joblib.load(model_path)
            print(f"  Loaded: {label}_model.joblib")

        meta_path = os.path.join(MODEL_DIR, 'feature_columns.joblib')
        feature_columns = joblib.load(meta_path)
        print(f"  Feature columns: {feature_columns}")
        print("ML models loaded successfully.")
    except Exception as e:
        print(f"Error loading models: {e}")
        sys.exit(1)

    # Train Isolation Forest on the dataset for anomaly detection
    try:
        dataset_path = os.path.join(SCRIPT_DIR, 'dataset.csv')
        df = pd.read_csv(dataset_path)
        feature_cols = ['heartRate', 'spo2', 'temperature', 'ecg_rhythm', 'ecg_hrv',
                        'osi', 'temp_deviation', 'hr_flag', 'spo2_severity']
        X_train = df[feature_cols].values
        anomaly_model = IsolationForest(
            n_estimators=150,
            contamination=0.08,
            random_state=42,
            n_jobs=-1,
        )
        anomaly_model.fit(X_train)
        print("Isolation Forest anomaly detector trained successfully.")
    except Exception as e:
        print(f"Warning: Anomaly model failed to train: {e}")
        anomaly_model = None


def engineer_features(vitals):
    """Apply the same feature engineering as training."""
    hr = vitals['heartRate']
    spo2 = vitals['spo2']
    temp = vitals['temperature']
    rhythm = vitals.get('ecg_rhythm', 0)
    hrv = vitals.get('ecg_hrv', 1)

    # Derived features
    osi = round(hr / spo2, 4) if spo2 > 0 else 0
    temp_deviation = round(temp - 98.6, 1)
    hr_flag = 1 if hr > 100 else 0
    spo2_severity = 2 if spo2 < 92 else (1 if spo2 < 95 else 0)

    return [hr, spo2, temp, rhythm, hrv, osi, temp_deviation, hr_flag, spo2_severity]


@app.route('/predict', methods=['POST'])
def predict():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400

        # Map ECG string values to numeric
        ecg = data.get('ecg', {})
        rhythm_str = ecg.get('rhythm', 'regular')
        hrv_str = ecg.get('hrv', 'normal')

        vitals = {
            'heartRate': data.get('heartRate', 72),
            'spo2': data.get('spo2', 98),
            'temperature': data.get('temperature', 98.6),
            'ecg_rhythm': 1 if rhythm_str == 'irregular' else 0,
            'ecg_hrv': {'low': 0, 'normal': 1, 'high': 2}.get(hrv_str, 1),
        }

        # Engineer features
        features = engineer_features(vitals)
        X = np.array([features])

        # Predict probabilities for each condition
        predictions = {}
        risk_levels = {}

        for label in LABEL_COLS:
            prob = float(models[label].predict_proba(X)[0][1])
            predictions[label] = round(prob, 4)

            # Threshold interpretation
            if prob > 0.7:
                risk_levels[label] = 'high'
            elif prob > 0.4:
                risk_levels[label] = 'moderate'
            else:
                risk_levels[label] = 'low'

        # Anomaly detection
        anomaly_result = {'status': 'unknown', 'score': 0.0}
        if anomaly_model is not None:
            anomaly_pred = anomaly_model.predict(X)[0]   # 1 = normal, -1 = anomaly
            anomaly_score = float(anomaly_model.decision_function(X)[0])
            anomaly_result = {
                'status': 'abnormal' if anomaly_pred == -1 else 'normal',
                'score': round(anomaly_score, 4),
            }

        return jsonify({
            'predictions': predictions,
            'riskLevels': risk_levels,
            'features': dict(zip(feature_columns, features)),
            'anomaly': anomaly_result,
        })

    except Exception as e:
        return jsonify({'error': str(e)}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status': 'ok',
        'modelsLoaded': len(models),
        'labels': LABEL_COLS,
        'anomalyReady': anomaly_model is not None,
    })


if __name__ == '__main__':
    print("Loading ML models...")
    load_models()
    port = int(os.environ.get('ML_PORT', 5001))
    print(f"ML Prediction Server running on port {port}")
    app.run(host='0.0.0.0', port=port, debug=False)
