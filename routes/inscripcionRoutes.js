
// routes/inscripcionRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const { 
  getInscripciones, 
  getInscripcionesByEstudiante, 
  getInscripcionesByCurso, 
  createInscripcion, 
  updateInscripcion, 
  deleteInscripcion 
} = require('../controllers/inscripcionController');

// Obtener todas las inscripciones
router.get('/', authenticateToken, checkPermission('inscripciones.ver'), getInscripciones);

// Obtener inscripciones por estudiante
router.get('/estudiante/:id', authenticateToken, checkPermission('inscripciones.ver'), getInscripcionesByEstudiante);

// Obtener inscripciones por curso
router.get('/curso/:id', authenticateToken, checkPermission('inscripciones.ver'), getInscripcionesByCurso);

// Crear una nueva inscripción
router.post('/', authenticateToken, checkPermission('inscripciones.crear'), createInscripcion);

// Actualizar una inscripción
router.put('/:id', authenticateToken, checkPermission('inscripciones.editar'), updateInscripcion);

// Eliminar una inscripción
router.delete('/:id', authenticateToken, checkPermission('inscripciones.eliminar'), deleteInscripcion);

module.exports = router;