const express = require('express');
const router = express.Router();
const { login, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Ruta para login
router.post('/login', login);

// Ruta para logout (requiere autenticación)
router.post('/logout', authenticateToken, logout);

module.exports = router;
