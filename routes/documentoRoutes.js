const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { getDb } = require('../config/db');

// Obtener todos los documentos
router.get('/', authenticateToken, async (req, res) => {
  try {
    const { tipo, entidad, id } = req.query;
    const db = getDb();
    
    let query = {};
    
    if (tipo) {
      query.tipo = tipo;
    }
    
    if (entidad && id) {
      query['relacionado_con.tipo'] = entidad;
      query['relacionado_con.id'] = parseInt(id);
    }
    
    const documentos = await db.collection('documentos_academicos')
      .find(query)
      .sort({ fecha_creacion: -1 })
      .limit(100)
      .toArray();
    
    res.json(documentos);
  } catch (error) {
    console.error('Error obteniendo documentos:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Crear un nuevo documento
// En documentoRoutes.js - Ruta POST
router.post('/', authenticateToken, async (req, res) => {
    try {
      const { titulo, tipo, contenido, relacionado_con, etiquetas } = req.body;
      const db = getDb();
      
      // Validar datos requeridos
      if (!titulo || !tipo || !contenido) {
        return res.status(400).json({ message: 'Título, tipo y contenido son requeridos' });
      }
      
      // Verificar si el tipo está en la lista permitida
      const tiposPermitidos = ['tesis', 'investigacion', 'proyecto', 'examen', 'tarea'];
      const tipoValidado = tiposPermitidos.includes(tipo) ? tipo : 'tarea'; // Valor por defecto si no está en la lista
      
      // Verificar si relacionado_con.tipo está en la lista permitida
      let relacionadoConValidado = null;
      if (relacionado_con && relacionado_con.tipo && relacionado_con.id) {
        const tiposRelacionPermitidos = ['curso', 'estudiante', 'profesor', 'materia'];
        if (tiposRelacionPermitidos.includes(relacionado_con.tipo)) {
          relacionadoConValidado = {
            tipo: relacionado_con.tipo,
            id: parseInt(relacionado_con.id, 10) // Asegurar que es un entero
          };
        }
      }
      
      // Convertir contenido a objeto si es string
      let contenidoObj;
      try {
        contenidoObj = typeof contenido === 'string' 
          ? { texto: contenido } // Convertir string a objeto
          : contenido;  // Ya es un objeto
      } catch (error) {
        contenidoObj = { texto: contenido.toString() };
      }
      
      // Convertir autor_id a entero
      const autorId = parseInt(req.user.id, 10);
      
      // Crear un documento que cumpla con el esquema
      const documentoCompleto = {
        titulo,
        tipo: tipoValidado,
        autor_id: autorId,
        contenido: contenidoObj,
        relacionado_con: relacionadoConValidado,
        etiquetas: etiquetas || [],
        fecha_creacion: new Date(),
        fecha_modificacion: new Date()
      };
      
      console.log('Intentando insertar documento:', JSON.stringify(documentoCompleto, null, 2));
      
      // Insertar en MongoDB
      const result = await db.collection('documentos_academicos').insertOne(documentoCompleto);
      
      // Registrar en PostgreSQL si es necesario
      try {
        const { pgPool } = require('../config/db');
        await pgPool.query(
          'INSERT INTO documentos_mongo (tipo_documento, mongodb_id, entidad_relacionada, id_entidad) ' +
          'VALUES ($1, $2, $3, $4)',
          [
            tipoValidado, 
            result.insertedId.toString(),
            relacionadoConValidado ? relacionadoConValidado.tipo : null,
            relacionadoConValidado ? relacionadoConValidado.id : null
          ]
        );
      } catch (pgError) {
        console.error('Error en PostgreSQL, pero documento guardado en MongoDB:', pgError);
      }
      
      res.status(201).json({ 
        message: 'Documento creado correctamente',
        documento_id: result.insertedId
      });
    } catch (error) {
      console.error('Error creando documento:', error);
      res.status(500).json({ message: 'Error en el servidor' });
    }
  });

// Obtener un documento específico
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const db = getDb();
    const { ObjectId } = require('mongodb');
    
    // Validar que el ID sea un ObjectId válido
    if (!ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'ID de documento inválido' });
    }
    
    const documento = await db.collection('documentos_academicos').findOne({
      _id: new ObjectId(req.params.id)
    });
    
    if (!documento) {
      return res.status(404).json({ message: 'Documento no encontrado' });
    }
    
    res.json(documento);
  } catch (error) {
    console.error('Error obteniendo documento:', error);
    res.status(500).json({ message: 'Error en el servidor' });
  }
});

// Otras rutas de documentos (implementar más tarde)
// router.put('/:id', authenticateToken, updateDocumento);
// router.delete('/:id', authenticateToken, deleteDocumento);

module.exports = router;