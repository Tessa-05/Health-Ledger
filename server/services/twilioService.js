/* ═══════════════════════════════════════
   TWILIO EMERGENCY SERVICE
   Voice call + SMS with condition + location
   ═══════════════════════════════════════ */

const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_PHONE_NUMBER;
const emergencyNumber = process.env.EMERGENCY_PHONE_NUMBER;

function getClient() {
  if (!accountSid || !authToken) return null;
  return twilio(accountSid, authToken);
}

// Reverse geocode lat/lng to readable address (BigDataCloud — free, no key)
async function reverseGeocode(latitude, longitude) {
  try {
    const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
    const res = await fetch(url);
    const data = await res.json();
    const parts = [
      data.locality,
      data.city,
      data.principalSubdivision,
      data.countryName,
    ].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : null;
  } catch (err) {
    console.error('[Geocode] Reverse geocoding failed:', err.message);
    return null;
  }
}

// Build dynamic voice message
function buildVoiceMessage({ condition, locationName, latitude, longitude, vitals, mlPredictions }) {
  const parts = ['Emergency alert from Health Ledger.'];

  if (condition) {
    parts.push(`A patient is experiencing: ${condition}.`);
  }

  // Location — always include prominently
  if (locationName) {
    parts.push(`The patient is currently located at: ${locationName}.`);
  } else if (latitude && longitude) {
    parts.push(`The patient's GPS location is: latitude ${latitude}, longitude ${longitude}.`);
  }

  if (vitals) {
    const v = [];
    if (vitals.heartRate) v.push(`heart rate ${vitals.heartRate} beats per minute`);
    if (vitals.spo2) v.push(`oxygen saturation ${vitals.spo2} percent`);
    if (vitals.temperature) v.push(`temperature ${vitals.temperature} degrees Fahrenheit`);
    if (v.length > 0) parts.push(`Current vitals: ${v.join(', ')}.`);
  }

  if (mlPredictions) {
    const risks = [];
    if (mlPredictions.cardiac_risk > 0.7) risks.push(`cardiac risk at ${Math.round(mlPredictions.cardiac_risk * 100)} percent`);
    if (mlPredictions.hypoxia > 0.7) risks.push(`hypoxia risk at ${Math.round(mlPredictions.hypoxia * 100)} percent`);
    if (mlPredictions.stress > 0.7) risks.push(`stress level at ${Math.round(mlPredictions.stress * 100)} percent`);
    if (risks.length > 0) parts.push(`AI analysis indicates: ${risks.join(', ')}.`);
  }

  parts.push('Immediate medical attention is required. Please respond to this alert.');
  return parts.join(' ');
}

// Build SMS message
function buildSmsMessage({ condition, locationName, latitude, longitude, vitals, mlPredictions }) {
  const lines = ['🚨 HEALTH LEDGER EMERGENCY ALERT'];
  lines.push('');

  if (condition) lines.push(`Condition: ${condition}`);

  if (vitals) {
    lines.push(`Vitals: HR=${vitals.heartRate || '-'} bpm | SpO2=${vitals.spo2 || '-'}% | Temp=${vitals.temperature || '-'}°F`);
  }

  if (mlPredictions) {
    const risks = [];
    if (mlPredictions.cardiac_risk > 0.5) risks.push(`Cardiac: ${Math.round(mlPredictions.cardiac_risk * 100)}%`);
    if (mlPredictions.hypoxia > 0.5) risks.push(`Hypoxia: ${Math.round(mlPredictions.hypoxia * 100)}%`);
    if (risks.length > 0) lines.push(`ML Risk: ${risks.join(' | ')}`);
  }

  lines.push('');
  if (locationName) {
    lines.push(`📍 Location: ${locationName}`);
  }
  if (latitude && longitude) {
    lines.push(`🗺️ Map: https://maps.google.com/?q=${latitude},${longitude}`);
  }

  lines.push('');
  lines.push('⚠️ Immediate attention required.');

  return lines.join('\n');
}

// Place emergency voice call
async function makeEmergencyCall(data) {
  // Resolve location name if coordinates available
  if (data.latitude && data.longitude && !data.locationName) {
    data.locationName = await reverseGeocode(data.latitude, data.longitude);
  }

  const client = getClient();
  if (!client) {
    console.log('[Twilio] DEMO MODE — No credentials configured');
    const voiceMsg = buildVoiceMessage(data);
    const smsMsg = buildSmsMessage(data);
    return {
      success: true,
      demo: true,
      message: 'Emergency alert triggered (demo mode — Twilio not configured)',
      voiceMessage: voiceMsg,
      smsMessage: smsMsg,
      locationName: data.locationName,
      toNumber: emergencyNumber || '+91XXXXXXXXXX',
    };
  }

  const voiceMsg = buildVoiceMessage(data);
  const twiml = `<Response><Say voice="alice" language="en-US">${voiceMsg}</Say><Pause length="1"/><Say voice="alice" language="en-US">${voiceMsg}</Say></Response>`;

  try {
    const call = await client.calls.create({
      twiml,
      to: emergencyNumber,
      from: twilioNumber,
    });

    console.log(`[Twilio] Emergency call initiated: ${call.sid}`);
    return {
      success: true,
      demo: false,
      callSid: call.sid,
      message: `Emergency call placed to ${emergencyNumber}`,
      voiceMessage: voiceMsg,
      locationName: data.locationName,
    };
  } catch (err) {
    console.error('[Twilio] Call failed:', err.message);
    throw new Error(`Emergency call failed: ${err.message}`);
  }
}

// Send emergency SMS
async function sendEmergencySms(data) {
  // Ensure location name is resolved
  if (data.latitude && data.longitude && !data.locationName) {
    data.locationName = await reverseGeocode(data.latitude, data.longitude);
  }

  const client = getClient();
  const smsMsg = buildSmsMessage(data);

  if (!client) {
    return { success: true, demo: true, message: 'SMS alert (demo mode)', smsBody: smsMsg };
  }

  try {
    const msg = await client.messages.create({
      body: smsMsg,
      to: emergencyNumber,
      from: twilioNumber,
    });

    console.log(`[Twilio] Emergency SMS sent: ${msg.sid}`);
    return { success: true, demo: false, messageSid: msg.sid, message: 'Emergency SMS sent' };
  } catch (err) {
    console.error('[Twilio] SMS failed:', err.message);
    return { success: false, message: `SMS failed: ${err.message}` };
  }
}

module.exports = { makeEmergencyCall, sendEmergencySms, reverseGeocode };
