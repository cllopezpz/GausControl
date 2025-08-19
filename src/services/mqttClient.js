const mqtt = require('mqtt');
const config = require('../config/config');

/**
 * Cliente MQTT siguiendo principios SOLID
 * Principio: Single Responsibility - Solo maneja conexión MQTT
 * Principio: Dependency Inversion - Depende de configuración abstracta
 */
class MqttClient {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
  }

  /**
   * Conecta al broker MQTT
   * @returns {Promise<boolean>} True si la conexión fue exitosa
   */
  async connect() {
    try {
      const mqttConfig = config.getModule('mqtt');
      
      const options = {
        clientId: mqttConfig.clientId,
        keepalive: mqttConfig.keepAlive,
        reconnectPeriod: mqttConfig.reconnectPeriod,
        clean: true,
        connectTimeout: 30000,
        will: {
          topic: mqttConfig.topics.systemHealth,
          payload: JSON.stringify({
            status: 'offline',
            timestamp: new Date().toISOString(),
            clientId: mqttConfig.clientId
          }),
          qos: 1,
          retain: false
        }
      };

      const brokerUrl = `mqtt://${mqttConfig.broker}:${mqttConfig.port}`;
      console.log(`Connecting to MQTT broker: ${brokerUrl}`);

      this.client = mqtt.connect(brokerUrl, options);

      return new Promise((resolve, reject) => {
        const connectTimeout = setTimeout(() => {
          reject(new Error('MQTT connection timeout'));
        }, 30000);

        this.client.on('connect', () => {
          clearTimeout(connectTimeout);
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('Connected to MQTT broker successfully');
          
          // Publicar estado de conexión
          this.publishSystemHealth('online');
          
          resolve(true);
        });

        this.client.on('error', (error) => {
          clearTimeout(connectTimeout);
          console.error('MQTT connection error:', error);
          reject(error);
        });

        this.client.on('offline', () => {
          this.isConnected = false;
          console.warn('MQTT client went offline');
        });

        this.client.on('reconnect', () => {
          this.reconnectAttempts++;
          console.log(`MQTT reconnection attempt ${this.reconnectAttempts}`);
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.client.end();
          }
        });

        this.client.on('message', (topic, message) => {
          this.handleMessage(topic, message);
        });
      });

    } catch (error) {
      console.error('Error connecting to MQTT broker:', error);
      throw error;
    }
  }

  /**
   * Suscribe a un topic
   * @param {string} topic - Topic a suscribir
   * @param {function} handler - Función manejadora de mensajes
   * @param {object} options - Opciones de suscripción
   * @returns {Promise<boolean>} True si la suscripción fue exitosa
   */
  async subscribe(topic, handler, options = {}) {
    if (!this.isConnected) {
      throw new Error('MQTT client is not connected');
    }

    const subscribeOptions = {
      qos: options.qos || 1,
      ...options
    };

    return new Promise((resolve, reject) => {
      this.client.subscribe(topic, subscribeOptions, (error) => {
        if (error) {
          console.error(`Error subscribing to topic ${topic}:`, error);
          reject(error);
          return;
        }

        this.subscriptions.set(topic, subscribeOptions);
        this.messageHandlers.set(topic, handler);
        console.log(`Subscribed to topic: ${topic}`);
        resolve(true);
      });
    });
  }

  /**
   * Publica un mensaje a un topic
   * @param {string} topic - Topic de destino
   * @param {object|string} message - Mensaje a publicar
   * @param {object} options - Opciones de publicación
   * @returns {Promise<boolean>} True si la publicación fue exitosa
   */
  async publish(topic, message, options = {}) {
    if (!this.isConnected) {
      throw new Error('MQTT client is not connected');
    }

    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    
    const publishOptions = {
      qos: options.qos || 1,
      retain: options.retain || false,
      ...options
    };

    return new Promise((resolve, reject) => {
      this.client.publish(topic, payload, publishOptions, (error) => {
        if (error) {
          console.error(`Error publishing to topic ${topic}:`, error);
          reject(error);
          return;
        }

        console.log(`Message published to topic: ${topic}`);
        resolve(true);
      });
    });
  }

  /**
   * Publica datos de velocidad de vehículo
   * @param {object} speedData - Datos de velocidad validados
   * @returns {Promise<boolean>} True si fue exitoso
   */
  async publishVehicleSpeed(speedData) {
    const topic = config.get('mqtt.topics.vehicleSpeed');
    
    const payload = {
      ...speedData,
      publishedAt: new Date().toISOString()
    };

    return this.publish(topic, payload);
  }

  /**
   * Publica una alerta
   * @param {object} alertData - Datos de la alerta
   * @returns {Promise<boolean>} True si fue exitoso
   */
  async publishAlert(alertData) {
    const topic = config.get('mqtt.topics.vehicleAlerts');
    
    const payload = {
      ...alertData,
      publishedAt: new Date().toISOString()
    };

    return this.publish(topic, payload, { qos: 2 }); // QoS 2 para alertas críticas
  }

  /**
   * Publica estado del sistema
   * @param {string} status - Estado del sistema
   * @returns {Promise<boolean>} True si fue exitoso
   */
  async publishSystemHealth(status) {
    const topic = config.get('mqtt.topics.systemHealth');
    
    const payload = {
      status,
      timestamp: new Date().toISOString(),
      clientId: config.get('mqtt.clientId'),
      uptime: process.uptime()
    };

    return this.publish(topic, payload, { retain: true });
  }

  /**
   * Maneja mensajes recibidos
   * @param {string} topic - Topic del mensaje
   * @param {Buffer} message - Mensaje recibido
   */
  handleMessage(topic, message) {
    try {
      const handler = this.messageHandlers.get(topic);
      
      if (!handler) {
        console.warn(`No handler registered for topic: ${topic}`);
        return;
      }

      let parsedMessage;
      try {
        parsedMessage = JSON.parse(message.toString());
      } catch (parseError) {
        parsedMessage = message.toString();
      }

      handler(topic, parsedMessage);

    } catch (error) {
      console.error(`Error handling message from topic ${topic}:`, error);
    }
  }

  /**
   * Desconecta del broker MQTT
   * @returns {Promise<void>} Promesa que se resuelve cuando se desconecta
   */
  async disconnect() {
    if (!this.client) {
      return;
    }

    // Publicar estado offline antes de desconectar
    if (this.isConnected) {
      await this.publishSystemHealth('offline');
    }

    return new Promise((resolve) => {
      this.client.end(false, {}, () => {
        this.isConnected = false;
        this.subscriptions.clear();
        this.messageHandlers.clear();
        console.log('Disconnected from MQTT broker');
        resolve();
      });
    });
  }

  /**
   * Obtiene información del estado de la conexión
   * @returns {object} Estado de la conexión
   */
  getConnectionStatus() {
    return {
      isConnected: this.isConnected,
      reconnectAttempts: this.reconnectAttempts,
      subscriptionsCount: this.subscriptions.size,
      broker: config.get('mqtt.broker'),
      clientId: config.get('mqtt.clientId')
    };
  }

  /**
   * Lista las suscripciones activas
   * @returns {Array} Array de suscripciones
   */
  getSubscriptions() {
    return Array.from(this.subscriptions.entries()).map(([topic, options]) => ({
      topic,
      options
    }));
  }
}

module.exports = MqttClient;
