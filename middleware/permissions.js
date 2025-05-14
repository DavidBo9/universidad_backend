const { pgPool } = require('../config/db');

const checkPermission = (permission) => {
  return async (req, res, next) => {
    try {
      const result = await pgPool.query(
        'SELECT usuario_tiene_permiso($1, $2) AS tiene_permiso',
        [req.user.id, permission]
      );
      
      if (result.rows[0].tiene_permiso) {
        next();
      } else {
        res.status(403).json({ message: 'No tiene permiso para realizar esta acción' });
      }
    } catch (error) {
      console.error('Error verificando permisos:', error);
      res.status(500).json({ message: 'Error en el servidor' });
    }
  };
};

module.exports = { checkPermission };