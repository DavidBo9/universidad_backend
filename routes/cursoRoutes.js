// routes/cursoRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { getCursos, getCursoById, createCurso, updateCurso, deleteCurso } = require('../controllers/cursoController');

// Obtener todos los cursos
router.get('/', authenticateToken, checkPermission('cursos.ver'), getCursos);

// Obtener un curso específico
router.get('/:id', authenticateToken, checkPermission('cursos.ver'), getCursoById);

// Crear un nuevo curso
router.post('/', authenticateToken, checkPermission('cursos.crear'), createCurso);

// Actualizar un curso
router.put('/:id', authenticateToken, checkPermission('cursos.editar'), updateCurso);

// Eliminar un curso
router.delete('/:id', authenticateToken, checkPermission('cursos.eliminar'), deleteCurso);

module.exports = router;
