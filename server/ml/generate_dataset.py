"""
generate_dataset.py

Creates a controlled synthetic dataset for multi-label health classification.
Includes normal, borderline, and extreme cases with balanced label distribution.
"""

import numpy as np
import pandas as pd
import os

np.random.seed(42)

N = 3000  # total samples


def generate_samples():
    data = []

    # --- Normal cases (40%) ---
    for _ in range(int(N * 0.4)):
        hr = np.random.randint(60, 100)
        spo2 = np.random.randint(95, 101)
        temp = round(np.random.uniform(97.0, 99.0), 1)
        rhythm = 0  # regular
        hrv = 1  # normal
        data.append([hr, spo2, temp, rhythm, hrv])

    # --- Borderline cases (30%) ---
    for _ in range(int(N * 0.3)):
        hr = np.random.randint(85, 115)
        spo2 = np.random.randint(92, 97)
        temp = round(np.random.uniform(98.5, 101.0), 1)
        rhythm = np.random.choice([0, 1], p=[0.7, 0.3])
        hrv = np.random.choice([0, 1, 2], p=[0.3, 0.5, 0.2])
        data.append([hr, spo2, temp, rhythm, hrv])

    # --- Extreme / critical cases (30%) ---
    for _ in range(int(N * 0.3)):
        hr = np.random.randint(50, 141)
        spo2 = np.random.randint(85, 94)
        temp = round(np.random.uniform(99.0, 104.0), 1)
        rhythm = np.random.choice([0, 1], p=[0.4, 0.6])
        hrv = np.random.choice([0, 1, 2], p=[0.5, 0.3, 0.2])
        data.append([hr, spo2, temp, rhythm, hrv])

    return np.array(data)


def engineer_features(df):
    """Add derived features."""
    # Oxygen Stress Index
    df['osi'] = round(df['heartRate'] / df['spo2'], 4)

    # Temperature deviation from normal
    df['temp_deviation'] = round(df['temperature'] - 98.6, 1)

    # Heart rate flag
    df['hr_flag'] = (df['heartRate'] > 100).astype(int)

    # SpO2 severity level
    df['spo2_severity'] = df['spo2'].apply(
        lambda x: 2 if x < 92 else (1 if x < 95 else 0)
    )

    return df


def generate_labels(df):
    """Multi-label classification targets."""

    # Hypoxia
    df['hypoxia'] = 0
    df.loc[(df['spo2'] < 95) & (df['heartRate'] > 90), 'hypoxia'] = 1
    df.loc[df['spo2'] < 92, 'hypoxia'] = 1

    # Fever
    df['fever'] = 0
    df.loc[df['temperature'] > 99, 'fever'] = 1

    # Cardiac risk
    df['cardiac_risk'] = 0
    df.loc[(df['ecg_rhythm'] == 1) | (df['heartRate'] > 105), 'cardiac_risk'] = 1

    # Stress
    df['stress'] = 0
    df.loc[(df['ecg_hrv'] == 0) | (df['heartRate'] > 95), 'stress'] = 1

    return df


def main():
    print("Generating synthetic dataset...")
    raw = generate_samples()

    df = pd.DataFrame(raw, columns=[
        'heartRate', 'spo2', 'temperature', 'ecg_rhythm', 'ecg_hrv'
    ])

    # Ensure correct types
    df['heartRate'] = df['heartRate'].astype(int)
    df['spo2'] = df['spo2'].astype(int)
    df['temperature'] = df['temperature'].astype(float)
    df['ecg_rhythm'] = df['ecg_rhythm'].astype(int)
    df['ecg_hrv'] = df['ecg_hrv'].astype(int)

    # Feature engineering
    df = engineer_features(df)

    # Labels
    df = generate_labels(df)

    # Save
    output_path = os.path.join(os.path.dirname(__file__), 'dataset.csv')
    df.to_csv(output_path, index=False)

    print(f"Dataset saved to {output_path}")
    print(f"Total samples: {len(df)}")
    print(f"\nLabel distribution:")
    for label in ['hypoxia', 'fever', 'cardiac_risk', 'stress']:
        pos = df[label].sum()
        print(f"  {label}: {pos} positive ({pos/len(df)*100:.1f}%)")

    print(f"\nFeature columns: {list(df.columns)}")


if __name__ == '__main__':
    main()
