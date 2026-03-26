const mongoose = require('mongoose');
const Log = require('../models/Log');
const { logEvent } = require('../services/decisionService');

// @desc    Book an appointment (simulated)
// @route   POST /api/actions/appointment
exports.bookAppointment = async (req, res) => {
  try {
    const { userId, date, timeSlot, reason } = req.body;

    if (!userId || !date || !timeSlot) {
      return res.status(400).json({
        message: 'userId, date, and timeSlot are required',
      });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Store appointment in Log
    const appointment = await Log.create({
      userId,
      type: 'appointment',
      message: `Appointment scheduled for ${date} at ${timeSlot}`,
      metadata: {
        date,
        timeSlot,
        reason: reason || 'Health consultation based on vital analysis',
        status: 'confirmed',
        bookedAt: new Date().toISOString(),
      },
    });

    res.status(201).json({
      message: 'Appointment scheduled successfully',
      appointment: {
        id: appointment._id,
        date,
        timeSlot,
        reason: appointment.metadata.reason,
        status: 'confirmed',
      },
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Trigger emergency with Twilio call + SMS
// @route   POST /api/actions/emergency
exports.triggerEmergency = async (req, res) => {
  try {
    const { userId, condition, latitude, longitude, vitals, mlPredictions } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'userId is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const emergencyData = { condition, latitude, longitude, vitals, mlPredictions };

    // Log the emergency event
    await logEvent(userId, 'alert', `Emergency triggered: ${condition || 'Critical condition detected'}`, {
      latitude, longitude,
      condition,
      vitals,
      mlPredictions,
      triggeredAt: new Date().toISOString(),
      status: 'dispatched',
    });

    // Attempt Twilio call + SMS
    const { makeEmergencyCall, sendEmergencySms } = require('../services/twilioService');

    const callResult = await makeEmergencyCall(emergencyData);
    const smsResult = await sendEmergencySms(emergencyData);

    const emergencyResponse = {
      status: 'dispatched',
      message: 'Emergency services have been notified.',
      call: callResult,
      sms: smsResult,
      steps: [
        { step: 1, action: 'Analyzing critical condition...', status: 'complete' },
        { step: 2, action: 'Placing emergency voice call...', status: callResult.success ? 'complete' : 'failed' },
        { step: 3, action: 'Sending emergency SMS with location...', status: smsResult.success ? 'complete' : 'failed' },
        { step: 4, action: 'Logging emergency event...', status: 'complete' },
      ],
      location: latitude && longitude ? {
        latitude, longitude,
        name: callResult.locationName || null,
        mapsLink: `https://maps.google.com/?q=${latitude},${longitude}`,
      } : null,
      instructions: [
        'Stay calm and remain in your current position.',
        'Do not attempt strenuous movement.',
        'Keep your phone accessible for emergency callback.',
        'If conscious, loosen any tight clothing.',
        'If someone is with you, have them wait at the entrance to guide responders.',
      ],
    };

    res.status(200).json(emergencyResponse);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
