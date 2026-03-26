const express = require('express');
const router = express.Router();
const { chat } = require('../controllers/symptomChatController');

router.post('/', chat);

module.exports = router;
