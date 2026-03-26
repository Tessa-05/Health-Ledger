/**
 * analysisService.js
 *
 * Rule-based health analysis engine.
 * Processes vitals against clinical thresholds, detects combinations,
 * analyzes trends, generates insights, recommendations, and alerts.
 */

// ─────────────────────────────────────────────
// 1. INDIVIDUAL VITAL RULES
// ─────────────────────────────────────────────

function evaluateHeartRate(hr) {
  const observations = [];
  if (hr > 100) {
    observations.push({
      vital: 'heartRate',
      value: hr,
      severity: hr > 130 ? 'critical' : 'warning',
      label: 'Elevated Heart Rate (Tachycardia)',
      detail: `Heart rate of ${hr} bpm exceeds the normal upper limit of 100 bpm.`,
    });
  } else if (hr < 60) {
    observations.push({
      vital: 'heartRate',
      value: hr,
      severity: hr < 40 ? 'critical' : 'warning',
      label: 'Reduced Heart Rate (Bradycardia)',
      detail: `Heart rate of ${hr} bpm is below the normal lower limit of 60 bpm.`,
    });
  } else {
    observations.push({
      vital: 'heartRate',
      value: hr,
      severity: 'normal',
      label: 'Normal Heart Rate',
      detail: `Heart rate of ${hr} bpm is within the healthy range (60–100 bpm).`,
    });
  }
  return observations;
}

function evaluateSpO2(spo2) {
  const observations = [];
  if (spo2 < 90) {
    observations.push({
      vital: 'spo2',
      value: spo2,
      severity: 'critical',
      label: 'Critical Oxygen Level',
      detail: `SpO2 of ${spo2}% is critically low. Immediate medical attention may be needed.`,
    });
  } else if (spo2 < 95) {
    observations.push({
      vital: 'spo2',
      value: spo2,
      severity: 'warning',
      label: 'Mild Hypoxia',
      detail: `SpO2 of ${spo2}% indicates reduced oxygen saturation.`,
    });
  } else {
    observations.push({
      vital: 'spo2',
      value: spo2,
      severity: 'normal',
      label: 'Normal Oxygen Saturation',
      detail: `SpO2 of ${spo2}% is within the healthy range (95–100%).`,
    });
  }
  return observations;
}

function evaluateTemperature(temp) {
  const observations = [];
  if (temp > 101) {
    observations.push({
      vital: 'temperature',
      value: temp,
      severity: 'critical',
      label: 'High Fever',
      detail: `Temperature of ${temp}°F indicates a high fever requiring attention.`,
    });
  } else if (temp > 99) {
    observations.push({
      vital: 'temperature',
      value: temp,
      severity: 'warning',
      label: 'Low-grade Fever',
      detail: `Temperature of ${temp}°F is slightly elevated above the normal 98.6°F.`,
    });
  } else {
    observations.push({
      vital: 'temperature',
      value: temp,
      severity: 'normal',
      label: 'Normal Temperature',
      detail: `Temperature of ${temp}°F is within the normal range.`,
    });
  }
  return observations;
}

function evaluateECG(ecg) {
  const observations = [];
  if (ecg.rhythm === 'irregular') {
    observations.push({
      vital: 'ecg',
      value: ecg.rhythm,
      severity: 'warning',
      label: 'Irregular Cardiac Rhythm',
      detail: 'ECG indicates an irregular heartbeat pattern. Further evaluation recommended.',
    });
  }
  if (ecg.hrv === 'low') {
    observations.push({
      vital: 'ecg',
      value: `HRV: ${ecg.hrv}`,
      severity: 'warning',
      label: 'Possible Stress or Fatigue',
      detail: 'Low heart rate variability may indicate elevated stress or fatigue levels.',
    });
  }
  if (ecg.rhythm === 'regular' && ecg.hrv === 'normal') {
    observations.push({
      vital: 'ecg',
      value: 'regular / normal HRV',
      severity: 'normal',
      label: 'Normal ECG Pattern',
      detail: 'ECG rhythm and heart rate variability are within normal limits.',
    });
  }
  return observations;
}

// ─────────────────────────────────────────────
// 2. COMBINATION LOGIC
// ─────────────────────────────────────────────

