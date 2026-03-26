/* ═══════════════════════════════════════
   AI DOCTOR — SYMPTOM CONVERSATION ENGINE
   Intelligent clinical consultation system
   ═══════════════════════════════════════ */

// ─── SYMPTOM KNOWLEDGE BASE ───
const SYMPTOM_DB = {
  dizzy: {
    label: 'Dizziness',
    systems: ['circulatory', 'neurological'],
    severity: 'warning',
    followUps: [
      { q: 'Do you feel dizzy when standing up suddenly, or is it constant?', key: 'dizzy_type' },
      { q: 'Have you been drinking enough water today?', key: 'hydration' },
      { q: 'Have you experienced any vision changes or blurred vision along with the dizziness?', key: 'dizzy_vision' },
    ],
    vitalCorrelations: {
      heartRate: { high: 'Elevated heart rate combined with dizziness may indicate dehydration or orthostatic hypotension.', low: 'Low heart rate with dizziness could suggest bradycardia-related reduced cerebral perfusion.' },
      spo2: { low: 'Reduced oxygen saturation alongside dizziness raises concern for hypoxic cerebral impairment.' },
      bloodPressure: { low: 'Low blood pressure with dizziness strongly suggests orthostatic hypotension.' },
    },
    conditions: ['Orthostatic hypotension', 'Dehydration', 'Vestibular dysfunction', 'Benign positional vertigo'],
    medications: {
      otc: ['Meclizine (Antivert) 25mg — take one tablet as needed for vertigo, max 3 per day', 'Dramamine (dimenhydrinate) 50mg for motion-related dizziness'],
      advice: ['Sit or lie down immediately when dizzy to prevent falls', 'Rise slowly from sitting/lying positions', 'Keep well hydrated — electrolyte drinks may help'],
    },
  },
  breath: {
    label: 'Shortness of Breath',
    systems: ['respiratory', 'cardiac'],
    severity: 'critical',
    followUps: [
      { q: 'Are you experiencing any chest tightness or pressure along with the breathing difficulty?', key: 'chest_tight' },
      { q: 'Did the shortness of breath come on suddenly or has it been gradually worsening?', key: 'onset' },
      { q: 'Does the breathing difficulty worsen when lying flat?', key: 'breath_position' },
      { q: 'Do you have a history of asthma, COPD, or any lung conditions?', key: 'lung_history' },
    ],
    vitalCorrelations: {
      spo2: { low: 'Your breathing difficulty combined with reduced oxygen saturation indicates compromised gas exchange — this is a significant clinical finding.' },
      heartRate: { high: 'The elevated heart rate is likely a compensatory response to inadequate oxygenation.' },
      temperature: { high: 'Breathing difficulty with fever may suggest pneumonia or a respiratory infection.' },
    },
    conditions: ['Hypoxia', 'Respiratory distress', 'Bronchospasm', 'Pneumonia', 'Heart failure exacerbation'],
    medications: {
      otc: ['If you have a prescribed rescue inhaler (albuterol), use 2 puffs now', 'Steam inhalation may help if congestion is contributing'],
      advice: ['Sit upright — do NOT lie flat', 'Open a window for fresh air', 'If SpO2 drops below 92%, this requires immediate emergency attention'],
    },
  },
  chest: {
    label: 'Chest Pain',
    systems: ['cardiac', 'musculoskeletal'],
    severity: 'critical',
    followUps: [
      { q: 'Is the pain sharp and stabbing, or more of a dull pressure?', key: 'pain_type' },
      { q: 'Does the pain radiate to your left arm, jaw, or back?', key: 'radiation' },
      { q: 'Did the pain start during physical activity or at rest?', key: 'chest_activity' },
      { q: 'Have you taken aspirin or any pain medication?', key: 'chest_meds' },
    ],
    vitalCorrelations: {
      heartRate: { high: 'Chest pain with tachycardia requires urgent cardiac evaluation.', low: 'Chest pain with bradycardia may indicate a conduction abnormality.' },
      spo2: { low: 'Chest pain with oxygen desaturation is a concerning combination that warrants immediate attention.' },
      bloodPressure: { high: 'Chest pain with elevated blood pressure increases cardiac risk.' },
    },
    conditions: ['Angina pectoris', 'Musculoskeletal strain', 'Cardiac arrhythmia', 'Acute coronary syndrome', 'Costochondritis'],
    medications: {
      otc: ['Chew one aspirin 325mg immediately if cardiac origin is suspected', 'Nitroglycerin if previously prescribed — one tablet sublingual'],
      advice: ['Do NOT exert yourself — sit or lie in a comfortable position', 'If pain persists more than 15 minutes with radiation to arm/jaw, call emergency services immediately', 'Loosen tight clothing around chest'],
    },
  },
  headache: {
    label: 'Headache',
    systems: ['neurological'],
    severity: 'warning',
    followUps: [
      { q: 'Is the headache localized to one side, or does it feel like pressure around your entire head?', key: 'head_location' },
      { q: 'Are you experiencing any sensitivity to light or nausea?', key: 'head_assoc' },
      { q: 'On a scale of 1-10, how severe is the headache?', key: 'head_severity' },
      { q: 'Have you taken any pain medication for this headache?', key: 'head_meds_taken' },
    ],
    vitalCorrelations: {
      temperature: { high: 'Headache accompanied by fever often indicates an infectious process — possible meningitis if severe.' },
      heartRate: { high: 'Headache with elevated heart rate may be related to hypertension or stress response.' },
      bloodPressure: { high: 'Headache with hypertension is a warning sign — your blood pressure should be monitored closely.' },
    },
    conditions: ['Tension headache', 'Migraine', 'Hypertensive headache', 'Cluster headache'],
    medications: {
      otc: ['Ibuprofen (Advil) 400mg with food — may repeat in 6 hours', 'Acetaminophen (Tylenol) 500-1000mg — max 3g/day', 'For migraines: Excedrin Migraine (acetaminophen + aspirin + caffeine)'],
      advice: ['Rest in a quiet, dark room', 'Apply cold compress to forehead for 15 minutes', 'Stay hydrated — dehydration is a common headache trigger', 'Avoid screen time until symptoms improve'],
    },
  },
  fatigue: {
    label: 'Fatigue',
    systems: ['systemic'],
    severity: 'info',
    followUps: [
      { q: 'How long have you been experiencing this fatigue — hours, days, or weeks?', key: 'fatigue_duration' },
      { q: 'Have you noticed any changes in your sleep pattern recently?', key: 'sleep' },
      { q: 'Have you had any recent changes in appetite or unexplained weight changes?', key: 'appetite' },
    ],
    vitalCorrelations: {
      heartRate: { low: 'Persistent fatigue with low heart rate may suggest hypothyroidism or cardiac insufficiency.' },
      spo2: { low: 'Fatigue combined with reduced oxygen levels may indicate chronic hypoxia or anemia.' },
      temperature: { low: 'Fatigue with subnormal temperature can be associated with metabolic slowdown.' },
    },
    conditions: ['Chronic fatigue syndrome', 'Anemia', 'Sleep deprivation', 'Hypothyroidism', 'Depression'],
    medications: {
      otc: ['Multivitamin supplement daily — focus on B12, Iron, and Vitamin D', 'If iron deficiency suspected: Ferrous sulfate 325mg once daily with vitamin C'],
      advice: ['Aim for 7-9 hours of consistent sleep', 'Regular light exercise (30 min walk) can paradoxically reduce fatigue', 'Reduce caffeine intake after 2 PM', 'Blood work recommended if fatigue persists >2 weeks: CBC, TSH, B12, Iron panel'],
    },
  },
  nausea: {
    label: 'Nausea',
    systems: ['gastrointestinal', 'neurological'],
    severity: 'warning',
    followUps: [
      { q: 'Have you actually vomited, or is it just the feeling of nausea?', key: 'vomit' },
      { q: 'Did you eat anything unusual in the last 24 hours?', key: 'food' },
      { q: 'Are you able to keep fluids down?', key: 'fluids' },
    ],
    vitalCorrelations: {
      temperature: { high: 'Nausea with fever suggests a possible gastrointestinal infection.' },
    },
    conditions: ['Gastritis', 'Food poisoning', 'Gastroenteritis', 'Motion sickness', 'Medication side effect'],
    medications: {
      otc: ['Pepto-Bismol (bismuth subsalicylate) 2 tablets every 30-60 min as needed', 'Emetrol (phosphorated carbohydrate solution) for nausea relief', 'Ginger tea or ginger capsules 250mg — natural anti-emetic'],
      advice: ['Sip clear fluids in small amounts — water, ginger ale, or oral rehydration solution', 'BRAT diet when able to eat: Bananas, Rice, Applesauce, Toast', 'Avoid dairy, fatty foods, and spicy foods for 24 hours'],
    },
  },
  fever: {
    label: 'Fever / Feeling Hot',
    systems: ['immune', 'infectious'],
    severity: 'warning',
    followUps: [
      { q: 'Do you have any body aches or chills along with the fever?', key: 'fever_assoc' },
      { q: 'Have you been in contact with anyone who was ill recently?', key: 'contact' },
      { q: 'How long have you had the fever?', key: 'fever_duration' },
    ],
    vitalCorrelations: {
      temperature: { high: 'Your reported sensation of fever is confirmed by the elevated body temperature reading.' },
      heartRate: { high: 'Fever-driven tachycardia is an expected physiological response to elevated core temperature.' },
    },
    conditions: ['Viral infection', 'Bacterial infection', 'Inflammatory response', 'Upper respiratory infection'],
    medications: {
      otc: ['Acetaminophen (Tylenol) 500-1000mg every 6 hours — max 3g/day', 'Ibuprofen (Advil) 400mg every 6-8 hours with food — alternate with Tylenol for better coverage', 'Oral rehydration salts — fever increases fluid loss'],
      advice: ['Stay hydrated — drink at least 2-3 liters of fluid daily', 'Rest — your body needs energy to fight infection', 'Light clothing and lukewarm sponge baths to reduce temperature', 'Seek medical attention if fever exceeds 103°F (39.4°C) or persists >3 days'],
    },
  },
  palpitation: {
    label: 'Heart Palpitations',
    systems: ['cardiac'],
    severity: 'critical',
    followUps: [
      { q: 'Do you feel like your heart is skipping beats, racing, or fluttering?', key: 'palp_type' },
      { q: 'Have you consumed caffeine, alcohol, or any stimulants recently?', key: 'stimulants' },
      { q: 'Do you feel lightheaded or short of breath along with the palpitations?', key: 'palp_assoc' },
    ],
    vitalCorrelations: {
      heartRate: { high: 'The palpitation sensation correlates with your objectively elevated heart rate.', low: 'Palpitations with a low measured heart rate may suggest intermittent arrhythmia.' },
    },
    conditions: ['Supraventricular tachycardia', 'Premature ventricular contractions', 'Atrial fibrillation', 'Anxiety-induced palpitations'],
    medications: {
      otc: ['Magnesium glycinate 400mg — may help regulate heart rhythm', 'Avoid caffeine, nicotine, and decongestants which can worsen palpitations'],
      advice: ['Try vagal maneuvers: bear down as if having a bowel movement, or splash cold water on your face', 'Slow deep breathing: inhale 4 seconds, hold 4 seconds, exhale 6 seconds', 'If accompanied by chest pain, fainting, or lasting >15 minutes — seek emergency care immediately'],
    },
  },
  sweating: {
    label: 'Excessive Sweating',
    systems: ['autonomic', 'cardiac'],
    severity: 'warning',
    followUps: [
      { q: 'Is the sweating accompanied by any feeling of anxiety or restlessness?', key: 'sweat_anxiety' },
      { q: 'Is the sweating localized (e.g., palms) or generalized?', key: 'sweat_location' },
    ],
    vitalCorrelations: {
      heartRate: { high: 'Diaphoresis with tachycardia can indicate a sympathetic overdrive or cardiac event.' },
      temperature: { high: 'Sweating with fever is the body\'s thermoregulatory mechanism.' },
    },
    conditions: ['Autonomic dysfunction', 'Anxiety/panic attack', 'Hypoglycemia', 'Hyperhidrosis'],
    medications: {
      otc: ['If suspected hypoglycemia: consume 15g fast-acting carbs (juice, glucose tablets)', 'Clinical-strength antiperspirant for focal hyperhidrosis'],
      advice: ['Check blood sugar if you have diabetes or haven\'t eaten recently', 'Cold sweats with chest pain/shortness of breath require emergency evaluation'],
    },
  },
  weakness: {
    label: 'Weakness',
    systems: ['neurological', 'musculoskeletal'],
    severity: 'warning',
    followUps: [
      { q: 'Is the weakness on one side of your body, or is it generalized?', key: 'weakness_side' },
      { q: 'Did the weakness come on suddenly?', key: 'weakness_onset' },
      { q: 'Are you having any difficulty with speech or facial drooping?', key: 'stroke_signs' },
    ],
    vitalCorrelations: {
      spo2: { low: 'Muscular weakness with low oxygenation may reflect tissue-level oxygen deprivation.' },
      heartRate: { low: 'Weakness with bradycardia may suggest inadequate cardiac output.' },
      bloodPressure: { high: 'Sudden weakness with hypertension — consider stroke risk.' },
    },
    conditions: ['Neuromuscular fatigue', 'Electrolyte imbalance', 'Peripheral neuropathy', 'Transient ischemic attack'],
    medications: {
      otc: ['Electrolyte replenishment (Pedialyte, Gatorade, or ORS)', 'Potassium-rich foods: bananas, oranges, potatoes'],
      advice: ['CRITICAL: One-sided weakness + facial drooping + speech difficulty = CALL 911 IMMEDIATELY (possible stroke)', 'Note the exact time symptoms started — critical for treatment decisions', 'Do not take aspirin if stroke is suspected unless directed by emergency services'],
    },
  },
  cough: {
    label: 'Cough',
    systems: ['respiratory'],
    severity: 'info',
    followUps: [
      { q: 'Is the cough dry or productive (bringing up mucus)?', key: 'cough_type' },
      { q: 'How long have you had the cough?', key: 'cough_duration' },
      { q: 'Is there any blood in the mucus when you cough?', key: 'hemoptysis' },
    ],
    vitalCorrelations: {
      temperature: { high: 'Cough with fever suggests respiratory infection — URI, bronchitis, or pneumonia.' },
      spo2: { low: 'Cough with low oxygen saturation requires chest X-ray evaluation.' },
    },
    conditions: ['Upper respiratory infection', 'Bronchitis', 'Allergic cough', 'Post-nasal drip', 'Pneumonia'],
    medications: {
      otc: ['Dextromethorphan (Robitussin DM) for dry cough — 10-20mg every 4 hours', 'Guaifenesin (Mucinex) 400mg for productive cough — helps thin mucus', 'Honey and warm water — evidence-based cough suppressant', 'Throat lozenges with menthol for irritation'],
      advice: ['Stay hydrated to thin secretions', 'Use a humidifier at night', 'Elevate your head while sleeping', 'If cough persists >3 weeks or produces blood, seek medical evaluation'],
    },
  },
  anxiety: {
    label: 'Anxiety / Panic',
    systems: ['neurological', 'cardiac'],
    severity: 'warning',
    followUps: [
      { q: 'Are you experiencing racing thoughts, trembling, or a sense of impending doom?', key: 'anxiety_symptoms' },
      { q: 'How frequently do you experience these episodes?', key: 'anxiety_freq' },
      { q: 'Is there a specific trigger for this episode?', key: 'anxiety_trigger' },
    ],
    vitalCorrelations: {
      heartRate: { high: 'Elevated heart rate is consistent with an anxiety/sympathetic response.' },
    },
    conditions: ['Generalized anxiety', 'Panic attack', 'Stress response', 'Hyperventilation syndrome'],
    medications: {
      otc: ['Chamomile tea — has mild anxiolytic properties', 'Magnesium glycinate 400mg — may help with anxiety', 'Melatonin 3mg at bedtime if anxiety is disrupting sleep'],
      advice: ['4-7-8 Breathing technique: Inhale 4s → Hold 7s → Exhale 8s. Repeat 4 cycles', 'Grounding exercise: Name 5 things you see, 4 you touch, 3 you hear, 2 you smell, 1 you taste', 'Avoid caffeine and alcohol during acute episodes', 'If panic attacks are recurrent, consider cognitive behavioral therapy (CBT)'],
    },
  },
};

