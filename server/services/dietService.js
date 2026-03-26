/**
 * dietService.js
 *
 * Condition-based diet and lifestyle recommendations.
 * Returns recommended foods/actions and items to avoid.
 */

const dietMap = {
  fever: {
    conditions: ['Fever', 'Temperature', 'Fever-induced'],
    recommended: [
      'Drink plenty of water and electrolyte-rich fluids (ORS, coconut water)',
      'Eat light meals — rice porridge, soups, broths',
      'Include fruits rich in Vitamin C — oranges, kiwi, strawberries',
      'Herbal teas — ginger, chamomile, tulsi',
      'Easily digestible proteins — boiled eggs, lentil soup',
    ],
    avoid: [
      'Oily and fried foods',
      'Spicy foods that may cause stomach irritation',
      'Heavy dairy products',
      'Processed and junk food',
      'Caffeinated beverages',
    ],
    lifestyle: [
      'Rest adequately — aim for 8+ hours of sleep',
      'Keep the room well-ventilated',
      'Use lukewarm sponging to manage temperature',
      'Avoid strenuous physical activity',
    ],
  },

  lowOxygen: {
    conditions: ['Hypoxia', 'Oxygen', 'Compensatory'],
    recommended: [
      'Iron-rich foods — spinach, beetroot, lentils, red meat',
      'Vitamin C-rich foods to boost iron absorption',
      'Pomegranate and beetroot juice',
      'Nuts and seeds — almonds, walnuts',
      'Green leafy vegetables',
    ],
    avoid: [
      'Smoking and tobacco products',
      'Alcohol consumption',
      'Highly processed foods',
      'Excessive salt intake',
    ],
    lifestyle: [
      'Practice deep breathing exercises (pranayama)',
      'Ensure proper ventilation — open windows',
      'Avoid heavy physical exertion',
      'Practice pursed-lip breathing technique',
      'Sit upright to maximize lung expansion',
    ],
  },

  highHeartRate: {
    conditions: ['Tachycardia', 'Elevated Heart Rate', 'Stress-induced'],
    recommended: [
      'Potassium-rich foods — bananas, sweet potatoes, avocados',
      'Magnesium-rich foods — dark chocolate, almonds, cashews',
      'Omega-3 fatty acids — salmon, flaxseeds, walnuts',
      'Whole grains — oats, brown rice',
      'Herbal teas — chamomile, passionflower',
    ],
    avoid: [
      'Caffeine — coffee, energy drinks, strong tea',
      'Alcohol and nicotine',
      'High-sugar foods and drinks',
      'Excessive sodium',
      'Stimulant-containing supplements',
    ],
    lifestyle: [
      'Practice meditation or mindfulness daily',
      'Engage in light yoga or stretching',
      'Ensure 7-8 hours of quality sleep',
      'Avoid stressful situations when possible',
      'Take regular breaks during work',
    ],
  },

  lowHeartRate: {
    conditions: ['Bradycardia', 'Reduced Heart Rate'],
    recommended: [
      'Complex carbohydrates for sustained energy',
      'Lean proteins — chicken, fish, tofu',
      'Small, frequent meals throughout the day',
      'Healthy fats — olive oil, nuts',
      'B-vitamin rich foods — eggs, fortified cereals',
    ],
    avoid: [
      'Large heavy meals',
      'Excessive high-fiber foods that slow digestion',
      'Alcohol consumption',
    ],
    lifestyle: [
      'Light to moderate exercise as tolerated',
      'Monitor for dizziness when standing up',
      'Stay hydrated throughout the day',
      'Consult a cardiologist for persistent symptoms',
    ],
  },

  cardiac: {
    conditions: ['Irregular', 'Cardiac', 'ECG'],
    recommended: [
      'Heart-healthy diet — Mediterranean style',
      'Omega-3 rich fish — salmon, mackerel, sardines',
      'Fiber-rich foods — oats, beans, berries',
      'Antioxidant-rich fruits — blueberries, pomegranate',
      'Potassium-rich foods for heart rhythm regulation',
    ],
    avoid: [
      'Trans fats and saturated fats',
      'Excessive caffeine and stimulants',
      'High-sodium processed foods',
      'Energy drinks',
      'Excessive alcohol',
    ],
    lifestyle: [
      'Schedule regular ECG monitoring',
      'Avoid intense physical exertion until evaluated',
      'Practice stress management techniques',
      'Maintain a consistent sleep schedule',
      'Keep a symptom journal for your cardiologist',
    ],
  },

  stress: {
    conditions: ['Stress', 'Fatigue', 'HRV'],
    recommended: [
      'Magnesium-rich foods — dark leafy greens, nuts, seeds',
      'Complex carbohydrates — whole grains, sweet potatoes',
      'Probiotic foods — yogurt, kefir, kimchi',
      'Dark chocolate (70%+ cocoa) in moderation',
      'Warm milk with turmeric before bed',
    ],
    avoid: [
      'Excessive caffeine after 2 PM',
      'Sugar-heavy snacks and drinks',
      'Alcohol as a stress reliever',
      'Skipping meals',
    ],
    lifestyle: [
      'Practice 10-15 minutes of meditation daily',
      'Engage in regular moderate exercise',
      'Maintain a gratitude journal',
      'Limit screen time before sleep',
      'Connect with friends or family for emotional support',
    ],
  },
};

/**
 * getDietRecommendations
 *
 * @param {Array} healthReport — array of observations from analysisService
 * @returns {Object} — { recommended, avoid, lifestyle, matchedConditions }
 */
exports.getDietRecommendations = (healthReport) => {
  const recommended = new Set();
  const avoid = new Set();
  const lifestyle = new Set();
  const matchedConditions = [];

  const abnormal = healthReport.filter((o) => o.severity !== 'normal');

  if (abnormal.length === 0) {
    return {
      matchedConditions: ['Healthy'],
      recommended: [
        'Maintain a balanced diet with all food groups',
        'Eat 5 servings of fruits and vegetables daily',
        'Include lean proteins and whole grains',
        'Stay hydrated — drink 8+ glasses of water daily',
        'Include probiotic-rich foods for gut health',
      ],
      avoid: [
        'Excessive processed and junk food',
        'High sugar and high sodium intake',
        'Skipping meals or overeating',
      ],
      lifestyle: [
        'Exercise 30 minutes daily — walking, jogging, or yoga',
        'Sleep 7-8 hours consistently',
        'Schedule routine annual health checkups',
        'Manage stress with hobbies and relaxation',
      ],
    };
  }

  for (const obs of abnormal) {
    const label = obs.label || '';
    for (const [key, plan] of Object.entries(dietMap)) {
      const matches = plan.conditions.some((c) => label.includes(c));
      if (matches) {
        if (!matchedConditions.includes(key)) matchedConditions.push(key);
        plan.recommended.forEach((r) => recommended.add(r));
        plan.avoid.forEach((a) => avoid.add(a));
        plan.lifestyle.forEach((l) => lifestyle.add(l));
      }
    }
  }

  return {
    matchedConditions,
    recommended: Array.from(recommended),
    avoid: Array.from(avoid),
    lifestyle: Array.from(lifestyle),
  };
};
