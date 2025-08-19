const MqttClient = require('./mqttClient');
const SpeedProcessor = require('./speedProcessor');
const AlertSystem = require('./alertSystem');
const SpeedRecordRepository = require('../repositories/speedRecordRepository');
const AlertRepository = require('../repositories/alertRepository');
const config = require('../config/config');

/**
 * Procesador MQTT para mensajes de velocidad en tiempo real
 * Principio: Single Responsibility - Solo procesa mensajes MQTT de velocidad
 * Principio: Dependency Inversion - Depende de abstracciones
 */
class MqttSpeedProcessor {
  constructor() {
    this.mqttClient = new MqttClient();
    this.speedRepository = new SpeedRecordRepository();
    this.alertRepository = new AlertRepository();
    this.alertSystem = new AlertSystem(this.mqttClient);
    this.speedProcessor = new SpeedProcessor(this.alertSystem, this.speedRepository);
    
    this.isRunning = false;
    this.messageCount = 0;
    this.errorCount = 0;
    this.lastMessageTime = null;
    this.startTime = null;

    // Configuración
    this.speedLimit = config.get('alerts.speedLimit') || 60;
    this.consecutiveLimit = config.get('alerts.consecutiveLimit') || 3;
    
    console.log(`Speed processor initialized - Speed limit: ${this.speedLimit} km/h`);
  }

  /**
   * Inicia el procesador MQTT
   * @returns {Promise<void>}
   */
  async start() {
    try {
      if (this.isRunning) {
        console.warn('MQTT Speed Processor is already running');
        return;
      }

      console.log('Starting MQTT Speed Processor...');

      // Inicializar repositorios
      await this.speedRepository.initialize();
      await this.alertRepository.initialize();

      // Conectar al broker MQTT
      await this.mqttClient.connect();

      // Suscribirse al tópico de velocidad
      const speedTopic = config.get('mqtt.topics.vehicleSpeed');
      await this.mqttClient.subscribe(speedTopic, this.handleSpeedMessage.bind(this));

      this.isRunning = true;
      this.startTime = new Date();
      this.messageCount = 0;
      this.errorCount = 0;

      console.log(`✅ MQTT Speed Processor started successfully`);
      console.log(`📡 Listening on topic: ${speedTopic}`);
      console.log(`🚗 Speed limit set to: ${this.speedLimit} km/h`);
      console.log(`⚠️  Critical alert after ${this.consecutiveLimit} consecutive violations`);

    } catch (error) {
      console.error('❌ Error starting MQTT Speed Processor:', error);
      throw error;
    }
  }

  /**
   * Maneja mensajes de velocidad recibidos por MQTT
   * @param {string} topic - Tópico MQTT
   * @param {object|string} message - Mensaje recibido
   */
  async handleSpeedMessage(topic, message) {
    const messageTimestamp = new Date();
    this.lastMessageTime = messageTimestamp;
    this.messageCount++;

    try {
      // Validar y parsear mensaje
      const speedData = this.parseSpeedMessage(message);
      
      if (!speedData) {
        this.errorCount++;
        console.warn(`⚠️  Invalid message format (${this.errorCount} errors total)`);
        return;
      }

      // Procesar datos de velocidad
      const processingResult = await this.speedProcessor.processSpeedData(speedData);

      if (!processingResult.success) {
        this.errorCount++;
        console.warn(`⚠️  Processing failed for vehicle ${speedData.vehicleId}: Processing error`);
        // Log del error detallado solo en debug
        if (process.env.NODE_ENV === 'development') {
          console.debug('Processing error details:', processingResult.error);
        }
        return;
      }

      // Generar alertas según los requerimientos
      await this.generateAlerts(processingResult);

      // Mostrar estadísticas cada 50 mensajes
      if (this.messageCount % 50 === 0) {
        this.showProcessingStats();
      }

    } catch (error) {
      this.errorCount++;
      console.error(`❌ Error processing speed message:`, error);
    }
  }

  /**
   * Parsea y valida un mensaje de velocidad
   * @param {object|string} message - Mensaje recibido
   * @returns {object|null} Datos parseados o null si es inválido
   */
  parseSpeedMessage(message) {
    try {
      let parsedMessage;

      // Parsear JSON si es string
      if (typeof message === 'string') {
        // Verificar que el string no esté vacío
        if (!message || message.trim().length === 0) {
          return null;
        }
        parsedMessage = JSON.parse(message);
      } else if (typeof message === 'object' && message !== null) {
        parsedMessage = message;
      } else {
        // Tipo de mensaje no soportado
        return null;
      }

      // Validar que parsedMessage sea un objeto válido
      if (!parsedMessage || typeof parsedMessage !== 'object') {
        return null;
      }

      // Validar campos requeridos según especificación
      if (!parsedMessage.vehicleId || typeof parsedMessage.speed !== 'number') {
        return null;
      }

      // Validar que la velocidad sea un número válido
      if (isNaN(parsedMessage.speed) || parsedMessage.speed < 0 || parsedMessage.speed > 500) {
        return null;
      }

      // Normalizar estructura
      return {
        vehicleId: String(parsedMessage.vehicleId).trim(),
        speed: Number(parsedMessage.speed),
        timestamp: parsedMessage.timestamp || new Date().toISOString(),
        location: parsedMessage.location || null,
        vehicleType: parsedMessage.vehicleType || 'unknown',
        metadata: parsedMessage.metadata || null
      };

    } catch (error) {
      // JSON malformado o error de parsing
      if (process.env.NODE_ENV === 'development') {
        console.debug('Message parsing error:', error.message, 'Raw message:', message);
      }
      return null;
    }
  }

