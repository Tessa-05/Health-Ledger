const mongoose = require('mongoose');
const Vital = require('../models/Vital');
const Log = require('../models/Log');
const { processSymptoms, correlateWithVitals } = require('../services/symptomService');
const { analyzeVitals } = require('../services/analysisService');
const { evaluateActions } = require('../services/decisionService');
const { getDietRecommendations } = require('../services/dietService');

// @desc    Process manual symptom input with optional vitals
// @route   POST /api/manual-input
exports.processManualInput = async (req, res) => {
  try {
    const { userId, symptoms, vitals } = req.body;

    if (!userId || !symptoms) {
      return res.status(400).json({
        message: 'userId and symptoms text are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // 1. Process symptom keywords
    const symptomFindings = processSymptoms(symptoms);

    // 2. Correlate with vitals if provided
    let correlations = [];
    let analysisResult = null;
    let decisionResult = null;
    let dietResult = null;

    if (vitals && vitals.heartRate != null && vitals.spo2 != null && vitals.temperature != null) {
      const currentVitals = {
        heartRate: vitals.heartRate,
        spo2: vitals.spo2,
        temperature: vitals.temperature,
        ecg: {
          rhythm: vitals.ecg?.rhythm || 'regular',
          hrv: vitals.ecg?.hrv || 'normal',
        },
      };

      // Save vital to DB
      await Vital.create({ userId, ...currentVitals });

      // Fetch history for trends
      const previousVitals = await Vital.find({ userId })
        .sort({ timestamp: -1 })
        .limit(5)
        .lean();

      // Correlate symptoms with vitals
      correlations = correlateWithVitals(symptomFindings, currentVitals);

      // Run full analysis
      analysisResult = analyzeVitals(currentVitals, previousVitals);

      // Run decision engine
      decisionResult = await evaluateActions({
        userId,
        healthReport: analysisResult.healthReport,
        insight: analysisResult.insight,
        alerts: analysisResult.alerts,
        vitals: currentVitals,
      });

      // Get diet recommendations
      dietResult = getDietRecommendations(analysisResult.healthReport);
    }

    // 3. Log the manual input
    await Log.create({
      userId,
      type: 'symptom',
      message: `Manual symptom input: "${symptoms}"`,
      metadata: {
        rawInput: symptoms,
        findingsCount: symptomFindings.length,
        correlationsCount: correlations.length,
      },
    });

    // 4. Build response
    const response = {
      message: 'Symptom input processed',
      rawInput: symptoms,
      symptomFindings,
      correlations,
    };

    if (analysisResult) {
      response.analysis = {
        healthReport: analysisResult.healthReport,
        trends: analysisResult.trends,
        insight: analysisResult.insight,
        recommendations: analysisResult.recommendations,
        alerts: analysisResult.alerts,
      };
    }

    if (decisionResult) {
      response.decision = decisionResult;
    }

    if (dietResult) {
      response.diet = dietResult;
    }

    // Generate combined summary if correlations exist
    if (correlations.length > 0) {
      response.combinedInsight = correlations.map((c) => c.insight).join(' ');
    }

    res.status(200).json(response);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