function evaluateCombinations(vitals) {
  const { heartRate, spo2, temperature, ecg } = vitals;
  const observations = [];

  // High HR + High Temp → Fever-induced Tachycardia
  if (heartRate > 100 && temperature > 99) {
    observations.push({
      type: 'combination',
      severity: temperature > 101 ? 'critical' : 'warning',
      label: 'Fever-induced Tachycardia',
      detail: 'The combination of elevated heart rate and fever suggests a fever-induced tachycardia response.',
    });
  }

  // Low SpO2 + High HR → Compensatory Cardiac Response
  if (spo2 < 95 && heartRate > 100) {
    observations.push({
      type: 'combination',
      severity: spo2 < 90 ? 'critical' : 'warning',
      label: 'Compensatory Cardiac Response',
      detail: 'The combination of reduced oxygen saturation and elevated heart rate suggests a compensatory cardiovascular response.',
    });
  }

  // Irregular ECG + Normal HR → Underlying Cardiac Irregularity
  if (ecg.rhythm === 'irregular' && heartRate >= 60 && heartRate <= 100) {
    observations.push({
      type: 'combination',
      severity: 'warning',
      label: 'Underlying Cardiac Irregularity',
      detail: 'Irregular cardiac rhythm alongside a normal heart rate may suggest an underlying arrhythmia requiring monitoring.',
    });
  }

  // Low HRV + High HR → Stress-induced Strain
  if (ecg.hrv === 'low' && heartRate > 100) {
    observations.push({
      type: 'combination',
      severity: 'warning',
      label: 'Stress-induced Strain',
      detail: 'Low heart rate variability combined with elevated heart rate suggests the body is under stress-induced cardiovascular strain.',
    });
  }

  return observations;
}

// ─────────────────────────────────────────────
// 3. TREND ANALYSIS
// ─────────────────────────────────────────────

function analyzeTrends(previousVitals) {
  const trends = [];

  if (!previousVitals || previousVitals.length < 2) {
    return trends;
  }

  // Sort by timestamp ascending (oldest first)
  const sorted = [...previousVitals].sort(
    (a, b) => new Date(a.timestamp) - new Date(b.timestamp)
  );

  // Heart rate trend
  const hrValues = sorted.map((v) => v.heartRate);
  const hrTrend = detectTrend(hrValues);
  if (hrTrend === 'increasing') {
    trends.push({
      vital: 'heartRate',
      direction: 'increasing',
      label: 'Heart rate trending upward',
      detail: `Heart rate has been increasing over the last ${sorted.length} readings: ${hrValues.join(' → ')} bpm.`,
    });
  } else if (hrTrend === 'decreasing') {
    trends.push({
      vital: 'heartRate',
      direction: 'decreasing',
      label: 'Heart rate trending downward',
      detail: `Heart rate has been decreasing over the last ${sorted.length} readings: ${hrValues.join(' → ')} bpm.`,
    });
  }

  // SpO2 trend
  const spo2Values = sorted.map((v) => v.spo2);
  const spo2Trend = detectTrend(spo2Values);
  if (spo2Trend === 'decreasing') {
    trends.push({
      vital: 'spo2',
      direction: 'decreasing',
      label: 'Oxygen levels declining',
      detail: `SpO2 has been declining over the last ${sorted.length} readings: ${spo2Values.join(' → ')}%.`,
    });
  }

  // Temperature trend
  const tempValues = sorted.map((v) => v.temperature);
  const tempTrend = detectTrend(tempValues);
  if (tempTrend === 'increasing') {
    trends.push({
      vital: 'temperature',
      direction: 'increasing',
      label: 'Possible developing fever',
      detail: `Temperature has been rising over the last ${sorted.length} readings: ${tempValues.join(' → ')}°F.`,
    });
  }

  return trends;
}

function detectTrend(values) {
  if (values.length < 2) return 'stable';

  let increasing = 0;
  let decreasing = 0;

  for (let i = 1; i < values.length; i++) {
    if (values[i] > values[i - 1]) increasing++;
    else if (values[i] < values[i - 1]) decreasing++;
  }

  const threshold = Math.floor((values.length - 1) * 0.6);
  if (increasing >= threshold) return 'increasing';
  if (decreasing >= threshold) return 'decreasing';
  return 'stable';
}

