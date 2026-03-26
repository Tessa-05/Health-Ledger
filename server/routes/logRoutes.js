const express = require('express');
const router = express.Router();
const logController = require('../controllers/logController');

// GET /api/logs/:userId — Fetch activity logs for a user
router.get('/:userId', logController.getLogs);

module.exports = router;
