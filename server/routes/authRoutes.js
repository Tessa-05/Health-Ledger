const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');

// POST /api/auth/register — Register a new user
router.post('/register', authController.register);

// POST /api/auth/login — Authenticate user
router.post('/login', authController.login);

// GET /api/auth/profile — Get current user profile (protected)
router.get('/profile', authMiddleware, authController.getProfile);

module.exports = router;