// ─── KEYWORD ALIASES ───
const ALIASES = {
  'short of breath': 'breath', 'shortness of breath': 'breath', 'breathing': 'breath', 'breathless': 'breath', 'suffocate': 'breath', "can't breathe": 'breath', 'difficulty breathing': 'breath',
  'dizzy': 'dizzy', 'lightheaded': 'dizzy', 'vertigo': 'dizzy', 'spinning': 'dizzy', 'faint': 'dizzy', 'unsteady': 'dizzy', 'light headed': 'dizzy',
  'chest pain': 'chest', 'chest pressure': 'chest', 'chest tight': 'chest', 'chest heavy': 'chest', 'heart pain': 'chest',
  'headache': 'headache', 'head hurts': 'headache', 'head pain': 'headache', 'migraine': 'headache', 'head ache': 'headache',
  'tired': 'fatigue', 'fatigue': 'fatigue', 'exhausted': 'fatigue', 'no energy': 'fatigue', 'lethargic': 'fatigue', 'sluggish': 'fatigue', 'low energy': 'fatigue',
  'nausea': 'nausea', 'nauseous': 'nausea', 'vomit': 'nausea', 'throwing up': 'nausea', 'sick to stomach': 'nausea', 'feel sick': 'nausea', 'stomach': 'nausea',
  'fever': 'fever', 'hot': 'fever', 'chills': 'fever', 'shivering': 'fever', 'burning up': 'fever', 'temperature': 'fever',
  'palpitation': 'palpitation', 'pounding heart': 'palpitation', 'heart racing': 'palpitation', 'heart flutter': 'palpitation', 'fast heartbeat': 'palpitation', 'heart beat': 'palpitation',
  'sweating': 'sweating', 'sweaty': 'sweating', 'perspiration': 'sweating', 'cold sweat': 'sweating',
  'weak': 'weakness', 'weakness': 'weakness', "can't move": 'weakness', 'heavy limbs': 'weakness', 'no strength': 'weakness',
  'cough': 'cough', 'coughing': 'cough', 'dry cough': 'cough', 'wet cough': 'cough', 'phlegm': 'cough',
  'anxiety': 'anxiety', 'anxious': 'anxiety', 'panic': 'anxiety', 'panic attack': 'anxiety', 'nervous': 'anxiety', 'stressed': 'anxiety', 'worry': 'anxiety',
  'pain': 'chest', 'ache': 'headache',
};

