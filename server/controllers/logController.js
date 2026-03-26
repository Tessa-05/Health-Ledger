const mongoose = require('mongoose');
const Log = require('../models/Log');

// @desc    Get activity logs for a user
// @route   GET /api/logs/:userId
exports.getLogs = async (req, res) => {
  try {
    const { userId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const { type, limit: queryLimit } = req.query;
    const limit = parseInt(queryLimit) || 50;

    const filter = { userId };
    if (type && ['appointment', 'alert', 'recommendation', 'analysis', 'symptom'].includes(type)) {
      filter.type = type;
    }

    const logs = await Log.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    // Format for display
    const formatted = logs.map((log) => ({
      id: log._id,
      type: log.type,
      message: log.message,
      time: new Date(log.createdAt).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      }),
      metadata: log.metadata,
    }));

    res.status(200).json({
      count: formatted.length,
      logs: formatted,
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};
