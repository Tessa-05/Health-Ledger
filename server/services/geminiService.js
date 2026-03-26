/* ═══════════════════════════════════════
   GEMINI AI DOCTOR SERVICE
   Google Gemini-powered medical consultation
   ═══════════════════════════════════════ */

const { GoogleGenerativeAI } = require('@google/generative-ai');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `You are Dr. Ledger, an expert AI physician integrated into the Health Ledger medical monitoring platform. You have access to the patient's real-time vitals, medical history, and health data from the platform.

ROLE & BEHAVIOR:
- Act as a caring, professional physician conducting a medical consultation
- Use the patient's profile data (age, weight, height, BP, conditions, medications, allergies) to personalize every response
- Cross-reference symptoms with their existing conditions and medications
- Provide specific, actionable medical advice including OTC medication names and dosages
- When appropriate, recommend whether the patient needs emergency care, a doctor appointment, or can self-manage
- Be thorough but concise — real doctors don't write essays
- Use medical terminology but explain it in simple terms
- Always consider drug interactions with their current medications
- Always consider their drug allergies when recommending medications

RESPONSE FORMAT:
- Keep responses conversational and warm, like a real doctor would speak
- Use bullet points for medication recommendations and action items
- If the situation is critical, clearly state "MEDICAL ATTENTION REQUIRED" and explain why
- If it's minor, reassure the patient while giving practical advice
- Ask follow-up questions when you need more information to make a diagnosis
- Reference their specific vitals and health data when relevant

IMPORTANT SAFETY NOTES:
- Always include a disclaimer that you are an AI assistant and not a replacement for professional medical care
- For truly life-threatening symptoms, always recommend calling emergency services
- Never diagnose definitively — use phrases like "this could indicate," "consistent with," "suggestive of"

RESPONSE STRUCTURE (use this for final assessments):
When giving a diagnosis/assessment, structure it as:
1. Assessment summary
2. Possible conditions (with likelihood)
3. Recommended medications (if applicable, with dosages)
4. Lifestyle/home remedies
5. When to seek immediate medical help
6. Follow-up recommendations

For casual conversation or follow-up questions, respond naturally without the full structure.`;

// Store chat sessions in memory (per user)
const chatSessions = new Map();

async function startOrContinueChat(userId, userMessage, patientContext) {
  const MAX_RETRIES = 3;
  const RETRY_DELAYS = [2000, 5000, 10000];

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await _doChat(userId, userMessage, patientContext);
    } catch (error) {
      const statusCode = error.status || error.httpStatusCode || 0;
      const msg = (error.message || '').toLowerCase();
      const isRateLimit = statusCode === 429 || msg.includes('429') || msg.includes('quota') || msg.includes('resource has been exhausted');

      if (isRateLimit && attempt < MAX_RETRIES) {
        const delay = RETRY_DELAYS[attempt] || 5000;
        console.log(`Gemini rate limited. Retry ${attempt + 1}/${MAX_RETRIES} in ${delay}ms...`);
        await new Promise(r => setTimeout(r, delay));
        chatSessions.delete(userId); // Clear stale session
        continue;
      }

      // Don't retry non-rate-limit errors
      console.error('Gemini API error:', error.message || error);
      chatSessions.delete(userId);

      if (statusCode === 401 || statusCode === 403 || msg.includes('api_key') || msg.includes('permission')) {
        throw new Error('Gemini API key is invalid or lacks permission. Please check your GEMINI_API_KEY in .env');
      }
      if (isRateLimit) {
        throw new Error('Gemini API rate limit reached. Please wait about 60 seconds and try again. (Free tier: 15 requests/minute)');
      }

      throw new Error('AI Doctor error: ' + (error.message || 'Unknown error'));
    }
  }
}