// ─── RISK FACTOR DATABASE ───
const RISK_FACTORS = {
  diabetes: {
    label: 'Diabetes',
    interactions: { dizzy: 'hypoglycemia', sweating: 'hypoglycemia', fatigue: 'poor glucose control', weakness: 'diabetic neuropathy' },
    warnings: ['Monitor blood sugar levels closely during illness', 'Dehydration is more dangerous with diabetes'],
  },
  hypertension: {
    label: 'Hypertension',
    interactions: { headache: 'hypertensive crisis', dizzy: 'medication side effect', chest: 'increased cardiac risk' },
    warnings: ['Ensure you are taking blood pressure medication as prescribed', 'Avoid high-sodium foods'],
  },
  asthma: {
    label: 'Asthma',
    interactions: { breath: 'asthma exacerbation', cough: 'reactive airway', chest: 'bronchospasm' },
    warnings: ['Keep rescue inhaler accessible', 'If using rescue inhaler >2x/week, your asthma may be poorly controlled'],
  },
  heartDisease: {
    label: 'Heart Disease',
    interactions: { chest: 'ischemic event', palpitation: 'arrhythmia', breath: 'heart failure', sweating: 'cardiac event' },
    warnings: ['Any new or worsening chest pain should be treated as a potential emergency', 'Take prescribed nitroglycerin if available'],
  },
  thyroid: {
    label: 'Thyroid Disorder',
    interactions: { fatigue: 'thyroid dysfunction', palpitation: 'hyperthyroidism', weakness: 'hypothyroidism' },
    warnings: ['Ensure thyroid medication is taken consistently, ideally on an empty stomach'],
  },
};

