const express = require('express');
const router = express.Router();
const analyzeController = require('../controllers/analyzeController');

// POST /api/analyze — Submit vitals, run health analysis, return report
router.post('/', analyzeController.analyze);

module.exports = router;
