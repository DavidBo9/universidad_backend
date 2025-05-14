
const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { pgPool, connectToMongo } = require('./config/db');

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const cursoRoutes = require('./routes/cursoRoutes');
const documentoRoutes = require('./routes/documentoRoutes');
const inscripcionRoutes = require('./routes/inscripcionRoutes');

// Inicializar Express
const app = express();

// Configuración CORS
const cors = require('cors');
const corsOptions ={
    origin:'http://localhost:3000', 
    credentials:true,            //access-control-allow-credentials:true
    optionSuccessStatus:200
}
app.use(cors(corsOptions));
  
  // Resto de middlewares
  app.use(express.json());
  app.use(helmet({
    contentSecurityPolicy: false  // Deshabilitar CSP que puede interferir
  }));
  app.use(morgan('combined'));
  

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
app.use('/api/inscripciones', inscripcionRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.send('API del Sistema Universitario funcionando correctamente');
});

// Manejo de errores
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Error en el servidor' });
});
// Middleware para establecer el usuario actual en la configuración de PostgreSQL
app.use(async (req, res, next) => {
    try {
      if (req.user) {
        await pgPool.query(`SELECT set_config('app.usuario_id', $1, true)`, [req.user.id.toString()]);
      }
      next();
    } catch (error) {
      console.error('Error al establecer usuario en la configuración:', error);
      next();
    }
  });
  
  module.exports = app;