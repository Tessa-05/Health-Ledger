/**
 * symptomService.js
 *
 * Processes user-reported symptoms using keyword detection.
 * Correlates symptoms with vital data for combined analysis.
 */

// ─────────────────────────────────────────────
// SYMPTOM → CONDITION MAPPING
// ─────────────────────────────────────────────

const symptomRules = [
  {
    keywords: ['chest pain', 'chest tightness', 'chest discomfort'],
    category: 'cardiac',
    severity: 'critical',
    label: 'Possible Cardiac Event',
    detail: 'User reports chest pain. Immediate cardiac evaluation recommended.',
    action: 'Seek emergency medical attention immediately.',
  },
  {
    keywords: ['shortness of breath', 'breathing difficulty', 'breathless', 'can\'t breathe', 'hard to breathe'],
    category: 'respiratory',
    severity: 'warning',
    label: 'Respiratory Distress',
    detail: 'User reports breathing difficulty. Monitor SpO2 closely.',
    action: 'Practice deep breathing. Seek medical help if worsening.',
  },
  {
    keywords: ['dizzy', 'dizziness', 'lightheaded', 'faint', 'fainting'],
    category: 'neurological',
    severity: 'warning',
    label: 'Possible Low Blood Pressure or Vertigo',
    detail: 'User reports dizziness. May indicate low BP, dehydration, or inner ear issue.',
    action: 'Sit or lie down immediately. Hydrate. Seek medical help if persistent.',
  },
  {
    keywords: ['headache', 'head pain', 'migraine'],
    category: 'neurological',
    severity: 'warning',
    label: 'Headache Reported',
    detail: 'User reports headache. May relate to stress, dehydration, or blood pressure changes.',
    action: 'Rest in a dark, quiet room. Hydrate. Take allowed pain relief if needed.',
  },
  {
    keywords: ['nausea', 'vomiting', 'feel sick', 'throwing up'],
    category: 'gastrointestinal',
    severity: 'warning',
    label: 'Nausea or Vomiting',
    detail: 'User reports nausea. May indicate infection, medication side effect, or food issue.',
    action: 'Stay hydrated with small sips. Avoid heavy food. Seek help if persistent.',
  },
  {
    keywords: ['fatigue', 'tired', 'exhausted', 'weak', 'no energy'],
    category: 'general',
    severity: 'info',
    label: 'Fatigue Reported',
    detail: 'User reports fatigue. May relate to poor sleep, stress, or underlying condition.',
    action: 'Rest adequately. Ensure proper nutrition and hydration.',
  },
  {
    keywords: ['palpitation', 'heart racing', 'heart pounding', 'heart flutter'],
    category: 'cardiac',
    severity: 'warning',
    label: 'Heart Palpitations Reported',
    detail: 'User reports heart palpitations. Monitor heart rate and ECG patterns.',
    action: 'Avoid caffeine and stimulants. Practice slow breathing. Seek ECG evaluation.',
  },
  {
    keywords: ['sweating', 'cold sweat', 'excessive sweating'],
    category: 'autonomic',
    severity: 'info',
    label: 'Excessive Sweating Reported',
    detail: 'User reports excessive sweating. May indicate fever, anxiety, or cardiac event.',
    action: 'Monitor temperature. Cool down and hydrate.',
  },
  {
    keywords: ['cough', 'coughing', 'sore throat', 'throat pain'],
    category: 'respiratory',
    severity: 'info',
    label: 'Cough or Sore Throat',
    detail: 'User reports cough or throat discomfort. Monitor for fever and breathing changes.',
    action: 'Warm fluids. Gargle with salt water. Seek help if fever develops.',
  },
  {
    keywords: ['body pain', 'muscle pain', 'joint pain', 'aching'],
    category: 'musculoskeletal',
    severity: 'info',
    label: 'Body or Muscle Pain',
    detail: 'User reports body pain. May relate to fever, overexertion, or infection.',
    action: 'Rest. Apply warm compress. Take allowed pain relief if needed.',
  },
];

// ─────────────────────────────────────────────
// KEYWORD DETECTION
// ─────────────────────────────────────────────

