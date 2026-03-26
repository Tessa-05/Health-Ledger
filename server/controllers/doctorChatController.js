const { startOrContinueChat, resetChat } = require('../services/geminiService');
const { handleSymptomChat, detectSymptoms } = require('../services/symptomConversationService');

exports.chat = async (req, res) => {
  try {
    const { message, patientContext, userId: bodyUserId } = req.body;
    const userId = bodyUserId || 'default';

    if (!message) {
      return res.status(400).json({ message: 'Message is required' });
    }

    // Try Gemini first
    try {
      const result = await startOrContinueChat(userId, message, patientContext);
      return res.json({ ...result, engine: 'gemini' });
    } catch (geminiErr) {
      console.log('Gemini unavailable, falling back to rule-based engine:', geminiErr.message);
    }

    // Fallback: use the rule-based symptom engine
    const detected = detectSymptoms(message);

    if (detected.length === 0) {
      return res.json({
        reply: `I understand you said: "${message}". Could you describe your symptoms more specifically? For example: headache, chest pain, shortness of breath, dizziness, fatigue, nausea, fever, cough, or palpitations.\n\n*Note: I'm currently using my built-in medical knowledge base. The AI assistant will reconnect shortly.*`,
        actionRequired: 'self_care',
        actionReason: '',
        engine: 'fallback',
      });
    }

    // Run the rule-based assessment
    const profile = patientContext || {};
    const result = handleSymptomChat({
      phase: 'final',
      text: message,
      symptomKeys: detected,
      askedQuestions: [],
      answers: [],
      vitals: profile.vitals || null,
      profile: {
        name: profile.name,
        age: profile.age,
        weight: profile.weight,
        height: profile.height,
        bpSystolic: profile.bpSystolic,
        bpDiastolic: profile.bpDiastolic,
        conditions: profile.conditions || [],
        medications: profile.medications || '',
        allergies: profile.allergies || '',
      },
    });

    // Format as a doctor response
    let reply = '';

    if (result.conditions?.length) {
      reply += `**Possible conditions:** ${result.conditions.join(', ')}\n\n`;
    }
    if (result.clinicalInsight) {
      reply += `${result.clinicalInsight}\n\n`;
    }
    if (result.medications?.otc?.length) {
      reply += `**💊 Medication Recommendations:**\n${result.medications.otc.map(m => `* ${m}`).join('\n')}\n\n`;
    }
    if (result.medications?.advice?.length) {
      reply += `**📋 Clinical Advice:**\n${result.medications.advice.map(a => `* ${a}`).join('\n')}\n\n`;
    }
    if (result.riskWarnings?.length) {
      reply += `**⚠️ Important Warnings:**\n${result.riskWarnings.map(w => `* ${w}`).join('\n')}\n\n`;
    }
    if (result.recommendations?.length) {
      reply += `**✅ Recommendations:**\n${result.recommendations.map(r => `* ${r}`).join('\n')}\n\n`;
    }

    reply += `\n*Confidence: ${result.confidence || 'Moderate'}${result.vitalCorrelated ? ' (vital-data correlated)' : ''}*`;
    reply += `\n\n*⚡ Using built-in medical knowledge base — Gemini AI will reconnect when available.*`;

    return res.json({
      reply,
      actionRequired: result.actionRequired || 'self_care',
      actionReason: result.actionReason || '',
      engine: 'fallback',
    });
  } catch (err) {
    console.error('Doctor chat error:', err);
    res.status(500).json({ message: err.message || 'AI Doctor consultation failed' });
  }
};

exports.reset = (req, res) => {
  const userId = req.body.userId || 'default';
  resetChat(userId);
  res.json({ message: 'Consultation session reset' });
};
