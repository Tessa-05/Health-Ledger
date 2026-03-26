"""
train_model.py

Trains an XGBoost multi-label classifier on the synthetic health dataset.
Saves one model per label using joblib.
"""

import os
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
from xgboost import XGBClassifier
import joblib

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(SCRIPT_DIR, 'dataset.csv')
MODEL_DIR = os.path.join(SCRIPT_DIR, 'models')

FEATURE_COLS = [
    'heartRate', 'spo2', 'temperature',
    'ecg_rhythm', 'ecg_hrv',
    'osi', 'temp_deviation', 'hr_flag', 'spo2_severity'
]

LABEL_COLS = ['hypoxia', 'fever', 'cardiac_risk', 'stress']


def train():
    print("Loading dataset...")
    df = pd.read_csv(DATASET_PATH)
    print(f"  Samples: {len(df)}")

    X = df[FEATURE_COLS].values
    Y = df[LABEL_COLS].values

    # Split 80/20
    X_train, X_test, Y_train, Y_test = train_test_split(
        X, Y, test_size=0.2, random_state=42
    )
    print(f"  Train: {len(X_train)}, Test: {len(X_test)}")

    # Create model directory
    os.makedirs(MODEL_DIR, exist_ok=True)

    # Train one XGBoost model per label (multi-output)
    models = {}
    for i, label in enumerate(LABEL_COLS):
        print(f"\nTraining model: {label}")

        model = XGBClassifier(
            n_estimators=200,
            max_depth=5,
            learning_rate=0.1,
            subsample=0.8,
            colsample_bytree=0.8,
            random_state=42,
            eval_metric='logloss',
            use_label_encoder=False,
        )

        model.fit(X_train, Y_train[:, i])

        # Evaluate
        y_pred = model.predict(X_test)
        y_prob = model.predict_proba(X_test)[:, 1]
        acc = accuracy_score(Y_test[:, i], y_pred)
        print(f"  Accuracy: {acc:.4f}")

        # Save model
        model_path = os.path.join(MODEL_DIR, f'{label}_model.joblib')
        joblib.dump(model, model_path)
        print(f"  Saved: {model_path}")

        models[label] = model

    # Overall evaluation
    print("\n" + "=" * 50)
    print("OVERALL EVALUATION")
    print("=" * 50)

    for i, label in enumerate(LABEL_COLS):
        y_pred = models[label].predict(X_test)
        print(f"\n--- {label} ---")
        print(classification_report(Y_test[:, i], y_pred, zero_division=0))

    # Save feature column order for inference
    meta_path = os.path.join(MODEL_DIR, 'feature_columns.joblib')
    joblib.dump(FEATURE_COLS, meta_path)
    print(f"\nFeature columns saved: {meta_path}")
    print("\nTraining complete!")


if __name__ == '__main__':
    train()
