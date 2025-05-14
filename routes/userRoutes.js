// routes/userRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/userController');

// Obtener todos los usuarios (solo admin)
router.get('/', authenticateToken, checkPermission('usuarios.ver'), getUsers);

// Obtener usuario por ID
router.get('/:id', authenticateToken, checkPermission('usuarios.ver'), async (req, res) => {
  try {
    const { pgPool } = require('../config/db');
    const userId = req.params.id;
    
    const result = await pgPool.query(
      'SELECT u.usuario_id, u.nombre, u.apellido, u.email, u.nombre_usuario, ' +
      'u.rol_id, r.nombre_rol, u.activo, u.fecha_creacion, u.ultimo_acceso ' +
      'FROM usuarios u ' +
      'JOIN roles r ON u.rol_id = r.rol_id ' +
      'WHERE u.usuario_id = $1',
      [userId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear usuario
router.post('/', authenticateToken, checkPermission('usuarios.crear'), createUser);

// Actualizar usuario
router.put('/:id', authenticateToken, checkPermission('usuarios.editar'), updateUser);

// Eliminar usuario
router.delete('/:id', authenticateToken, checkPermission('usuarios.eliminar'), deleteUser);

module.exports = router;
