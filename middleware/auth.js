const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
    }
    
    // Verificar el token
    jwt.verify(token, process.env.JWT_SECRET || 'secretkey', async (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Token inválido o expirado' });
      }
      
      // Verificar si la sesión es válida en la base de datos
      const result = await pgPool.query(
        'SELECT * FROM verificar_sesion($1)',
        [token]
      );
      
      if (!result.rows.length || !result.rows[0].valida) {
        return res.status(403).json({ message: 'Sesión inválida o expirada' });
      }
      
      // Guardar información del usuario en el request
      req.user = {
        id: result.rows[0].usuario_id,
        username: result.rows[0].nombre_usuario,
        role: {
          id: result.rows[0].rol_id,
          name: result.rows[0].nombre_rol
        },
        session_id: result.rows[0].sesion_id
      };
      
      next();
    });
  } catch (error) {
    console.error('Error en autenticación:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { authenticateToken };