// ─────────────────────────────────────────────
// 4. CLINICAL INSIGHT GENERATOR
// ─────────────────────────────────────────────

function generateInsight(healthReport, combinations) {
  const abnormal = healthReport.filter((o) => o.severity !== 'normal');

  if (abnormal.length === 0 && combinations.length === 0) {
    return 'All vital signs are within normal limits. No immediate health concerns detected.';
  }

  if (combinations.length > 0) {
    const primary = combinations[0];
    return primary.detail;
  }

  if (abnormal.length === 1) {
    return abnormal[0].detail;
  }

  // Multiple individual abnormalities
  const labels = abnormal.map((o) => o.label.toLowerCase());
  if (labels.length === 2) {
    return `The combination of ${labels[0]} and ${labels[1]} suggests a multi-system response that should be monitored closely.`;
  }

  return `Multiple abnormalities detected: ${labels.join(', ')}. A comprehensive clinical evaluation is recommended.`;
}

// ─────────────────────────────────────────────
// 5. RECOMMENDATION ENGINE
// ─────────────────────────────────────────────

function generateRecommendations(healthReport, combinations) {
  const recommendations = new Set();

  const allObservations = [...healthReport, ...combinations];

  for (const obs of allObservations) {
    if (obs.severity === 'normal') continue;

    const label = obs.label || '';

    if (label.includes('Fever') || label.includes('Temperature')) {
      recommendations.add('Stay hydrated — drink plenty of water and electrolyte-rich fluids.');
      recommendations.add('Rest adequately and avoid physical exertion.');
      recommendations.add('Monitor temperature every 2–4 hours.');
    }

    if (label.includes('Hypoxia') || label.includes('Oxygen')) {
      recommendations.add('Practice deep breathing exercises.');
      recommendations.add('Ensure proper ventilation in your environment.');
      recommendations.add('Seek medical evaluation if SpO2 remains below 92%.');
    }

    if (label.includes('Tachycardia') || label.includes('Elevated Heart Rate')) {
      recommendations.add('Avoid caffeine and stimulants.');
      recommendations.add('Practice relaxation techniques to reduce heart rate.');
      recommendations.add('Rest and avoid strenuous activity.');
    }

    if (label.includes('Bradycardia') || label.includes('Reduced Heart Rate')) {
      recommendations.add('Monitor for dizziness or lightheadedness.');
      recommendations.add('Consult a healthcare provider if symptoms persist.');
    }

    if (label.includes('Irregular') || label.includes('Cardiac')) {
      recommendations.add('Schedule an ECG evaluation with a cardiologist.');
      recommendations.add('Avoid heavy physical activity until evaluated.');
    }

    if (label.includes('Stress') || label.includes('Fatigue') || label.includes('Strain')) {
      recommendations.add('Prioritize rest and stress management.');
      recommendations.add('Consider mindfulness or meditation exercises.');
      recommendations.add('Ensure adequate sleep (7–8 hours).');
    }

    if (label.includes('Compensatory')) {
      recommendations.add('Seek immediate medical attention if symptoms worsen.');
      recommendations.add('Lie down in a comfortable position and breathe steadily.');
    }
  }

  if (recommendations.size === 0) {
    recommendations.add('Continue maintaining a healthy lifestyle.');
    recommendations.add('Schedule routine health checkups.');
  }

  return Array.from(recommendations);
}

// ─────────────────────────────────────────────
// 6. ALERT SYSTEM
// ─────────────────────────────────────────────

