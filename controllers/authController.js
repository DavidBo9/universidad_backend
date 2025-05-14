// controllers/authController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pgPool, getDb } = require('../config/db');

// Function login
const login = async (req, res) => {
    try {
      console.log('Login attempt:', req.body);
      
      const { username, password } = req.body;
      
      // Verificar que se proporcionaron las credenciales
      if (!username || !password) {
        return res.status(400).json({ message: 'Nombre de usuario y contraseña son requeridos' });
      }
      
      // Buscar el usuario en la base de datos
      const result = await pgPool.query(
        'SELECT u.usuario_id, u.nombre_usuario, u.password_hash, u.rol_id, r.nombre_rol ' +
        'FROM usuarios u ' +
        'JOIN roles r ON u.rol_id = r.rol_id ' +
        'WHERE u.nombre_usuario = $1 AND u.activo = TRUE',
        [username]
      );
      
      console.log('User query result:', result.rows.length > 0 ? 'User found' : 'User not found');
      
      // Verificar si el usuario existe
      if (result.rows.length === 0) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }
      
      const user = result.rows[0];
      console.log('User found:', username);
      
      // Verificar la contraseña con bcrypt
      let isValidPassword = false;
      try {
        if (user.password_hash) {
          isValidPassword = await bcrypt.compare(password, user.password_hash);
          console.log('bcrypt verification:', isValidPassword);
        }
      } catch (error) {
        console.error('Error verificando con bcrypt:', error);
      }
      
      // Usar contraseñas hardcodeadas en desarrollo si es necesario
      if (!isValidPassword && process.env.NODE_ENV === 'development') {
        const passwordsMap = {
          'admin': 'admin123',
          'jperez': 'profesor123',
          'mgonzalez': 'estudiante123',
          'arodriguez': 'secretaria123'
        };
        
        if (passwordsMap[username] === password) {
          console.log('Verificación con contraseña hardcodeada exitosa');
          isValidPassword = true;
        }
      }
      
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Credenciales inválidas' });
      }
      
      // Generar token JWT
      const token = jwt.sign(
        { 
          id: user.usuario_id,
          username: user.nombre_usuario,
          role: {
            id: user.rol_id,
            name: user.nombre_rol
          }
        },
        process.env.JWT_SECRET || 'secretkey',
        { expiresIn: '24h' }
      );
      
      console.log('Token generado para', username, ':', token.substring(0, 20) + '...');
      console.log('Datos de usuario para token:', {
        id: user.usuario_id,
        username: user.nombre_usuario,
        role: {
          id: user.rol_id,
          name: user.nombre_rol
        }
      });

    
    // Skip session recording for now to simplify troubleshooting

    
    // Skip activity logging for now


     let permisos = [];
     try {
       const permisosResult = await pgPool.query(
         'SELECT p.nombre ' +
         'FROM permisos p ' +
         'JOIN roles_permisos rp ON p.permiso_id = rp.permiso_id ' +
         'WHERE rp.rol_id = $1',
         [user.rol_id]
       );
       
       permisos = permisosResult.rows.map(p => p.nombre);
       console.log('Permisos asignados:', permisos);
     } catch (error) {
       console.error('Error obteniendo permisos:', error);
       permisos = [];  // Por defecto, sin permisos
     }
     
     // Devolver información del usuario y token
     res.json({
       user: {
         id: user.usuario_id,
         username: user.nombre_usuario,
         role: {
           id: user.rol_id,
           name: user.nombre_rol
         },
         permisos: permisos
       },
       token,
       session_id: 0 // O el ID de sesión si lo estás registrando
     });
     
   } catch (error) {
     console.error('Error in login:', error);
     res.status(500).json({ message: 'Error en el servidor', error: error.message });
   }
 };
// Logout function
const logout = async (req, res) => {
  try {
    // Simplified for troubleshooting
    res.json({ message: 'Sesión cerrada correctamente' });
  } catch (error) {
    console.error('Error in logout:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { login, logout };
