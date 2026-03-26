const express = require('express');
const router = express.Router();
const vitalController = require('../controllers/vitalController');

// POST /api/vitals — Store a new vital reading
router.post('/', vitalController.addVital);

// GET /api/vitals/:userId — Fetch vital history for a user
router.get('/:userId', vitalController.getVitals);

module.exports = router;
