// controllers/userController.js
const bcrypt = require('bcrypt');
const { pgPool, getDb } = require('../config/db');

// Obtener todos los usuarios
const getUsers = async (req, res) => {
  try {
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
};

// Crear usuario
// En userController.js o donde crees usuarios
const createUser = async (req, res) => {
  const client = await pgPool.connect();
  
  try {
    await client.query('BEGIN');
    
    // 1. Crear el usuario
    const userResult = await client.query(
      'INSERT INTO usuarios (nombre, apellido, email, nombre_usuario, password_hash, rol_id, activo) ' +
      'VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING usuario_id',
      [req.body.nombre, req.body.apellido, req.body.email, req.body.nombre_usuario, 
       await bcrypt.hash(req.body.password, 10), req.body.rol_id]
    );
    
    const usuarioId = userResult.rows[0].usuario_id;
    
    // 2. Si es estudiante, crear registro en tabla estudiantes
    if (req.body.rol_id === 3) {
      // Generar una matrícula única si no se proporciona
      const matricula = req.body.matricula || `EST${new Date().getFullYear()}${String(usuarioId).padStart(3, '0')}`;
      
      await client.query(
        'INSERT INTO estudiantes (usuario_id, matricula, fecha_ingreso, carrera, semestre) ' +
        'VALUES ($1, $2, $3, $4, $5)',
        [usuarioId, matricula, new Date(), req.body.carrera || 'Ingeniería Informática', req.body.semestre || 1]
      );
    }
    
    await client.query('COMMIT');
    
    res.status(201).json({
      message: 'Usuario creado correctamente',
      usuario_id: usuarioId
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    client.release();
  }
};

// Actualizar usuario
const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { nombre, apellido, email, nombre_usuario, password, rol_id, activo } = req.body;
    
    // Verificar si el usuario existe
    const userExists = await pgPool.query(
      'SELECT * FROM usuarios WHERE usuario_id = $1',
      [id]
    );
    
    if (userExists.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // Construir query dinámicamente
    let query = 'UPDATE usuarios SET ';
    const params = [];
    let paramIndex = 1;
    
    if (nombre) {
      query += `nombre = $${paramIndex}, `;
      params.push(nombre);
      paramIndex++;
    }
    
    if (apellido) {
      query += `apellido = $${paramIndex}, `;
      params.push(apellido);
      paramIndex++;
    }
    
    if (email) {
      query += `email = $${paramIndex}, `;
      params.push(email);
      paramIndex++;
    }
    
    if (nombre_usuario) {
      query += `nombre_usuario = $${paramIndex}, `;
      params.push(nombre_usuario);
      paramIndex++;
    }
    
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      query += `password_hash = $${paramIndex}, `;
      params.push(hashedPassword);
      paramIndex++;
    }
    
    if (rol_id) {
      query += `rol_id = $${paramIndex}, `;
      params.push(rol_id);
      paramIndex++;
    }
    
    if (activo !== undefined) {
      query += `activo = $${paramIndex}, `;
      params.push(activo);
      paramIndex++;
    }
    
    // Eliminar última coma
    query = query.slice(0, -2);
    
    // Añadir condición WHERE
    query += ` WHERE usuario_id = $${paramIndex} RETURNING usuario_id`;
    params.push(id);
    
    // Ejecutar actualización
    const result = await pgPool.query(query, params);
    
    res.json({ 
      message: 'Usuario actualizado correctamente', 
      usuario_id: result.rows[0].usuario_id 
    });
  } catch (error) {
    console.error('Error actualizando usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Eliminar usuario
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el usuario existe
    const userExists = await pgPool.query(
      'SELECT * FROM usuarios WHERE usuario_id = $1',
      [id]
    );
    
    if (userExists.rows.length === 0) {
      return res.status(404).json({ message: 'Usuario no encontrado' });
    }
    
    // En lugar de eliminar, marcar como inactivo
    await pgPool.query(
      'UPDATE usuarios SET activo = FALSE WHERE usuario_id = $1',
      [id]
    );
    
    res.json({ message: 'Usuario eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando usuario:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = {
  getUsers,
  createUser,
  updateUser,
  deleteUser
};