// ─── DETECT SYMPTOMS ───
function detectSymptoms(text) {
  const lower = text.toLowerCase();
  const found = new Set();
  const sortedAliases = Object.keys(ALIASES).sort((a, b) => b.length - a.length);
  for (const alias of sortedAliases) {
    if (lower.includes(alias)) found.add(ALIASES[alias]);
  }
  return [...found];
}

// ─── VITAL ANALYSIS ───
function isHigh(vital, value) {
  if (vital === 'heartRate') return value > 100;
  if (vital === 'temperature') return value > 99.5;
  if (vital === 'bloodPressure') return value > 140;
  return false;
}
function isLow(vital, value) {
  if (vital === 'heartRate') return value < 60;
  if (vital === 'spo2') return value < 95;
  if (vital === 'temperature') return value < 96.5;
  if (vital === 'bloodPressure') return value < 90;
  return false;
}

// ─── PATIENT CONTEXT ANALYSIS ───
function analyzePatientContext(profile, symptomKeys) {
  const contextInsights = [];
  const riskWarnings = [];
  let severityEscalation = false;

  if (!profile) return { contextInsights, riskWarnings, severityEscalation };

  // Age-based risk
  if (profile.age >= 65) {
    contextInsights.push(`At age ${profile.age}, there is an elevated baseline risk for cardiac and cerebrovascular events. I'm factoring this into my assessment.`);
    if (symptomKeys.includes('chest') || symptomKeys.includes('weakness') || symptomKeys.includes('dizzy')) {
      severityEscalation = true;
    }
  }
  if (profile.age >= 50 && symptomKeys.includes('chest')) {
    contextInsights.push('Given your age and chest symptoms, cardiac causes should be prioritized in the differential.');
    severityEscalation = true;
  }

  // BMI-based risk
  if (profile.weight && profile.height) {
    const heightM = profile.height / 100;
    const bmi = profile.weight / (heightM * heightM);
    if (bmi > 30) {
      contextInsights.push(`Your BMI of ${bmi.toFixed(1)} (obese range) increases cardiovascular and metabolic risk.`);
    } else if (bmi > 25) {
      contextInsights.push(`Your BMI of ${bmi.toFixed(1)} (overweight) is a modifiable risk factor.`);
    }
  }

  // BP-based risk
  if (profile.bpSystolic) {
    if (profile.bpSystolic >= 180 || profile.bpDiastolic >= 120) {
      contextInsights.push(`Your blood pressure of ${profile.bpSystolic}/${profile.bpDiastolic} is in the hypertensive crisis range. This is dangerous.`);
      severityEscalation = true;
    } else if (profile.bpSystolic >= 140 || profile.bpDiastolic >= 90) {
      contextInsights.push(`Your blood pressure of ${profile.bpSystolic}/${profile.bpDiastolic} is elevated (Stage 2 hypertension).`);
    }
  }

  // Existing conditions cross-reference
  if (profile.conditions && profile.conditions.length > 0) {
    for (const cond of profile.conditions) {
      const rf = RISK_FACTORS[cond];
      if (!rf) continue;
      for (const sk of symptomKeys) {
        if (rf.interactions[sk]) {
          contextInsights.push(`Given your history of ${rf.label}, your ${SYMPTOM_DB[sk]?.label || sk} may be related to ${rf.interactions[sk]}.`);
          if (cond === 'heartDisease' && (sk === 'chest' || sk === 'breath')) severityEscalation = true;
        }
      }
      riskWarnings.push(...rf.warnings);
    }
  }

  // Medication interactions
  if (profile.medications && profile.medications.trim()) {
    const meds = profile.medications.toLowerCase();
    if (meds.includes('blood thinner') || meds.includes('warfarin') || meds.includes('aspirin')) {
      riskWarnings.push('You are on blood thinning medication — avoid taking additional aspirin or NSAIDs without physician guidance.');
    }
    if (meds.includes('insulin') || meds.includes('metformin')) {
      riskWarnings.push('Your diabetes medication may need adjustment during illness — monitor blood sugar more frequently.');
    }
    if (meds.includes('beta blocker') || meds.includes('atenolol') || meds.includes('metoprolol')) {
      riskWarnings.push('Your beta-blocker may mask tachycardia symptoms — heart rate alone may not reflect true severity.');
    }
  }

  // Allergies
  if (profile.allergies && profile.allergies.trim()) {
    riskWarnings.push(`Drug allergies noted: ${profile.allergies}. Any medication recommendations will account for this.`);
  }

  return { contextInsights, riskWarnings: [...new Set(riskWarnings)], severityEscalation };
}

