const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');

// Obtener todos los cursos
router.get('/', authenticateToken, checkPermission('cursos.ver'), async (req, res) => {
  try {
    const { pgPool } = require('../config/db');
    
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
});

// Obtener un curso específico
router.get('/:id', authenticateToken, checkPermission('cursos.ver'), async (req, res) => {
  try {
    const { pgPool } = require('../config/db');
    const cursoId = req.params.id;
    
    const result = await pgPool.query(
      'SELECT c.curso_id, c.materia_id, m.codigo AS codigo_materia, m.nombre AS nombre_materia, ' +
      'c.profesor_id, CONCAT(u.nombre, \' \', u.apellido) AS nombre_profesor, ' +
      'c.semestre, c.ano_academico, c.cupo_maximo, c.activo ' +
      'FROM cursos c ' +
      'JOIN materias m ON c.materia_id = m.materia_id ' +
      'JOIN profesores p ON c.profesor_id = p.profesor_id ' +
      'JOIN usuarios u ON p.usuario_id = u.usuario_id ' +
      'WHERE c.curso_id = $1',
      [cursoId]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ message: 'Curso no encontrado' });
    }
    
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error obteniendo curso:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear un nuevo curso
router.post('/', authenticateToken, checkPermission('cursos.crear'), async (req, res) => {
  try {
    const { materia_id, profesor_id, semestre, ano_academico, cupo_maximo } = req.body;
    const { pgPool } = require('../config/db');
    
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
});

// Otras rutas de cursos (implementar más tarde)
// router.put('/:id', authenticateToken, checkPermission('cursos.editar'), updateCurso);
// router.delete('/:id', authenticateToken, checkPermission('cursos.eliminar'), deleteCurso);

module.exports = router;