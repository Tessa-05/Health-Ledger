const express = require('express');
const router = express.Router();
const actionController = require('../controllers/actionController');

// POST /api/actions/appointment — Book an appointment
router.post('/appointment', actionController.bookAppointment);

// POST /api/actions/emergency — Trigger emergency simulation
router.post('/emergency', actionController.triggerEmergency);

module.exports = router;
