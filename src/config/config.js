/**
 * Configuration manager siguiendo principios SOLID
 * Principio: Single Responsibility - Solo maneja configuración
 * Principio: Open/Closed - Abierto para extensión, cerrado para modificación
 */
class Config {
  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  /**
   * Carga la configuración desde variables de entorno
   * @returns {object} Configuración completa
   */
  loadConfiguration() {
    return {
      // Configuración del servidor
      server: {
        port: parseInt(process.env.PORT) || 3000,
        host: process.env.HOST || '0.0.0.0',
        env: process.env.NODE_ENV || 'development'
      },

      // Configuración MQTT (sin autenticación)
      mqtt: {
        broker: process.env.MQTT_BROKER || 'localhost',
        port: parseInt(process.env.MQTT_PORT) || 1883,
        clientId: process.env.MQTT_CLIENT_ID || 'gaus-control-' + Date.now(),
        keepAlive: parseInt(process.env.MQTT_KEEPALIVE) || 60,
        reconnectPeriod: parseInt(process.env.MQTT_RECONNECT_PERIOD) || 1000,
        topics: {
          vehicleSpeed: process.env.MQTT_TOPIC_SPEED || 'vehicles/speed',
          vehicleAlerts: process.env.MQTT_TOPIC_ALERTS || 'vehicles/alerts',
          systemHealth: process.env.MQTT_TOPIC_HEALTH || 'system/health'
        }
      },

      // Configuración de base de datos
      database: {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 5432,
        database: process.env.DB_NAME || 'gaus_control',
        username: process.env.DB_USER || 'gaus_user',
        password: process.env.DB_PASSWORD || 'gaus_password',
        pool: {
          min: parseInt(process.env.DB_POOL_MIN) || 2,
          max: parseInt(process.env.DB_POOL_MAX) || 10
        }
      },

      // Configuración de Redis (sin autenticación)
      redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        db: parseInt(process.env.REDIS_DB) || 0,
        keyPrefix: process.env.REDIS_KEY_PREFIX || 'gaus:',
        ttl: {
          vehicleState: parseInt(process.env.REDIS_TTL_VEHICLE) || 300, // 5 minutos
          alerts: parseInt(process.env.REDIS_TTL_ALERTS) || 3600, // 1 hora
          stats: parseInt(process.env.REDIS_TTL_STATS) || 60 // 1 minuto
        }
      },

      // Configuración de alertas
      alerts: {
        speedLimit: parseFloat(process.env.ALERT_SPEED_LIMIT) || 60.0,
        consecutiveLimit: parseInt(process.env.ALERT_CONSECUTIVE_LIMIT) || 3,
        timeWindow: parseInt(process.env.ALERT_TIME_WINDOW) || 60000, // 1 minuto en ms
        severityLevels: {
          low: 'LOW',
          medium: 'MEDIUM', 
          high: 'HIGH',
          critical: 'CRITICAL'
        }
      },



      // Configuración de WebSockets
      websocket: {
        cors: {
          origin: process.env.WS_CORS_ORIGIN || "http://localhost:3000",
          methods: ["GET", "POST"]
        },
        pingTimeout: parseInt(process.env.WS_PING_TIMEOUT) || 60000,
        pingInterval: parseInt(process.env.WS_PING_INTERVAL) || 25000
      }
    };
  }

  /**
   * Valida que la configuración sea correcta
   * @throws {Error} Si la configuración es inválida
   */
  validateConfiguration() {
    const required = [
      'server.port',
      'mqtt.broker',
      'mqtt.port',
      'database.host',
      'database.database',
      'alerts.speedLimit'
    ];

    for (const path of required) {
      if (!this.get(path)) {
        throw new Error(`Missing required configuration: ${path}`);
      }
    }

    // Validaciones específicas
    if (this.config.alerts.speedLimit <= 0) {
      throw new Error('Speed limit must be greater than 0');
    }

    if (this.config.alerts.consecutiveLimit < 1) {
      throw new Error('Consecutive limit must be at least 1');
    }

    console.log('Configuration validated successfully');
  }

  /**
   * Obtiene un valor de configuración usando dot notation
   * @param {string} path - Ruta de la configuración (ej: 'mqtt.broker')
   * @returns {any} Valor de la configuración
   */
  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  /**
   * Obtiene toda la configuración
   * @returns {object} Configuración completa
   */
  getAll() {
    return { ...this.config };
  }

  /**
   * Obtiene configuración de un módulo específico
   * @param {string} module - Nombre del módulo
   * @returns {object} Configuración del módulo
   */
  getModule(module) {
    return this.config[module] || {};
  }
}

// Singleton instance
const config = new Config();

module.exports = config;
