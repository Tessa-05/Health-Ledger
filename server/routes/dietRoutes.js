const express = require('express');
const router = express.Router();
const dietController = require('../controllers/dietController');

// POST /api/diet — Get diet and lifestyle recommendations
router.post('/', dietController.getDiet);

module.exports = router;
