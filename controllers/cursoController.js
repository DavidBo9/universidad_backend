// controllers/cursoController.js
const { pgPool, getDb } = require('../config/db');

// Obtener todos los cursos
const getCursos = async (req, res) => {
  try {
    const result = await pgPool.query(
      'SELECT c.curso_id, c.materia_id, m.codigo AS codigo_materia, m.nombre AS nombre_materia, ' +
      'c.profesor_id, CONCAT(u.nombre, \' \', u.apellido) AS nombre_profesor, ' +
      'c.semestre, c.ano_academico, c.cupo_maximo, c.activo ' +
      'FROM cursos c ' +
      'JOIN materias m ON c.materia_id = m.materia_id ' +
      'JOIN profesores p ON c.profesor_id = p.profesor_id ' +
      'JOIN usuarios u ON p.usuario_id = u.usuario_id ' +
      'ORDER BY c.semestre DESC, m.nombre'
    );
    
    res.json(result.rows);
  } catch (error) {
    console.error('Error obteniendo cursos:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Obtener un curso específico
const getCursoById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pgPool.query(
      'SELECT c.curso_id, c.materia_id, m.codigo AS codigo_materia, m.nombre AS nombre_materia, ' +
      'c.profesor_id, CONCAT(u.nombre, \' \', u.apellido) AS nombre_profesor, ' +
      'c.semestre, c.ano_academico, c.cupo_maximo, c.activo ' +
      'FROM cursos c ' +
      'JOIN materias m ON c.materia_id = m.materia_id ' +
      'JOIN profesores p ON c.profesor_id = p.profesor_id ' +
      'JOIN usuarios u ON p.usuario_id = u.usuario_id ' +
      'WHERE c.curso_id = $1',
      [id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo curso:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Crear un nuevo curso
const createCurso = async (req, res) => {
  try {
    const { materia_id, profesor_id, semestre, ano_academico, cupo_maximo } = req.body;
    
    // Validación básica
    if (!materia_id || !profesor_id || !semestre || !ano_academico || !cupo_maximo) {
      return res.status(400).json({ message: 'Todos los campos son requeridos' });
    }
    
    const result = await pgPool.query(
      'INSERT INTO cursos (materia_id, profesor_id, semestre, ano_academico, cupo_maximo, activo) ' +
      'VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING curso_id',
      [materia_id, profesor_id, semestre, ano_academico, cupo_maximo]
    );
    
    res.status(201).json({ 
      message: 'Curso creado correctamente',
      curso_id: result.rows[0].curso_id
    });
  } catch (error) {
    console.error('Error creando curso:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Actualizar un curso
const updateCurso = async (req, res) => {
  try {
    const { id } = req.params;
    const { materia_id, profesor_id, semestre, ano_academico, cupo_maximo, activo } = req.body;
    
    // Verificar si el curso existe
    const cursoExists = await pgPool.query(
      'SELECT * FROM cursos WHERE curso_id = $1',
      [id]
    );
    
    if (cursoExists.rows.length === 0) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    
    // Construir query dinámicamente
    let query = 'UPDATE cursos SET ';
    const params = [];
    let paramIndex = 1;
    
    if (materia_id) {
      query += `materia_id = $${paramIndex}, `;
      params.push(materia_id);
      paramIndex++;
    }
    
    if (profesor_id) {
      query += `profesor_id = $${paramIndex}, `;
      params.push(profesor_id);
      paramIndex++;
    }
    
    if (semestre) {
      query += `semestre = $${paramIndex}, `;
      params.push(semestre);
      paramIndex++;
    }
    
    if (ano_academico) {
      query += `ano_academico = $${paramIndex}, `;
      params.push(ano_academico);
      paramIndex++;
    }
    
    if (cupo_maximo) {
      query += `cupo_maximo = $${paramIndex}, `;
      params.push(cupo_maximo);
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
    query += ` WHERE curso_id = $${paramIndex} RETURNING curso_id`;
    params.push(id);
    
    // Ejecutar actualización
    const result = await pgPool.query(query, params);
    
    res.json({ 
      message: 'Curso actualizado correctamente', 
      curso_id: result.rows[0].curso_id 
    });
  } catch (error) {
    console.error('Error actualizando curso:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

// Eliminar un curso
const deleteCurso = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Verificar si el curso existe
    const cursoExists = await pgPool.query(
      'SELECT * FROM cursos WHERE curso_id = $1',
      [id]
    );
    
    if (cursoExists.rows.length === 0) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    
    // En lugar de eliminar, marcar como inactivo
    await pgPool.query(
      'UPDATE cursos SET activo = FALSE WHERE curso_id = $1',
      [id]
    );
    
    res.json({ message: 'Curso eliminado correctamente' });
  } catch (error) {
    console.error('Error eliminando curso:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
};

module.exports = {
  getCursos,
  getCursoById,
  createCurso,
  updateCurso,
  deleteCurso
};