// ─── BUILD INITIAL ANALYSIS ───
function buildInitialAnalysis(symptomKeys, profile) {
  const systems = new Set();
  const labels = [];
  let maxSeverity = 'info';

  for (const key of symptomKeys) {
    const s = SYMPTOM_DB[key];
    if (!s) continue;
    labels.push(s.label);
    s.systems.forEach((sys) => systems.add(sys));
    if (s.severity === 'critical') maxSeverity = 'critical';
    else if (s.severity === 'warning' && maxSeverity !== 'critical') maxSeverity = 'warning';
  }

  const systemStr = [...systems].join(' and ');
  const labelStr = labels.join(' and ');

  let greeting = '';
  if (profile) {
    greeting = `Thank you${profile.name ? ', ' + profile.name : ''}. I've reviewed your profile`;
    if (profile.conditions?.length) greeting += `, noting your history of ${profile.conditions.map(c => RISK_FACTORS[c]?.label || c).join(', ')}`;
    greeting += '. ';
  }

  const templates = [
    `${greeting}Based on your description of ${labelStr.toLowerCase()}, I'm detecting possible ${systemStr} involvement. Let me ask you a few targeted questions to refine my assessment.`,
    `${greeting}Your symptoms — ${labelStr.toLowerCase()} — point toward ${systemStr} system concerns. I need to ask some follow-up questions to determine the best course of action.`,
    `${greeting}I've identified ${labelStr.toLowerCase()} in your report, which may involve the ${systemStr} system${systems.size > 1 ? 's' : ''}. Let me gather more information before making my recommendations.`,
  ];

  return {
    message: templates[Math.floor(Math.random() * templates.length)],
    severity: maxSeverity,
    systems: [...systems],
    labels,
  };
}

