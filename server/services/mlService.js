/**
 * mlService.js
 *
 * Node.js client that calls the Python Flask ML prediction server.
 * Applies feature engineering validation before sending to ML.
 */

const ML_PORT = process.env.ML_PORT || 5001;
const ML_URL = `http://localhost:${ML_PORT}`;

/**
 * getMLPredictions
 *
 * @param {Object} vitals — { heartRate, spo2, temperature, ecg: { rhythm, hrv } }
 * @returns {Object|null} — { predictions, riskLevels, features } or null on failure
 */
exports.getMLPredictions = async (vitals) => {
  try {
    const payload = {
      heartRate: vitals.heartRate,
      spo2: vitals.spo2,
      temperature: vitals.temperature,
      ecg: {
        rhythm: vitals.ecg?.rhythm || 'regular',
        hrv: vitals.ecg?.hrv || 'normal',
      },
    };

    const response = await fetch(`${ML_URL}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      console.error(`ML server error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    return {
      predictions: data.predictions,
      riskLevels: data.riskLevels,
      features: data.features,
      anomaly: data.anomaly || { status: 'unknown', score: 0 },
    };
  } catch (error) {
    console.error(`ML prediction failed: ${error.message}`);
    return null; // graceful fallback — rule engine still works
  }
};

/**
 * isMLServerHealthy
 *
 * @returns {boolean}
 */
exports.isMLServerHealthy = async () => {
  try {
    const response = await fetch(`${ML_URL}/health`, {
      signal: AbortSignal.timeout(2000),
    });
    return response.ok;
  } catch {
    return false;
  }
};
