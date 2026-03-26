const express = require('express');
const router = express.Router();
const { chat, reset } = require('../controllers/doctorChatController');

router.post('/', chat);
router.post('/reset', reset);

module.exports = router;