// ─── GET FOLLOW-UP QUESTIONS ───
function getFollowUpQuestions(symptomKeys, alreadyAsked = []) {
  const questions = [];
  for (const key of symptomKeys) {
    const s = SYMPTOM_DB[key];
    if (!s) continue;
    for (const fu of s.followUps) {
      if (!alreadyAsked.includes(fu.key) && questions.length < 4) {
        questions.push({ ...fu, symptom: key });
      }
    }
  }
  return questions.slice(0, 2);
}

// ─── BUILD FINAL ASSESSMENT (THE DOCTOR'S DIAGNOSIS) ───
function buildFinalAssessment(symptomKeys, answers, vitals, profile) {
  const conditions = [];
  const insights = [];
  const recommendations = [];
  const medications = { otc: [], advice: [] };
  let overallSeverity = 'info';

  for (const key of symptomKeys) {
    const s = SYMPTOM_DB[key];
    if (!s) continue;

    conditions.push(...s.conditions.slice(0, 2));

    // Vital correlations
    if (vitals && s.vitalCorrelations) {
      for (const [vital, levels] of Object.entries(s.vitalCorrelations)) {
        const val = vitals[vital];
        if (val !== undefined) {
          if (isHigh(vital, val) && levels.high) insights.push(levels.high);
          if (isLow(vital, val) && levels.low) insights.push(levels.low);
        }
      }
    }

    // Medications
    if (s.medications) {
      medications.otc.push(...s.medications.otc);
      medications.advice.push(...s.medications.advice);
    }

    if (s.severity === 'critical') overallSeverity = 'critical';
    else if (s.severity === 'warning' && overallSeverity !== 'critical') overallSeverity = 'warning';
  }

  // Process follow-up answers
  for (const ans of answers) {
    const lower = ans.answer.toLowerCase();
    if (ans.key === 'chest_tight' && (lower.includes('yes') || lower.includes('tight'))) {
      insights.push('The presence of chest tightness alongside breathing difficulty strengthens the cardiac differential.');
      overallSeverity = 'critical';
    }
    if (ans.key === 'radiation' && (lower.includes('yes') || lower.includes('arm') || lower.includes('jaw'))) {
      insights.push('Pain radiating to the arm or jaw is a classic indicator of cardiac ischemia. Immediate evaluation is strongly advised.');
      overallSeverity = 'critical';
    }
    if (ans.key === 'onset' && lower.includes('sudden')) {
      insights.push('Sudden onset of symptoms raises the urgency of this assessment.');
      overallSeverity = 'critical';
    }
    if (ans.key === 'dizzy_type' && lower.includes('standing')) {
      insights.push('Postural dizziness suggests orthostatic hypotension, possibly due to dehydration or autonomic dysfunction.');
    }
    if (ans.key === 'hydration' && (lower.includes('no') || lower.includes('not much') || lower.includes('little'))) {
      insights.push('Inadequate fluid intake is a common and treatable cause of dizziness.');
      recommendations.push('Increase oral fluid intake — aim for at least 2-3 liters of water per day.');
    }
    if (ans.key === 'fatigue_duration' && (lower.includes('week') || lower.includes('month') || lower.includes('long'))) {
      insights.push('Prolonged fatigue lasting weeks warrants lab work: CBC, TSH, B12, iron studies, fasting glucose.');
    }
    if (ans.key === 'pain_type' && lower.includes('sharp')) {
      insights.push('Sharp, stabbing pain is more commonly musculoskeletal or pleuritic, reducing cardiac concern slightly.');
    }
    if (ans.key === 'pain_type' && (lower.includes('dull') || lower.includes('pressure'))) {
      insights.push('Dull pressure-like chest pain has a higher association with cardiac pathology.');
      overallSeverity = 'critical';
    }
    if (ans.key === 'head_severity') {
      const num = parseInt(lower);
      if (num >= 8) {
        insights.push('Severe headache intensity (8+/10) — consider imaging if this is "worst headache of your life".');
        overallSeverity = 'critical';
      }
    }
    if (ans.key === 'stroke_signs' && (lower.includes('yes') || lower.includes('drooping') || lower.includes('slur'))) {
      insights.push('STROKE WARNING: Facial drooping and/or speech difficulty with weakness constitute a stroke emergency. Call 911 immediately.');
      overallSeverity = 'critical';
    }
    if (ans.key === 'hemoptysis' && (lower.includes('yes') || lower.includes('blood'))) {
      insights.push('Hemoptysis (blood in cough) requires urgent medical evaluation to rule out serious pulmonary pathology.');
      overallSeverity = 'critical';
    }
    if (ans.key === 'palp_assoc' && (lower.includes('yes') || lower.includes('lightheaded') || lower.includes('breath'))) {
      insights.push('Palpitations with hemodynamic symptoms (lightheadedness/breathlessness) suggest a significant arrhythmia.');
      overallSeverity = 'critical';
    }
  }

  // Patient context analysis
  const patientContext = analyzePatientContext(profile, symptomKeys);
  insights.push(...patientContext.contextInsights);
  if (patientContext.severityEscalation) overallSeverity = 'critical';

  // Filter medications based on allergies
  if (profile?.allergies) {
    const allergyLower = profile.allergies.toLowerCase();
    if (allergyLower.includes('aspirin') || allergyLower.includes('nsaid')) {
      medications.otc = medications.otc.filter(m => !m.toLowerCase().includes('aspirin') && !m.toLowerCase().includes('ibuprofen'));
      medications.advice.push('⚠ NSAIDs/Aspirin excluded from recommendations due to your allergy.');
    }
    if (allergyLower.includes('penicillin') || allergyLower.includes('amoxicillin')) {
      medications.advice.push('⚠ Penicillin allergy noted — if antibiotics are needed, your doctor will prescribe alternatives.');
    }
  }

  // Determine action
  let actionRequired = 'self_care';
  let actionReason = '';

  if (overallSeverity === 'critical') {
    // Determine if emergency or appointment
    const isEmergency = symptomKeys.some(k => {
      if (k === 'chest' || k === 'breath') return true;
      return false;
    }) || insights.some(i => i.includes('STROKE') || i.includes('911') || i.includes('emergency'));

    const hasHighRiskVitals = vitals && (
      (vitals.spo2 && vitals.spo2 < 90) ||
      (vitals.heartRate && (vitals.heartRate > 130 || vitals.heartRate < 45)) ||
      (vitals.temperature && vitals.temperature > 103)
    );

    if (isEmergency || hasHighRiskVitals) {
      actionRequired = 'emergency';
      actionReason = 'Based on severity of symptoms and clinical indicators, immediate emergency medical attention is recommended.';
    } else {
      actionRequired = 'appointment';
      actionReason = 'Your symptoms require professional medical evaluation. I recommend scheduling an appointment within 24-48 hours.';
    }
  } else if (overallSeverity === 'warning' && patientContext.severityEscalation) {
    actionRequired = 'appointment';
    actionReason = 'Given your medical history, these symptoms warrant a physician consultation.';
  }

  // Build clinical insight
  let clinicalInsight;
  if (insights.length > 0) {
    clinicalInsight = insights.slice(0, 4).join(' ');
  } else {
    const labels = symptomKeys.map((k) => SYMPTOM_DB[k]?.label || k).join(' and ');
    clinicalInsight = `Based on the reported ${labels.toLowerCase()}, the most likely explanations involve functional or self-limiting causes. No immediately alarming pattern was detected, though continued monitoring is recommended.`;
  }

  // Build recommendations based on severity
  if (recommendations.length === 0) {
    if (overallSeverity === 'critical') {
      recommendations.push('Seek medical evaluation immediately — do not delay.');
      recommendations.push('Avoid physical exertion until cleared by a physician.');
      recommendations.push('If symptoms worsen, call emergency services (911) immediately.');
      recommendations.push('Have someone stay with you until you receive medical attention.');
    } else if (overallSeverity === 'warning') {
      recommendations.push('Rest and monitor symptoms closely over the next few hours.');
      recommendations.push('Stay hydrated and avoid heavy physical activity.');
      recommendations.push('If symptoms persist beyond 24 hours or worsen, schedule a medical consultation.');
    } else {
      recommendations.push('Continue monitoring your condition at home.');
      recommendations.push('Maintain regular hydration and adequate sleep.');
      recommendations.push('No immediate medical intervention appears necessary based on current assessment.');
    }
  }

  // Confidence assessment
  let confidence = 'Moderate';
  if (vitals && insights.length >= 2) confidence = 'High';
  if (profile && profile.conditions?.length > 0) confidence = 'High';
  if (symptomKeys.length === 1 && answers.length === 0) confidence = 'Low';

  return {
    conditions: [...new Set(conditions)],
    clinicalInsight,
    severity: overallSeverity,
    confidence,
    recommendations,
    medications: {
      otc: [...new Set(medications.otc)].slice(0, 5),
      advice: [...new Set(medications.advice)].slice(0, 5),
    },
    riskWarnings: patientContext.riskWarnings,
    vitalCorrelated: vitals != null,
    actionRequired,
    actionReason,
  };
}