  /**
   * Genera alertas según los requerimientos específicos
   * @param {object} processingResult - Resultado del procesamiento
   */
  async generateAlerts(processingResult) {
    const { data: speedData, violation, vehicleState } = processingResult;

    if (!violation) {
      return; // No hay violación
    }

    const timestamp = new Date(speedData.timestamp).toLocaleTimeString();

    try {
      // ALERTA SIMPLE: Si speed > 60
      if (violation.speed > this.speedLimit) {
        const simpleAlert = `ALERT: ${violation.vehicleId} exceeded speed at ${violation.speed} km/h at ${timestamp}`;
        console.log(`🚨 ${simpleAlert}`);

        // Publicar alerta simple en MQTT
        await this.publishAlert({
          type: 'SIMPLE',
          vehicleId: violation.vehicleId,
          speed: violation.speed,
          speedLimit: this.speedLimit,
          timestamp: speedData.timestamp,
          message: simpleAlert
        });
      }

      // ALERTA CRÍTICA: 3 o más violaciones consecutivas
      if (violation.isConsecutive && violation.consecutiveCount >= this.consecutiveLimit) {
        const criticalAlert = `CRITICAL ALERT: ${violation.vehicleId} exceeded speed consecutively ${violation.consecutiveCount} times`;
        console.log(`🚨🚨 ${criticalAlert}`);

        // Publicar alerta crítica en MQTT
        await this.publishAlert({
          type: 'CRITICAL',
          vehicleId: violation.vehicleId,
          speed: violation.speed,
          speedLimit: this.speedLimit,
          consecutiveCount: violation.consecutiveCount,
          timestamp: speedData.timestamp,
          message: criticalAlert
        });
      }

    } catch (error) {
      console.error('Error generating alerts:', error);
    }
  }

  /**
   * Publica una alerta en el tópico MQTT vehicles/alerts
   * @param {object} alertData - Datos de la alerta
   */
  async publishAlert(alertData) {
    try {
      const alertTopic = config.get('mqtt.topics.vehicleAlerts');
      
      const alertMessage = {
        ...alertData,
        alertId: `alert_${Date.now()}_${alertData.vehicleId}`,
        generatedAt: new Date().toISOString()
      };

      await this.mqttClient.publish(alertTopic, alertMessage, { qos: 2 });
      
    } catch (error) {
      console.error('Error publishing alert to MQTT:', error);
    }
  }

  /**
   * Muestra estadísticas de procesamiento
   */
  showProcessingStats() {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    const uptimeSeconds = Math.floor(uptime / 1000);
    const messagesPerSecond = uptimeSeconds > 0 ? (this.messageCount / uptimeSeconds).toFixed(2) : '0';

    console.log('\n📊 === PROCESSING STATISTICS ===');
    console.log(`📨 Messages processed: ${this.messageCount}`);
    console.log(`❌ Error count: ${this.errorCount}`);
    console.log(`📈 Messages/second: ${messagesPerSecond}`);
    console.log(`⏱️  Uptime: ${uptimeSeconds}s`);
    console.log(`🕐 Last message: ${this.lastMessageTime?.toLocaleTimeString() || 'None'}`);
    
    const processingStats = this.speedProcessor.getProcessingStats();
    console.log(`🚗 Active vehicles: ${processingStats.activeVehicles}`);
    console.log(`⚠️  Violations: ${processingStats.violationCount} (${processingStats.violationRate}%)`);
    console.log('================================\n');
  }

  /**
   * Detiene el procesador MQTT
   */
  async stop() {
    try {
      if (!this.isRunning) {
        console.warn('MQTT Speed Processor is not running');
        return;
      }

      console.log('Stopping MQTT Speed Processor...');

      // Desconectar MQTT
      await this.mqttClient.disconnect();

      // Cerrar conexiones de base de datos
      await this.speedRepository.close();
      await this.alertRepository.close();

      this.isRunning = false;

      console.log('✅ MQTT Speed Processor stopped successfully');
      this.showProcessingStats();

    } catch (error) {
      console.error('❌ Error stopping MQTT Speed Processor:', error);
      throw error;
    }
  }

  /**
   * Obtiene el estado actual del procesador
   * @returns {object} Estado del procesador
   */
  getStatus() {
    const uptime = this.startTime ? Date.now() - this.startTime.getTime() : 0;
    
    return {
      isRunning: this.isRunning,
      messageCount: this.messageCount,
      errorCount: this.errorCount,
      lastMessageTime: this.lastMessageTime,
      startTime: this.startTime,
      uptime,
      speedLimit: this.speedLimit,
      consecutiveLimit: this.consecutiveLimit,
      mqttStatus: this.mqttClient.getConnectionStatus(),
      processingStats: this.speedProcessor.getProcessingStats()
    };
  }

  /**
   * Maneja reconexión en caso de pérdida de conexión
   */
  async handleReconnection() {
    console.log('🔄 Attempting to reconnect MQTT...');
    
    try {
      await this.mqttClient.connect();
      
      // Re-suscribirse al tópico
      const speedTopic = config.get('mqtt.topics.vehicleSpeed');
      await this.mqttClient.subscribe(speedTopic, this.handleSpeedMessage.bind(this));
      
      console.log('✅ MQTT reconnection successful');
      
    } catch (error) {
      console.error('❌ MQTT reconnection failed:', error);
      
      // Intentar reconectar en 5 segundos
      setTimeout(() => {
        this.handleReconnection();
      }, 5000);
    }
  }
}

module.exports = MqttSpeedProcessor;
