const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { pgPool, connectToMongo } = require('./config/db');
const corsMiddleware = require('./middleware/cors');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const cursoRoutes = require('./routes/cursoRoutes');
const documentoRoutes = require('./routes/documentoRoutes');

// Inicializar Express
const app = express();


// Configuración CORS más permisiva - AÑADE ESTO AL INICIO, antes de las rutas
app.use(corsMiddleware);
app.use(express.json());
app.use(helmet()); // Seguridad HTTP
app.use(morgan('combined')); // Logging

// Configurar rate limiting para prevenir ataques de fuerza bruta
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // 100 solicitudes por IP
  message: 'Demasiadas solicitudes desde esta IP, por favor intente nuevamente después de 15 minutos'
});
app.use('/api/auth', limiter);

// Conectar a bases de datos
connectToMongo();

// Rutas
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/cursos', cursoRoutes);
app.use('/api/documentos', documentoRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API del Sistema Universitario funcionando correctamente');
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error en el servidor' });
});

module.exports = app;