/**
 * processSymptoms
 *
 * @param {string} inputText — raw user symptom text
 * @returns {Array} — array of matched symptom findings
 */
exports.processSymptoms = (inputText) => {
  if (!inputText || typeof inputText !== 'string') return [];

  const text = inputText.toLowerCase().trim();
  const findings = [];

  for (const rule of symptomRules) {
    const matched = rule.keywords.some((kw) => text.includes(kw));
    if (matched) {
      findings.push({
        category: rule.category,
        severity: rule.severity,
        label: rule.label,
        detail: rule.detail,
        action: rule.action,
      });
    }
  }

  return findings;
};

// ─────────────────────────────────────────────
// VITAL CORRELATION
// ─────────────────────────────────────────────

/**
 * correlateWithVitals
 *
 * @param {Array}  symptomFindings — from processSymptoms()
 * @param {Object} vitals — { heartRate, spo2, temperature, ecg }
 * @returns {Array} — array of correlation insights
 */
exports.correlateWithVitals = (symptomFindings, vitals) => {
  if (!symptomFindings.length || !vitals) return [];

  const correlations = [];

  for (const finding of symptomFindings) {
    // Breathing difficulty + low SpO2
    if (finding.category === 'respiratory' && vitals.spo2 < 95) {
      correlations.push({
        symptom: finding.label,
        vital: `SpO2: ${vitals.spo2}%`,
        severity: vitals.spo2 < 90 ? 'critical' : 'warning',
        insight: `User-reported breathing difficulty aligns with reduced oxygen levels (SpO2: ${vitals.spo2}%). This correlation strengthens the respiratory concern.`,
      });
    }

    // Cardiac symptoms + high HR
    if (finding.category === 'cardiac' && vitals.heartRate > 100) {
      correlations.push({
        symptom: finding.label,
        vital: `Heart Rate: ${vitals.heartRate} bpm`,
        severity: 'critical',
        insight: `User-reported cardiac symptoms are supported by elevated heart rate (${vitals.heartRate} bpm). Immediate cardiac assessment is advised.`,
      });
    }

    // Cardiac symptoms + irregular ECG
    if (finding.category === 'cardiac' && vitals.ecg?.rhythm === 'irregular') {
      correlations.push({
        symptom: finding.label,
        vital: 'ECG: Irregular rhythm',
        severity: 'critical',
        insight: `User-reported cardiac symptoms combined with irregular ECG rhythm indicate a potentially serious cardiac event.`,
      });
    }

    // Dizziness + low HR
    if (finding.category === 'neurological' && finding.label.includes('Blood Pressure') && vitals.heartRate < 60) {
      correlations.push({
        symptom: finding.label,
        vital: `Heart Rate: ${vitals.heartRate} bpm`,
        severity: 'warning',
        insight: `User-reported dizziness with low heart rate (${vitals.heartRate} bpm) suggests possible hypotension or vagal episode.`,
      });
    }

    // Fatigue + low SpO2
    if (finding.category === 'general' && vitals.spo2 < 95) {
      correlations.push({
        symptom: finding.label,
        vital: `SpO2: ${vitals.spo2}%`,
        severity: 'warning',
        insight: `User-reported fatigue may be linked to reduced oxygen saturation (SpO2: ${vitals.spo2}%).`,
      });
    }

    // Sweating + high temp
    if (finding.category === 'autonomic' && vitals.temperature > 99) {
      correlations.push({
        symptom: finding.label,
        vital: `Temperature: ${vitals.temperature}°F`,
        severity: 'warning',
        insight: `Excessive sweating aligns with elevated body temperature (${vitals.temperature}°F), suggesting fever response.`,
      });
    }

    // Palpitations + irregular ECG
    if (finding.label.includes('Palpitations') && vitals.ecg?.rhythm === 'irregular') {
      correlations.push({
        symptom: finding.label,
        vital: 'ECG: Irregular rhythm',
        severity: 'warning',
        insight: `User-reported palpitations are confirmed by irregular ECG rhythm. Cardiology evaluation recommended.`,
      });
    }
  }

  return correlations;
};
