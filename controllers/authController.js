// controllers/authController.js

const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { pgPool, getDb } = require('../config/db');

// Función login (como ya lo implementamos)
const login = async (req, res) => {
  try {
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
    
    // Verificar si el usuario existe
    if (result.rows.length === 0) {
      return res.status(401).json({ message: 'Credenciales inválidas' });
    }
    
    const user = result.rows[0];
    console.log('Usuario encontrado:', username);
    
    // Verificar la contraseña con bcrypt directamente
    let isValidPassword = false;
    
    // Primero intenta verificar con bcrypt
    try {
      if (user.password_hash && user.password_hash.startsWith('$2')) {
        isValidPassword = await bcrypt.compare(password, user.password_hash);
        console.log('Verificación bcrypt:', isValidPassword);
      }
    } catch (error) {
      console.error('Error verificando con bcrypt:', error);
    }
    
    // Si falla, verifica si es la contraseña hardcodeada (solo para desarrollo)
    if (!isValidPassword) {
      // Verificación temporal solo para desarrollo
      const passwordsMap = {
        'admin': 'admin123',
        'jperez': 'profesor123',
        'mgonzalez': 'estudiante123',
        'arodriguez': 'secretaria123'
      };
      
      if (passwordsMap[username] === password) {
        console.log('Verificación con contraseña hardcodeada exitosa');
        isValidPassword = true;
        
        // Opcionalmente, actualiza el hash para futuras verificaciones
        const newHash = await bcrypt.hash(password, 10);
        await pgPool.query(
          'UPDATE usuarios SET password_hash = $1 WHERE nombre_usuario = $2',
          [newHash, username]
        );
        console.log('Hash actualizado para usuario:', username);
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
        role: user.nombre_rol
      },
      process.env.JWT_SECRET || 'secretkey',
      { expiresIn: '24h' }
    );
    
    // Registrar la sesión en la base de datos
    const sessionResult = await pgPool.query(
      'SELECT registrar_sesion($1, $2, $3, $4) AS sesion_id',
      [user.usuario_id, token, req.ip, req.headers['user-agent']]
    );
    
    // Registrar actividad en MongoDB
    try {
      const db = getDb();
      await db.collection('actividad_usuarios').insertOne({
        usuario_id: user.usuario_id,
        nombre_usuario: user.nombre_usuario,
        accion: 'login',
        detalles: {
          ip: req.ip,
          dispositivo: req.headers['user-agent']
        },
        ruta: req.originalUrl,
        metodo: req.method,
        ip: req.ip,
        agente_usuario: req.headers['user-agent'],
        fecha: new Date()
      });
    } catch (error) {
      console.error('Error registrando actividad en MongoDB:', error);
      // No interrumpir el flujo por un error en el registro de actividad
    }
    
    // Obtener permisos del usuario
    const permisosResult = await pgPool.query(
      'SELECT p.nombre ' +
      'FROM permisos p ' +
      'JOIN roles_permisos rp ON p.permiso_id = rp.permiso_id ' +
      'WHERE rp.rol_id = $1',
      [user.rol_id]
    );
    
    const permisos = permisosResult.rows.map(p => p.nombre);
    
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
      session_id: sessionResult.rows[0].sesion_id
    });
    
  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ message: 'Error en el servidor', error: error.message });
  }
};

// Función logout
const logout = async (req, res) => {
  try {
    // Obtener el token del encabezado de autorización
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(400).json({ message: 'Token no proporcionado' });
    }
    
    // Cerrar la sesión en la base de datos
    const result = await pgPool.query(
      'SELECT cerrar_sesion($1) AS cerrado',
      [token]
    );
    
    // Registrar la actividad de cierre de sesión en MongoDB
    try {
      const db = getDb();
      await db.collection('actividad_usuarios').insertOne({
        usuario_id: req.user?.id, // Puede ser undefined si no se autenticó correctamente
        nombre_usuario: req.user?.username,
        accion: 'logout',
        detalles: {
          ip: req.ip,
          dispositivo: req.headers['user-agent']
        },
        ruta: req.originalUrl,
        metodo: req.method,
        ip: req.ip,
        agente_usuario: req.headers['user-agent'],
        fecha: new Date()
      });
    } catch (error) {
      console.error('Error registrando actividad en MongoDB:', error);
      // No interrumpir el flujo por un error en el registro de actividad
    }
    
    if (result.rows[0]?.cerrado) {
      res.json({ message: 'Sesión cerrada correctamente' });
    } else {
      // Aún si no se encuentra la sesión, consideramos el logout como exitoso
      res.json({ message: 'Sesión cerrada' });
    }
  } catch (error) {
    console.error('Error en logout:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = { login, logout };
