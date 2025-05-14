const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { checkPermission } = require('../middleware/permissions');
const {
  getStudents,
  getStudentById,
  createStudent,
  updateStudent,
  deleteStudent
} = require('../controllers/studentController');

// Obtener todos los estudiantes
router.get('/', authenticateToken, checkPermission('estudiantes.ver'), getStudents);

// Obtener un estudiante específico
router.get('/:id', authenticateToken, checkPermission('estudiantes.ver'), getStudentById);

// Crear un nuevo estudiante
router.post('/', authenticateToken, checkPermission('estudiantes.crear'), createStudent);

// Actualizar un estudiante
router.put('/:id', authenticateToken, checkPermission('estudiantes.editar'), updateStudent);

// Eliminar un estudiante
router.delete('/:id', authenticateToken, checkPermission('estudiantes.eliminar'), deleteStudent);

module.exports = router;