async function _doChat(userId, userMessage, patientContext) {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });

    // Build patient context string
    let contextStr = '';
    if (patientContext) {
      contextStr = '\n\n--- PATIENT DATA FROM HEALTH LEDGER PLATFORM ---\n';
      if (patientContext.name) contextStr += `Patient Name: ${patientContext.name}\n`;
      if (patientContext.age) contextStr += `Age: ${patientContext.age} years\n`;
      if (patientContext.weight) contextStr += `Weight: ${patientContext.weight} kg\n`;
      if (patientContext.height) {
        contextStr += `Height: ${patientContext.height} cm\n`;
        const bmi = patientContext.weight / ((patientContext.height / 100) ** 2);
        contextStr += `BMI: ${bmi.toFixed(1)} (${bmi < 18.5 ? 'Underweight' : bmi < 25 ? 'Normal' : bmi < 30 ? 'Overweight' : 'Obese'})\n`;
      }
      if (patientContext.bpSystolic) contextStr += `Blood Pressure: ${patientContext.bpSystolic}/${patientContext.bpDiastolic} mmHg\n`;
      if (patientContext.conditions?.length) contextStr += `Existing Conditions: ${patientContext.conditions.join(', ')}\n`;
      if (patientContext.medications) contextStr += `Current Medications: ${patientContext.medications}\n`;
      if (patientContext.allergies) contextStr += `Drug Allergies: ${patientContext.allergies}\n`;

      // Real-time vitals from platform
      if (patientContext.vitals) {
        contextStr += `\n--- LIVE VITALS FROM MONITORING DEVICE ---\n`;
        if (patientContext.vitals.heartRate) contextStr += `Heart Rate: ${patientContext.vitals.heartRate} bpm\n`;
        if (patientContext.vitals.spo2) contextStr += `SpO2: ${patientContext.vitals.spo2}%\n`;
        if (patientContext.vitals.temperature) contextStr += `Temperature: ${patientContext.vitals.temperature}°F\n`;
      }

      // Health assessment from platform
      if (patientContext.healthAssessment) {
        contextStr += `\n--- PLATFORM HEALTH ASSESSMENT ---\n`;
        contextStr += patientContext.healthAssessment + '\n';
      }
      contextStr += '--- END PATIENT DATA ---\n';
    }

    // Get or create chat session
    let session = chatSessions.get(userId);

    if (!session) {
      session = model.startChat({
        history: [
          {
            role: 'user',
            parts: [{ text: SYSTEM_PROMPT + contextStr + '\n\nPlease acknowledge that you have received the patient data and are ready to begin the consultation. Introduce yourself briefly.' }],
          },
          {
            role: 'model',
            parts: [{ text: `Hello${patientContext?.name ? ', ' + patientContext.name : ''}! I'm Dr. Ledger, your AI physician. I've reviewed your health profile from our monitoring system${patientContext?.conditions?.length ? ` and I see your history of ${patientContext.conditions.join(' and ')}` : ''}. ${patientContext?.bpSystolic ? `Your blood pressure reading of ${patientContext.bpSystolic}/${patientContext.bpDiastolic} is noted.` : ''} How can I help you today? Please describe any symptoms or concerns you're experiencing.` }],
          },
        ],
      });
      chatSessions.set(userId, session);
    }

    // Send user message
    const result = await session.sendMessage(userMessage);
    const response = result.response.text();

    // Analyze response for action recommendations
    const actionRequired = analyzeResponseForActions(response);

    return {
      reply: response,
      actionRequired: actionRequired.action,
      actionReason: actionRequired.reason,
    };
}

function analyzeResponseForActions(responseText) {
  const lower = responseText.toLowerCase();

  if (lower.includes('medical attention required') || lower.includes('call emergency') ||
      lower.includes('call 911') || lower.includes('go to the emergency') ||
      lower.includes('seek immediate medical') || lower.includes('life-threatening')) {
    return { action: 'emergency', reason: 'Dr. Ledger has determined that your symptoms require immediate medical attention.' };
  }

  if (lower.includes('see a doctor') || lower.includes('schedule an appointment') ||
      lower.includes('consult a physician') || lower.includes('medical evaluation') ||
      lower.includes('visit your doctor') || lower.includes('professional evaluation')) {
    return { action: 'appointment', reason: 'Dr. Ledger recommends scheduling a medical appointment for further evaluation.' };
  }

  return { action: 'self_care', reason: '' };
}

function resetChat(userId) {
  chatSessions.delete(userId);
}

module.exports = { startOrContinueChat, resetChat };
