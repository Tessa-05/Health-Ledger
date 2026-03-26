const { handleSymptomChat } = require('../services/symptomConversationService');

exports.chat = async (req, res) => {
  try {
    const { phase, text, symptomKeys, askedQuestions, answers, vitals, profile } = req.body;

    const result = handleSymptomChat({
      phase: phase || 'initial',
      text: text || '',
      symptomKeys: symptomKeys || [],
      askedQuestions: askedQuestions || [],
      answers: answers || [],
      vitals: vitals || null,
      profile: profile || null,
    });

    res.json(result);
  } catch (err) {
    console.error('Symptom chat error:', err);
    res.status(500).json({ message: 'Symptom analysis failed', error: err.message });
  }
};
