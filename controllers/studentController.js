const { pgPool } = require('../config/db');
const bcrypt = require('bcrypt');

// Obtener todos los estudiantes
const getStudents = async (req, res) => {
  try {
    console.log('Obteniendo lista de estudiantes...');
    
    const result = await pgPool.query(`
      SELECT e.estudiante_id, e.matricula, e.fecha_ingreso, e.carrera, 
             u.usuario_id, u.nombre, u.apellido, u.email, u.nombre_usuario, u.activo
      FROM estudiantes e
      JOIN usuarios u ON e.usuario_id = u.usuario_id
      WHERE u.activo = TRUE
      ORDER BY u.apellido, u.nombre
    `);
    
    console.log(`Se encontraron ${result.rows.length} estudiantes`);
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo estudiantes:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Obtener un estudiante por ID
const getStudentById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pgPool.query(`
      SELECT e.estudiante_id, e.matricula, e.fecha_ingreso, e.carrera, 
             u.usuario_id, u.nombre, u.apellido, u.email, u.nombre_usuario, u.activo
      FROM estudiantes e
      JOIN usuarios u ON e.usuario_id = u.usuario_id
      WHERE e.estudiante_id = $1
    `, [id]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo estudiante:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Crear un nuevo estudiante
const createStudent = async (req, res) => {
  const client = await pgPool.connect();
  
  try {
    const { nombre, apellido, email, nombre_usuario, password, matricula, carrera } = req.body;
    
    if (!nombre || !apellido || !email || !nombre_usuario || !password || !matricula || !carrera) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    // Iniciar transacción
    await client.query('BEGIN');
    
    // 1. Verificar si el usuario ya existe
    const userExists = await client.query(
      'SELECT * FROM usuarios WHERE nombre_usuario = $1 OR email = $2',
      [nombre_usuario, email]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({ message: 'El nombre de usuario o email ya está registrado' });
    }
    
    // 2. Crear usuario
    const passwordHash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      'INSERT INTO usuarios (nombre, apellido, email, nombre_usuario, password_hash, rol_id, activo) ' +
      'VALUES ($1, $2, $3, $4, $5, 3, TRUE) RETURNING usuario_id',
      [nombre, apellido, email, nombre_usuario, passwordHash]
    );
    
    const usuarioId = userResult.rows[0].usuario_id;
    
    // 3. Crear estudiante
    const estudianteResult = await client.query(
      'INSERT INTO estudiantes (usuario_id, matricula, fecha_ingreso, carrera) ' +
      'VALUES ($1, $2, CURRENT_DATE, $3) RETURNING estudiante_id',
      [usuarioId, matricula, carrera]
    );
    
    // Confirmar transacción
    await client.query('COMMIT');
    
    console.log(`Estudiante creado con ID: ${estudianteResult.rows[0].estudiante_id}`);
    
    res.status(201).json({
      message: 'Estudiante creado correctamente',
      estudiante_id: estudianteResult.rows[0].estudiante_id,
      usuario_id: usuarioId
    });
  } catch (error) {
    // Revertir transacción en caso de error
    await client.query('ROLLBACK');
    console.error('Error creando estudiante:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    // Liberar cliente
    client.release();
  }
};

// Actualizar un estudiante
const updateStudent = async (req, res) => {
  const client = await pgPool.connect();
  
  try {
    const { id } = req.params;
    const { nombre, apellido, email, nombre_usuario, password, matricula, carrera, activo } = req.body;
    
    // Iniciar transacción
    await client.query('BEGIN');
    
    // 1. Verificar si el estudiante existe
    const estudianteResult = await client.query(
      'SELECT usuario_id FROM estudiantes WHERE estudiante_id = $1',
      [id]
    );
    
    if (estudianteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    
    const usuarioId = estudianteResult.rows[0].usuario_id;
    
    // 2. Actualizar usuario
    let queryUser = 'UPDATE usuarios SET ';
    const paramsUser = [];
    let paramIndexUser = 1;
    
    if (nombre) {
      queryUser += `nombre = $${paramIndexUser}, `;
      paramsUser.push(nombre);
      paramIndexUser++;
    }
    
    if (apellido) {
      queryUser += `apellido = $${paramIndexUser}, `;
      paramsUser.push(apellido);
      paramIndexUser++;
    }
    
    if (email) {
      queryUser += `email = $${paramIndexUser}, `;
      paramsUser.push(email);
      paramIndexUser++;
    }
    
    if (nombre_usuario) {
      queryUser += `nombre_usuario = $${paramIndexUser}, `;
      paramsUser.push(nombre_usuario);
      paramIndexUser++;
    }
    
    if (password) {
      const passwordHash = await bcrypt.hash(password, 10);
      queryUser += `password_hash = $${paramIndexUser}, `;
      paramsUser.push(passwordHash);
      paramIndexUser++;
    }
    
    if (activo !== undefined) {
      queryUser += `activo = $${paramIndexUser}, `;
      paramsUser.push(activo);
      paramIndexUser++;
    }
    
    // Quitar la última coma
    queryUser = queryUser.slice(0, -2);
    
    // Añadir condición WHERE
    queryUser += ` WHERE usuario_id = $${paramIndexUser}`;
    paramsUser.push(usuarioId);
    
    if (paramsUser.length > 1) { // Si hay algo para actualizar
      await client.query(queryUser, paramsUser);
    }
    
    // 3. Actualizar estudiante
    let queryEstudiante = 'UPDATE estudiantes SET ';
    const paramsEstudiante = [];
    let paramIndexEstudiante = 1;
    
    if (matricula) {
      queryEstudiante += `matricula = $${paramIndexEstudiante}, `;
      paramsEstudiante.push(matricula);
      paramIndexEstudiante++;
    }
    
    if (carrera) {
      queryEstudiante += `carrera = $${paramIndexEstudiante}, `;
      paramsEstudiante.push(carrera);
      paramIndexEstudiante++;
    }
    
    // Quitar la última coma
    queryEstudiante = queryEstudiante.slice(0, -2);
    
    // Añadir condición WHERE
    queryEstudiante += ` WHERE estudiante_id = $${paramIndexEstudiante}`;
    paramsEstudiante.push(id);
    
    if (paramsEstudiante.length > 1) { // Si hay algo para actualizar
      await client.query(queryEstudiante, paramsEstudiante);
    }
    
    // Confirmar transacción
    await client.query('COMMIT');
    
    res.json({ message: 'Estudiante actualizado correctamente' });
  } catch (error) {
    // Revertir transacción en caso de error
    await client.query('ROLLBACK');
    console.error('Error actualizando estudiante:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    // Liberar cliente
    client.release();
  }
};

// Eliminar un estudiante
const deleteStudent = async (req, res) => {
  const client = await pgPool.connect();
  
  try {
    const { id } = req.params;
    
    // Iniciar transacción
    await client.query('BEGIN');
    
    // 1. Verificar si el estudiante existe
    const estudianteResult = await client.query(
      'SELECT usuario_id FROM estudiantes WHERE estudiante_id = $1',
      [id]
    );
    
    if (estudianteResult.rows.length === 0) {
      return res.status(404).json({ message: 'Estudiante no encontrado' });
    }
    
    const usuarioId = estudianteResult.rows[0].usuario_id;
    
    // 2. Marcar usuario como inactivo (en vez de eliminarlo)
    await client.query(
      'UPDATE usuarios SET activo = FALSE WHERE usuario_id = $1',
      [usuarioId]
    );
    
    // Confirmar transacción
    await client.query('COMMIT');
    
    res.json({ message: 'Estudiante eliminado correctamente' });
  } catch (error) {
    // Revertir transacción en caso de error
    await client.query('ROLLBACK');
    console.error('Error eliminando estudiante:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  } finally {
    // Liberar cliente
    client.release();
  }
};

module.exports = {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
};