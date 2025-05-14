// In your server.js or at the start of your app, add this:
const { pgPool } = require('./config/db');
const app = require('./app');
const dotenv = require('dotenv');

// Cargar variables de entorno
dotenv.config();

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en el puerto ${PORT}`);
});