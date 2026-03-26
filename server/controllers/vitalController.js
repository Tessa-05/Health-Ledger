const mongoose = require('mongoose');
const Vital = require('../models/Vital');

// @desc    Add a new vital reading
// @route   POST /api/vitals
exports.addVital = async (req, res) => {
  try {
    const { userId, heartRate, spo2, temperature, ecg } = req.body;

    // Validate required fields
    if (!userId || heartRate == null || spo2 == null || temperature == null) {
      return res.status(400).json({
        message: 'userId, heartRate, spo2, and temperature are required',
      });
    }

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Create vital record
    const vital = await Vital.create({
      userId,
      heartRate,
      spo2,
      temperature,
      ecg: {
        rhythm: ecg?.rhythm || 'regular',
        hrv: ecg?.hrv || 'normal',
      },
    });

    res.status(201).json({
      message: 'Vital reading saved successfully',
      vital,
    });
  } catch (error) {
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ message: 'Validation error', errors: messages });
    }
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get vital history for a user
// @route   GET /api/vitals/:userId
exports.getVitals = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    // Fetch vitals sorted by most recent first
    const limit = parseInt(req.query.limit) || 20;
    const vitals = await Vital.find({ userId })
      .sort({ timestamp: -1 })
      .limit(limit);

    res.status(200).json({
      count: vitals.length,
      vitals,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
