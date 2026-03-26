const mongoose = require('mongoose');
const Vital = require('../models/Vital');
const { analyzeVitals, computeHealthScore } = require('../services/analysisService');
const { evaluateActions } = require('../services/decisionService');
const { getDietRecommendations } = require('../services/dietService');
const { getMLPredictions } = require('../services/mlService');

// @desc    Submit vitals, save to DB, run analysis + ML + decision engine
// @route   POST /api/analyze
exports.analyze = async (req, res) => {
  try {
    const { userId, heartRate, spo2, temperature, ecg } = req.body;

    // Validate required fields
    if (!userId || heartRate == null || spo2 == null || temperature == null) {
      return res.status(400).json({
        message: 'userId, heartRate, spo2, and temperature are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const currentVitals = {
      heartRate,
      spo2,
      temperature,
      ecg: {
        rhythm: ecg?.rhythm || 'regular',
        hrv: ecg?.hrv || 'normal',
      },
    };

    // 1. Save new reading to database
    const savedVital = await Vital.create({ userId, ...currentVitals });

    // 2. Fetch previous records for trend analysis (last 5)
    const previousVitals = await Vital.find({
      userId,
      _id: { $ne: savedVital._id },
    })
      .sort({ timestamp: -1 })
      .limit(5)
      .lean();

    // 3. Run rule-based analysis engine
    const analysis = analyzeVitals(currentVitals, previousVitals);

    // 4. Run ML predictions (parallel, non-blocking)
    const mlResult = await getMLPredictions(currentVitals);

    // 5. Extract anomaly data
    const anomaly = mlResult?.anomaly || { status: 'unknown', score: 0 };

    // 6. Run decision engine (enhanced with ML + anomaly)
    const decision = await evaluateActions({
      userId,
      healthReport: analysis.healthReport,
      insight: analysis.insight,
      alerts: analysis.alerts,
      vitals: currentVitals,
      mlPredictions: mlResult?.predictions || null,
      anomaly,
    });

    // 7. Get diet recommendations
    const diet = getDietRecommendations(analysis.healthReport);

    // 8. Compute health score (0–100)
    const healthScore = computeHealthScore(
      mlResult?.predictions || null,
      anomaly,
      analysis.trends,
      analysis.healthReport,
    );

    // 9. Build response
    const response = {
      message: 'Analysis complete',
      vitalId: savedVital._id,
      timestamp: savedVital.timestamp,
      healthReport: analysis.healthReport,
      trends: analysis.trends,
      insight: analysis.insight,
      recommendations: analysis.recommendations,
      alerts: analysis.alerts,
      decision,
      diet,
      anomaly,
      healthScore,
    };

    // Add ML predictions if available
    if (mlResult) {
      response.mlPredictions = mlResult.predictions;
      response.mlRiskLevels = mlResult.riskLevels;
    }

    res.status(200).json(response);
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Validation error', errors: messages });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
