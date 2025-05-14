const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Importar controladores (deberás crear estos después)
// const { getUsers, getUserById, createUser, updateUser, deleteUser } = require('../controllers/userController');

// Ruta para obtener el perfil del usuario actual
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const { pgPool } = require('../config/db');
    
    const result = await pgPool.query(
      'SELECT u.usuario_id, u.nombre, u.apellido, u.email, u.nombre_usuario, ' +
      'u.rol_id, r.nombre_rol, u.ultimo_acceso ' +
      'FROM usuarios u ' +
      'JOIN roles r ON u.rol_id = r.rol_id ' +
      'WHERE u.usuario_id = $1',
      [req.user.id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    const user = result.rows[0];
    
    // Verificar si es estudiante o profesor para obtener información adicional
    let additionalInfo = {};
    
    const estudianteResult = await pgPool.query(
      'SELECT estudiante_id, matricula, carrera, semestre FROM estudiantes WHERE usuario_id = $1',
      [user.usuario_id]
    );
    
    if (estudianteResult.rows.length > 0) {
      additionalInfo.estudiante = estudianteResult.rows[0];
    }
    
    const profesorResult = await pgPool.query(
      'SELECT profesor_id, departamento, especialidad FROM profesores WHERE usuario_id = $1',
      [user.usuario_id]
    );
    
    if (profesorResult.rows.length > 0) {
      additionalInfo.profesor = profesorResult.rows[0];
    }
    
    // Obtener permisos del usuario
    const permisosResult = await pgPool.query(
      'SELECT p.nombre, p.descripcion ' +
      'FROM permisos p ' +
      'JOIN roles_permisos rp ON p.permiso_id = rp.permiso_id ' +
      'WHERE rp.rol_id = $1',
      [user.rol_id]
    );
    
    const permisos = permisosResult.rows.map(p => p.nombre);
    
    res.json({
      id: user.usuario_id,
      nombre: user.nombre,
      apellido: user.apellido,
      email: user.email,
      username: user.nombre_usuario,
      role: {
        id: user.rol_id,
        name: user.nombre_rol
      },
      ultimo_acceso: user.ultimo_acceso,
      permisos,
      ...additionalInfo
    });
    
  } catch (error) {
    console.error('Error obteniendo usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Obtener todos los usuarios (solo admin)
router.get('/', authenticateToken, checkPermission('usuarios.ver'), async (req, res) => {
  try {
    const { pgPool } = require('../config/db');
    
    const result = await pgPool.query(
      'SELECT u.usuario_id, u.nombre, u.apellido, u.email, u.nombre_usuario, ' +
      'u.rol_id, r.nombre_rol, u.activo, u.fecha_creacion, u.ultimo_acceso ' +
      'FROM usuarios u ' +
      'JOIN roles r ON u.rol_id = r.rol_id ' +
      'ORDER BY u.usuario_id'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo usuarios:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Otras rutas de usuarios (implementar más tarde)
// router.get('/:id', authenticateToken, checkPermission('usuarios.ver'), getUserById);
// router.post('/', authenticateToken, checkPermission('usuarios.crear'), createUser);
// router.put('/:id', authenticateToken, checkPermission('usuarios.editar'), updateUser);
// router.delete('/:id', authenticateToken, checkPermission('usuarios.eliminar'), deleteUser);

module.exports = router;