const { analyzeVitals } = require('../services/analysisService');
const { getDietRecommendations } = require('../services/dietService');

// @desc    Get diet and lifestyle recommendations
// @route   POST /api/diet
exports.getDiet = async (req, res) => {
  try {
    const { healthReport, vitals } = req.body;

    let report = healthReport;

    // If raw vitals are provided instead of healthReport, run analysis first
    if (!report && vitals) {
      const analysis = analyzeVitals(vitals, []);
      report = analysis.healthReport;
    }

    if (!report || !Array.isArray(report)) {
      return res.status(400).json({
        message: 'Provide either healthReport array or vitals object',
      });
    }

    const diet = getDietRecommendations(report);

    res.status(200).json({
      message: 'Diet and lifestyle recommendations generated',
      ...diet,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
