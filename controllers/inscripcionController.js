// controllers/inscripcionController.js
const { pgPool } = require('../config/db');

// Obtener todas las inscripciones
const getInscripciones = async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT i.inscripcion_id, i.estudiante_id, i.curso_id, ' +
      'CONCAT(u.nombre, \' \', u.apellido) AS nombre_estudiante, ' +
      'e.matricula, c.semestre, m.codigo AS codigo_materia, m.nombre AS nombre_materia, ' +
      'i.fecha_inscripcion, i.estado, i.calificacion_final ' +
      'FROM inscripciones i ' +
      'JOIN estudiantes e ON i.estudiante_id = e.estudiante_id ' +
      'JOIN usuarios u ON e.usuario_id = u.usuario_id ' +
      'JOIN cursos c ON i.curso_id = c.curso_id ' +
      'JOIN materias m ON c.materia_id = m.materia_id ' +
      'ORDER BY i.fecha_inscripcion DESC'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo inscripciones:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Obtener inscripciones por estudiante
const getInscripcionesByEstudiante = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pgPool.query(
      'SELECT i.inscripcion_id, i.estudiante_id, i.curso_id, ' +
      'c.semestre, m.codigo AS codigo_materia, m.nombre AS nombre_materia, ' +
      'CONCAT(u.nombre, \' \', u.apellido) AS nombre_profesor, ' +
      'i.fecha_inscripcion, i.estado, i.calificacion_final ' +
      'FROM inscripciones i ' +
      'JOIN cursos c ON i.curso_id = c.curso_id ' +
      'JOIN materias m ON c.materia_id = m.materia_id ' +
      'JOIN profesores p ON c.profesor_id = p.profesor_id ' +
      'JOIN usuarios u ON p.usuario_id = u.usuario_id ' +
      'WHERE i.estudiante_id = $1 ' +
      'ORDER BY i.fecha_inscripcion DESC',
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo inscripciones por estudiante:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Obtener inscripciones por curso
const getInscripcionesByCurso = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pgPool.query(
      'SELECT i.inscripcion_id, i.estudiante_id, i.curso_id, ' +
      'CONCAT(u.nombre, \' \', u.apellido) AS nombre_estudiante, ' +
      'e.matricula, i.fecha_inscripcion, i.estado, i.calificacion_final ' +
      'FROM inscripciones i ' +
      'JOIN estudiantes e ON i.estudiante_id = e.estudiante_id ' +
      'JOIN usuarios u ON e.usuario_id = u.usuario_id ' +
      'WHERE i.curso_id = $1 ' +
      'ORDER BY u.apellido, u.nombre',
      [id]
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo inscripciones por curso:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Crear una nueva inscripción
const createInscripcion = async (req, res) => {
  try {
    const { estudiante_id, curso_id } = req.body;
    
    // Validación básica
    if (!estudiante_id || !curso_id) {
      return res.status(400).json({ message: 'Estudiante y curso son requeridos' });
    }
    
    // Verificar si ya existe la inscripción
    const inscripcionExists = await pgPool.query(
      'SELECT * FROM inscripciones WHERE estudiante_id = $1 AND curso_id = $2',
      [estudiante_id, curso_id]
    );
    
    if (inscripcionExists.rows.length > 0) {
      return res.status(400).json({ message: 'El estudiante ya está inscrito en este curso' });
    }
    
    // Verificar si hay cupo disponible
    const cursoResult = await pgPool.query(
      'SELECT c.cupo_maximo, COUNT(i.inscripcion_id) AS inscritos ' +
      'FROM cursos c ' +
      'LEFT JOIN inscripciones i ON c.curso_id = i.curso_id ' +
      'WHERE c.curso_id = $1 ' +
      'GROUP BY c.curso_id, c.cupo_maximo',
      [curso_id]
    );
    
    if (cursoResult.rows.length === 0) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    
    const { cupo_maximo, inscritos } = cursoResult.rows[0];
    
    if (inscritos >= cupo_maximo) {
      return res.status(400).json({ message: 'No hay cupo disponible en este curso' });
    }
    
    // Insertar inscripción
    const result = await pgPool.query(
      'INSERT INTO inscripciones (estudiante_id, curso_id, fecha_inscripcion, estado) ' +
      'VALUES ($1, $2, NOW(), \'ACTIVA\') RETURNING inscripcion_id',
      [estudiante_id, curso_id]
    );
    
    res.status(201).json({ 
      message: 'Inscripción creada correctamente',
      inscripcion_id: result.rows[0].inscripcion_id
    });
  } catch (error) {
    console.error('Error creando inscripción:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Actualizar una inscripción (para calificaciones o estado)
const updateInscripcion = async (req, res) => {
  try {
    const { id } = req.params;
    const { estado, calificacion_final } = req.body;
    
    // Verificar si la inscripción existe
    const inscripcionExists = await pgPool.query(
      'SELECT * FROM inscripciones WHERE inscripcion_id = $1',
      [id]
    );
    
    if (inscripcionExists.rows.length === 0) {
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }
    
    // Construir query dinámicamente
    let query = 'UPDATE inscripciones SET ';
    const params = [];
    let paramIndex = 1;
    
    if (estado) {
      query += `estado = $${paramIndex}, `;
      params.push(estado);
      paramIndex++;
    }
    
    if (calificacion_final !== undefined) {
      query += `calificacion_final = $${paramIndex}, `;
      params.push(calificacion_final);
      paramIndex++;
    }
    
    // Eliminar última coma
    query = query.slice(0, -2);
    
    // Añadir condición WHERE
    query += ` WHERE inscripcion_id = $${paramIndex} RETURNING inscripcion_id`;
    params.push(id);
    
    // Ejecutar actualización
    const result = await pgPool.query(query, params);
    
    res.json({ 
      message: 'Inscripción actualizada correctamente', 
      inscripcion_id: result.rows[0].inscripcion_id 
    });
  } catch (error) {
    console.error('Error actualizando inscripción:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Eliminar una inscripción
const deleteInscripcion = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si la inscripción existe
    const inscripcionExists = await pgPool.query(
      'SELECT * FROM inscripciones WHERE inscripcion_id = $1',
      [id]
    );
    
    if (inscripcionExists.rows.length === 0) {
      return res.status(404).json({ message: 'Inscripción no encontrada' });
    }
    
    // Eliminar inscripción
    await pgPool.query(
      'DELETE FROM inscripciones WHERE inscripcion_id = $1',
      [id]
    );
    
    res.json({ message: 'Inscripción eliminada correctamente' });
  } catch (error) {
    console.error('Error eliminando inscripción:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = {
  getInscripciones,
  getInscripcionesByEstudiante,
  getInscripcionesByCurso,
  createInscripcion,
  updateInscripcion,
  deleteInscripcion
};