// ─── MAIN HANDLER ───
function handleSymptomChat(session) {
  const { phase, text, symptomKeys, askedQuestions, answers, vitals, profile } = session;

  if (phase === 'initial') {
    const detected = detectSymptoms(text);
    if (detected.length === 0) {
      return {
        type: 'clarify',
        message: "I need a bit more detail to help you. Could you describe your symptoms more specifically? For example: headache, chest pain, shortness of breath, dizziness, fatigue, nausea, cough, or palpitations.",
        symptomKeys: [],
        askedQuestions: [],
      };
    }

    const analysis = buildInitialAnalysis(detected, profile);
    const questions = getFollowUpQuestions(detected, []);

    return {
      type: 'followup',
      message: analysis.message,
      severity: analysis.severity,
      symptomKeys: detected,
      questions,
      askedQuestions: questions.map((q) => q.key),
    };
  }

  if (phase === 'followup') {
    const moreQuestions = getFollowUpQuestions(symptomKeys, askedQuestions);
    if (moreQuestions.length > 0 && askedQuestions.length < 6) {
      return {
        type: 'followup',
        message: 'Thank you. Let me ask a couple more questions to complete my assessment:',
        questions: moreQuestions,
        symptomKeys,
        askedQuestions: [...askedQuestions, ...moreQuestions.map((q) => q.key)],
      };
    }

    const assessment = buildFinalAssessment(symptomKeys, answers, vitals, profile);
    return { type: 'final', ...assessment, symptomKeys };
  }

  if (phase === 'more') {
    const extra = [];
    for (const key of symptomKeys) {
      const s = SYMPTOM_DB[key];
      if (!s) continue;
      for (const fu of s.followUps) {
        if (!askedQuestions.includes(fu.key)) extra.push({ ...fu, symptom: key });
      }
    }

    if (extra.length === 0) {
      const assessment = buildFinalAssessment(symptomKeys, answers, vitals, profile);
      return { type: 'final', message: "I've completed my assessment. Here are my findings and recommendations:", ...assessment, symptomKeys };
    }

    return {
      type: 'followup',
      message: 'Let me ask a few more questions for a more precise diagnosis:',
      questions: extra.slice(0, 2),
      symptomKeys,
      askedQuestions: [...askedQuestions, ...extra.slice(0, 2).map((q) => q.key)],
    };
  }

  if (phase === 'final') {
    const assessment = buildFinalAssessment(symptomKeys, answers, vitals, profile);
    return { type: 'final', ...assessment, symptomKeys };
  }

  return { type: 'error', message: 'Invalid session state.' };
}

module.exports = { handleSymptomChat, detectSymptoms };
