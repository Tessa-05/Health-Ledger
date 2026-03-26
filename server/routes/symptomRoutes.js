const express = require('express');
const router = express.Router();
const symptomController = require('../controllers/symptomController');

// POST /api/manual-input — Process manual symptom input
router.post('/', symptomController.processManualInput);

module.exports = router;
