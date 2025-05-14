const express = require('express');
const router = express.Router();
const { login, logout } = require('../controllers/authController');
const { authenticateToken } = require('../middleware/auth');

// Login route should NOT have authenticateToken middleware
router.post('/login', login);

// Only logout needs authentication
// routes/authRoutes.js
// Simplificar la ruta de logout para depuración

// Cambiar la ruta de logout para que no requiera autenticación temporalmente
router.post('/logout', (req, res) => {
    res.json({ message: 'Sesión cerrada correctamente' });
  });

module.exports = router;