function generateAlerts(vitals, healthReport, combinations) {
  const alerts = [];

  // Critical SpO2
  if (vitals.spo2 < 90) {
    alerts.push({
      level: 'critical',
      message: 'Critical condition detected: Oxygen saturation is dangerously low.',
      action: 'Seek immediate medical assistance. Consider supplemental oxygen.',
    });
  }

  // High HR + Irregular ECG
  if (vitals.heartRate > 100 && vitals.ecg.rhythm === 'irregular') {
    alerts.push({
      level: 'critical',
      message: 'Critical condition detected: Elevated heart rate with irregular cardiac rhythm.',
      action: 'Stop all physical activity. Contact emergency services if accompanied by chest pain or shortness of breath.',
    });
  }

  // High fever
  if (vitals.temperature > 103) {
    alerts.push({
      level: 'critical',
      message: 'Critical condition detected: Very high fever.',
      action: 'Seek emergency medical care immediately. Apply cooling measures.',
    });
  }

  // Severe bradycardia
  if (vitals.heartRate < 40) {
    alerts.push({
      level: 'critical',
      message: 'Critical condition detected: Severe bradycardia.',
      action: 'Seek immediate medical evaluation. Monitor for fainting or dizziness.',
    });
  }

  // Combination critical alerts
  if (vitals.spo2 < 90 && vitals.heartRate > 100) {
    alerts.push({
      level: 'critical',
      message: 'Critical condition detected: Critically low oxygen with compensatory tachycardia.',
      action: 'This is a medical emergency. Call emergency services immediately.',
    });
  }

  return alerts;
}

// ─────────────────────────────────────────────
// MAIN ANALYSIS FUNCTION
// ─────────────────────────────────────────────

/**
 * analyzeVitals
 *
 * @param {Object} currentVitals — { heartRate, spo2, temperature, ecg: { rhythm, hrv } }
 * @param {Array}  previousVitals — array of recent vital records (last 3–5)
 * @returns {Object} — { healthReport, insight, recommendations, alerts, trends }
 */
exports.analyzeVitals = (currentVitals, previousVitals = []) => {
  // 1. Individual evaluations
  const hrReport = evaluateHeartRate(currentVitals.heartRate);
  const spo2Report = evaluateSpO2(currentVitals.spo2);
  const tempReport = evaluateTemperature(currentVitals.temperature);
  const ecgReport = evaluateECG(currentVitals.ecg || { rhythm: 'regular', hrv: 'normal' });

  const healthReport = [...hrReport, ...spo2Report, ...tempReport, ...ecgReport];

  // 2. Combination logic
  const combinations = evaluateCombinations(currentVitals);

  // 3. Trend analysis
  const trends = analyzeTrends(previousVitals);

  // 4. Clinical insight
  const insight = generateInsight(healthReport, combinations);

  // 5. Recommendations
  const recommendations = generateRecommendations(healthReport, combinations);

  // 6. Alerts
  const alerts = generateAlerts(currentVitals, healthReport, combinations);

  return {
    healthReport: [...healthReport, ...combinations],
    trends,
    insight,
    recommendations,
    alerts,
  };
};

// ─────────────────────────────────────────────
// 7. HEALTH SCORE (0–100)
// ─────────────────────────────────────────────

/**
 * computeHealthScore
 *
 * @param {Object|null} mlPredictions — { hypoxia, fever, cardiac_risk, stress }
 * @param {Object}      anomaly      — { status, score }
 * @param {Array}       trends       — trend analysis results
 * @param {Array}       healthReport — observation array
 * @returns {number}    0–100
 */
exports.computeHealthScore = (mlPredictions, anomaly, trends, healthReport) => {
  let score = 100;

  // ML prediction penalties (max -40)
  if (mlPredictions) {
    const { hypoxia = 0, fever = 0, cardiac_risk = 0, stress = 0 } = mlPredictions;
    score -= Math.round(hypoxia * 12);
    score -= Math.round(fever * 8);
    score -= Math.round(cardiac_risk * 12);
    score -= Math.round(stress * 8);
  }

  // Anomaly penalty (max -15)
  if (anomaly && anomaly.status === 'abnormal') {
    score -= 15;
  }

  // Trend penalties (max -15)
  if (trends && trends.length > 0) {
    for (const t of trends) {
      if (t.vital === 'heartRate' && t.direction === 'increasing') score -= 5;
      if (t.vital === 'spo2' && t.direction === 'decreasing') score -= 7;
      if (t.vital === 'temperature' && t.direction === 'increasing') score -= 3;
    }
  }

  // Health report severity penalties (max -30)
  if (healthReport) {
    const criticals = healthReport.filter((o) => o.severity === 'critical').length;
    const warnings = healthReport.filter((o) => o.severity === 'warning').length;
    score -= criticals * 10;
    score -= warnings * 4;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
};

