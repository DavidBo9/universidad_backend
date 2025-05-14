const express = require('express');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const { pgPool, connectToMongo } = require('./config/db');

// Import routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const cursoRoutes = require('./routes/cursoRoutes');
const documentoRoutes = require('./routes/documentoRoutes');
const inscripcionRoutes = require('./routes/inscripcionRoutes');

// Initialize Express
const app = express();

// CORS Configuration - This MUST come before other middleware
const cors = require('cors');
app.use(cors({
  origin: 'http://localhost:3000',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Body parser middleware
app.use(express.json());

// Simple test route without any middleware protection
app.get('/test', (req, res) => {
  res.json({ message: 'Test route is working!' });
});



app.use(morgan('combined'));

// Configure rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Demasiadas solicitudes desde esta IP'
});
// Only apply rate limiting to login route
app.use('/api/auth/login', limiter);

// Connect to databases
connectToMongo();

// Routes
app.get('/', (req, res) => {
  res.send('API del Sistema Universitario funcionando correctamente');
});

// Auth routes - ensure login doesn't have authentication middleware
app.use('/api/auth', authRoutes);

// Other routes that require authentication
app.use('/api/users', userRoutes);
app.use('/api/cursos', cursoRoutes);
app.use('/api/documentos', documentoRoutes);
app.use('/api/inscripciones', inscripcionRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error occurred:', err);
  res.status(500).json({ message: 'Error en el servidor' });
});

module.exports = app;
