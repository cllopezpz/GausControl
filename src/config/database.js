const { Pool } = require('pg');
require('dotenv').config();

// Configuración de la base de datos PostgreSQL
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'gaus_control',
  user: process.env.DB_USER || 'gaus_user',
  password: process.env.DB_PASSWORD || 'gaus_password',
  max: 20, // máximo número de conexiones en el pool
  connectionTimeoutMillis: 0,
  idleTimeoutMillis: 0,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
};

const pool = new Pool(dbConfig);

// Eventos del pool de conexiones
pool.on('connect', () => {
  console.log('📊 Conectado a la base de datos PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en el pool de conexiones:', err);
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Conexión a la base de datos exitosa:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con la base de datos:', error.message);
    return false;
  }
};

module.exports = {
  pool,
  testConnection,
  query: (text, params) => pool.query(text, params)
};
