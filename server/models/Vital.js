const mongoose = require('mongoose');

const vitalSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    index: true,
  },
  heartRate: {
    type: Number,
    required: [true, 'Heart rate is required'],
    min: 0,
    max: 300,
  },
  spo2: {
    type: Number,
    required: [true, 'SpO2 is required'],
    min: 0,
    max: 100,
  },
  temperature: {
    type: Number,
    required: [true, 'Temperature is required'],
    min: 80,
    max: 115,
  },
  ecg: {
    rhythm: {
      type: String,
      enum: ['regular', 'irregular'],
      default: 'regular',
    },
    hrv: {
      type: String,
      enum: ['low', 'normal', 'high'],
      default: 'normal',
    },
  },
  timestamp: {
    type: Date,
    default: Date.now,
    index: true,
  },
});

module.exports = mongoose.model('Vital', vitalSchema);
