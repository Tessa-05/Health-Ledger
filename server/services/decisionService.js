/**
 * decisionService.js
 *
 * Decision engine that takes analysis results + ML predictions
 * and determines what actions the system should take.
 */

const Log = require('../models/Log');

/**
 * evaluateActions
 *
 * @param {Object} params
 * @param {string} params.userId
 * @param {Array}  params.healthReport
 * @param {string} params.insight
 * @param {Array}  params.alerts
 * @param {Object} params.vitals
 * @param {Object|null} params.mlPredictions — { hypoxia, fever, cardiac_risk, stress }
 * @returns {Object} — { actionType, actions, autoTriggered }
 */
exports.evaluateActions = async ({ userId, healthReport, insight, alerts, vitals, mlPredictions, anomaly }) => {
  const actions = [];
  let actionType = 'recommendation';
  let autoTriggered = false;

  const critical = healthReport.filter((o) => o.severity === 'critical');
  const warnings = healthReport.filter((o) => o.severity === 'warning');

  // ─── ML-ENHANCED ESCALATION ───
  let mlEscalation = false;
  if (mlPredictions) {
    const highRiskConditions = Object.entries(mlPredictions)
      .filter(([, prob]) => prob > 0.7)
      .map(([condition]) => condition);

    if (highRiskConditions.length >= 2) {
      mlEscalation = true;
    }

    // Critical ML override: cardiac_risk > 0.8 or hypoxia > 0.7
    if (mlPredictions.cardiac_risk > 0.8 || mlPredictions.hypoxia > 0.7) {
      mlEscalation = true;
    }
  }

  // ─── ANOMALY-ENHANCED ESCALATION ───
  const isAnomalous = anomaly && anomaly.status === 'abnormal';
  if (isAnomalous && mlPredictions) {
    const anyHighRisk = Object.values(mlPredictions).some((p) => p > 0.8);
    if (anyHighRisk) mlEscalation = true;
  }

  // ─── CRITICAL → EMERGENCY ───
  if (alerts.length > 0 || critical.length >= 2 || (mlEscalation && critical.length >= 1)) {
    actionType = 'emergency';
    autoTriggered = true;

    actions.push({
      action: 'emergency_alert',
      message: 'Critical condition detected. Emergency protocols activated.',
      steps: [
        'Connecting to emergency services...',
        'Notifying emergency contact...',
        'Preparing patient condition summary...',
      ],
      mlConfidence: mlPredictions || null,
    });

    actions.push({
      action: 'call_ambulance',
      message: 'Ambulance dispatch recommended.',
      details: 'Share your live location with emergency responders.',
    });

    await logEvent(userId, 'alert', `Emergency alert triggered: ${insight}`, {
      mlPredictions,
    });
  }

  // ─── WARNING + COMBINATIONS → APPOINTMENT ───
  else if (warnings.length >= 2 || critical.length === 1 || mlEscalation) {
    actionType = 'appointment';

    const mlNote = mlEscalation
      ? ' ML model confirms elevated risk levels.'
      : '';

    actions.push({
      action: 'book_appointment',
      message: `Medical consultation recommended based on your vitals.${mlNote}`,
      reason: insight,
      suggestedTimeframe: mlEscalation ? 'Within 24 hours' : 'Within 24-48 hours',
      mlConfidence: mlPredictions || null,
    });

    await logEvent(userId, 'recommendation', `Appointment suggested: ${insight}`, {
      mlPredictions,
    });
  }

  // ─── MILD → GENERAL RECOMMENDATION ───
  else {
    actionType = 'recommendation';

    if (warnings.length === 1) {
      actions.push({
        action: 'monitor',
        message: 'Mild abnormality detected. Continue monitoring your vitals.',
        detail: warnings[0].detail,
        mlConfidence: mlPredictions || null,
      });
      await logEvent(userId, 'recommendation', `Monitoring advised: ${warnings[0].label}`, {
        mlPredictions,
      });
    } else {
      actions.push({
        action: 'all_clear',
        message: 'All vitals are within normal limits. Keep up the healthy lifestyle.',
        mlConfidence: mlPredictions || null,
      });
    }
  }

  return { actionType, actions, autoTriggered };
};

/**
 * Log an event to the database
 */
async function logEvent(userId, type, message, metadata = {}) {
  try {
    await Log.create({ userId, type, message, metadata });
  } catch (err) {
    console.error('Failed to log event:', err.message);
  }
}

exports.logEvent = logEvent;
