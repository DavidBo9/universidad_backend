const { Pool } = require('pg');
const { MongoClient } = require('mongodb');
const dotenv = require('dotenv');

dotenv.config();

// Conexión a PostgreSQL
const pgPool = new Pool({
  host: process.env.PG_HOST || 'localhost',
  port: process.env.PG_PORT || 5432,
  database: process.env.PG_DATABASE || 'universidad',
  user: process.env.PG_USER || 'postgres',
  password: process.env.PG_PASSWORD || 'postgres',
});

// Cliente MongoDB
const mongoClient = new MongoClient(process.env.MONGO_URI || 'mongodb://localhost:27017/universidad_db');
let db;

// Función para conectar a MongoDB
const connectToMongo = async () => {
  try {
    await mongoClient.connect();
    console.log('Conectado a MongoDB');
    db = mongoClient.db();
    return db;
  } catch (error) {
    console.error('Error conectando a MongoDB:', error);
    process.exit(1);
  }
};

// Obtener la base de datos MongoDB
const getDb = () => {
  if (!db) {
    throw new Error('Base de datos no inicializada');
  }
  return db;
};

module.exports = { pgPool, connectToMongo, getDb };