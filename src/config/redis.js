const redis = require('redis');
require('dotenv').config();

// Configuración de Redis
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retryDelayOnFailover: 100,
  enableReadyCheck: false,
  maxRetriesPerRequest: null,
};

// Crear cliente de Redis
const client = redis.createClient({
  url: `redis://${redisConfig.host}:${redisConfig.port}`
});

// Eventos del cliente Redis
client.on('connect', () => {
  console.log('🔴 Conectando a Redis...');
});

client.on('ready', () => {
  console.log('✅ Redis listo para usar');
});

client.on('error', (err) => {
  console.error('❌ Error de Redis:', err);
});

client.on('end', () => {
  console.log('🔴 Conexión de Redis cerrada');
});

// Función para probar la conexión
const testConnection = async () => {
  try {
    await client.connect();
    await client.ping();
    console.log('✅ Conexión a Redis exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error al conectar con Redis:', error.message);
    return false;
  }
};

// Funciones de utilidad
const redisUtils = {
  // Obtener valor
  get: async (key) => {
    try {
      return await client.get(key);
    } catch (error) {
      console.error('Error al obtener de Redis:', error);
      return null;
    }
  },

  // Establecer valor
  set: async (key, value, expireInSeconds = null) => {
    try {
      if (expireInSeconds) {
        return await client.setEx(key, expireInSeconds, value);
      }
      return await client.set(key, value);
    } catch (error) {
      console.error('Error al guardar en Redis:', error);
      return false;
    }
  },

  // Eliminar valor
  del: async (key) => {
    try {
      return await client.del(key);
    } catch (error) {
      console.error('Error al eliminar de Redis:', error);
      return false;
    }
  },

  // Verificar si existe una clave
  exists: async (key) => {
    try {
      return await client.exists(key);
    } catch (error) {
      console.error('Error al verificar existencia en Redis:', error);
      return false;
    }
  }
};

module.exports = {
  client,
  testConnection,
  ...redisUtils
};
