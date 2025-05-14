// middleware/auth.js
// Simplificar la verificación de token para depuración

const jwt = require('jsonwebtoken');
const { pgPool } = require('../config/db');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ message: 'Token de autenticación no proporcionado' });
    }
    
    // Verificar el token con una clave secreta conocida
    const jwtSecret = process.env.JWT_SECRET || 'secretkey';
    
    jwt.verify(token, jwtSecret, async (err, decoded) => {
      if (err) {
        console.error('Error verificando token:', err.message);
        return res.status(403).json({ message: 'Token inválido o expirado' });
      }
      
      // Añadir más logs para depuración
      console.log('Token verificado correctamente para usuario:', decoded.username);
      
      // Establecer información del usuario en la solicitud
      req.user = decoded;
      
      // Verificar si el usuario tiene el permiso requerido
      if (req.path.includes('/users') && req.method === 'GET') {
        // Para /api/users y GET, verificar 'usuarios.ver'
        try {
          const permissionResult = await pgPool.query(
            'SELECT EXISTS (SELECT 1 FROM roles_permisos rp JOIN permisos p ON rp.permiso_id = p.permiso_id WHERE rp.rol_id = $1 AND p.nombre = $2) as has_permission',
            [req.user.role.id, 'usuarios.ver']
          );
          
          const hasPermission = permissionResult.rows[0]?.has_permission || false;
          console.log(`Verificación de permiso 'usuarios.ver' para usuario ${req.user.username}: ${hasPermission ? 'SI' : 'NO'}`);
          
          if (!hasPermission) {
            return res.status(403).json({ message: 'No tiene permiso para realizar esta acción' });
          }
        } catch (error) {
          console.error('Error verificando permisos:', error);
        }
      }
      
      next();
    });
  } catch (error) {
    console.error('Error general en autenticación:', error);
    res.status(500).json({ message: 'Error en el servidor durante autenticación' });
  }
};

module.exports = { authenticateToken };
