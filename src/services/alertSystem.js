const config = require('../config/config');

/**
 * Sistema de alertas siguiendo principios SOLID
 * Principio: Single Responsibility - Solo maneja alertas
 * Principio: Open/Closed - Abierto para nuevos tipos de alerta
 * Principio: Strategy Pattern - Diferentes estrategias de alerta
 */
class AlertSystem {
  constructor(mqttClient = null, notificationHandlers = []) {
    this.mqttClient = mqttClient; // Inyección de dependencia
    this.notificationHandlers = notificationHandlers; // Inyección de dependencia
    this.alertHistory = []; // Historial de alertas en memoria
    this.activeAlerts = new Map(); // Alertas activas por vehículo
    this.alertStrategies = new Map(); // Estrategias de procesamiento
    this.maxHistorySize = 1000;
    this.suppressionWindow = 30000; // 30 segundos para evitar spam
    
    this.initializeStrategies();
  }

  /**
   * Inicializa las estrategias de alerta
   */
  initializeStrategies() {
    // Estrategia para violaciones simples
    this.alertStrategies.set('simple', new SimpleViolationStrategy());
    
    // Estrategia para violaciones consecutivas
    this.alertStrategies.set('consecutive', new ConsecutiveViolationStrategy());
    
    // Estrategia para violaciones críticas
    this.alertStrategies.set('critical', new CriticalViolationStrategy());
    
    // Estrategia para patrones de velocidad
    this.alertStrategies.set('pattern', new PatternViolationStrategy());
  }

  /**
   * Procesa una violación de velocidad
   * @param {object} violation - Datos de la violación
   * @returns {object} Resultado del procesamiento
   */
  async processViolation(violation) {
    try {
      // Verificar supresión de alertas duplicadas
      if (this.shouldSuppressAlert(violation)) {
        return {
          success: true,
          suppressed: true,
          reason: 'Alert suppressed due to recent similar alert'
        };
      }

      // Determinar estrategia de alerta
      const strategy = this.determineStrategy(violation);
      
      // Procesar violación con la estrategia adecuada
      const alertData = await strategy.processViolation(violation);
      
      // Crear alerta
      const alert = this.createAlert(violation, alertData);
      
      // Almacenar alerta
      this.storeAlert(alert);
      
      // Enviar notificaciones
      await this.sendNotifications(alert);
      
      return {
        success: true,
        alert,
        strategy: strategy.name
      };

    } catch (error) {
      console.error('Error processing violation:', error);
      
      return {
        success: false,
        error: error.message,
        violation
      };
    }
  }

  /**
   * Determina la estrategia de alerta basada en la violación
   * @param {object} violation - Datos de la violación
   * @returns {object} Estrategia seleccionada
   */
  determineStrategy(violation) {
    // Violación crítica (velocidad muy alta)
    if (violation.severity === 'CRITICAL') {
      return this.alertStrategies.get('critical');
    }
    
    // Violaciones consecutivas
    if (violation.isConsecutive) {
      return this.alertStrategies.get('consecutive');
    }
    
    // Violación simple
    return this.alertStrategies.get('simple');
  }

  /**
   * Verifica si se debe suprimir una alerta
   * @param {object} violation - Datos de la violación
   * @returns {boolean} True si se debe suprimir
   */
  shouldSuppressAlert(violation) {
    const activeAlert = this.activeAlerts.get(violation.vehicleId);
    
    if (!activeAlert) {
      return false;
    }

    const timeDiff = Date.now() - activeAlert.lastAlert;
    return timeDiff < this.suppressionWindow;
  }

  /**
   * Crea un objeto de alerta estructurado
   * @param {object} violation - Datos de la violación
   * @param {object} alertData - Datos adicionales de la estrategia
   * @returns {object} Alerta creada
   */
  createAlert(violation, alertData) {
    const alert = {
      id: `alert_${Date.now()}_${violation.vehicleId}`,
      type: 'SPEED_VIOLATION',
      severity: violation.severity,
      vehicleId: violation.vehicleId,
      speed: violation.speed,
      speedLimit: violation.speedLimit,
      exceedAmount: violation.exceedAmount,
      exceedPercentage: violation.exceedPercentage,
      location: violation.location,
      vehicleType: violation.vehicleType,
      timestamp: violation.timestamp,
      detectedAt: violation.detectedAt,
      createdAt: new Date(),
      isConsecutive: violation.isConsecutive,
      consecutiveCount: violation.consecutiveCount,
      status: 'ACTIVE',
      ...alertData // Datos adicionales de la estrategia
    };

    return alert;
  }

  /**
   * Almacena la alerta en el historial y actualiza alertas activas
   * @param {object} alert - Alerta a almacenar
   */
  storeAlert(alert) {
    // Agregar al historial
    this.alertHistory.unshift(alert);
    
    // Mantener tamaño del historial
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory.pop();
    }

    // Actualizar alertas activas
    this.activeAlerts.set(alert.vehicleId, {
      lastAlert: Date.now(),
      alertId: alert.id,
      severity: alert.severity
    });
  }

  /**
   * Envía notificaciones de la alerta
   * @param {object} alert - Alerta a notificar
   */
  async sendNotifications(alert) {
    const notifications = [];

    try {
      // Publicar en MQTT si está disponible
      if (this.mqttClient) {
        await this.mqttClient.publishAlert(alert);
        notifications.push({ type: 'mqtt', success: true });
      }

      // Ejecutar handlers de notificación
      for (const handler of this.notificationHandlers) {
        try {
          await handler.sendNotification(alert);
          notifications.push({ type: handler.name, success: true });
        } catch (error) {
          console.error(`Error in notification handler ${handler.name}:`, error);
          notifications.push({ type: handler.name, success: false, error: error.message });
        }
      }

      console.log(`Alert ${alert.id} notifications sent:`, notifications);

    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  }

  /**
   * Obtiene alertas por criterios
   * @param {object} criteria - Criterios de búsqueda
   * @returns {Array} Array de alertas filtradas
   */
  getAlerts(criteria = {}) {
    let filteredAlerts = [...this.alertHistory];

    if (criteria.vehicleId) {
      filteredAlerts = filteredAlerts.filter(alert => alert.vehicleId === criteria.vehicleId);
    }

    if (criteria.severity) {
      filteredAlerts = filteredAlerts.filter(alert => alert.severity === criteria.severity);
    }

    if (criteria.startDate) {
      const startDate = new Date(criteria.startDate);
      filteredAlerts = filteredAlerts.filter(alert => alert.createdAt >= startDate);
    }

    if (criteria.endDate) {
      const endDate = new Date(criteria.endDate);
      filteredAlerts = filteredAlerts.filter(alert => alert.createdAt <= endDate);
    }

    if (criteria.limit) {
      filteredAlerts = filteredAlerts.slice(0, criteria.limit);
    }

    return filteredAlerts;
  }

  /**
   * Obtiene estadísticas de alertas
   * @returns {object} Estadísticas de alertas
   */
  getAlertStats() {
    const stats = {
      total: this.alertHistory.length,
      active: this.activeAlerts.size,
      bySeverity: {},
      byVehicle: {},
      recentCount: 0
    };

    const recentTime = Date.now() - 3600000; // Última hora

    for (const alert of this.alertHistory) {
      // Por severidad
      stats.bySeverity[alert.severity] = (stats.bySeverity[alert.severity] || 0) + 1;
      
      // Por vehículo
      stats.byVehicle[alert.vehicleId] = (stats.byVehicle[alert.vehicleId] || 0) + 1;
      
      // Recientes
      if (alert.createdAt.getTime() > recentTime) {
        stats.recentCount++;
      }
    }

    return stats;
  }

  /**
   * Limpia alertas antiguas
   * @param {number} maxAge - Edad máxima en milisegundos
   * @returns {number} Número de alertas eliminadas
   */
  cleanupOldAlerts(maxAge = 86400000) { // 24 horas por defecto
    const cutoffTime = Date.now() - maxAge;
    const initialLength = this.alertHistory.length;

    this.alertHistory = this.alertHistory.filter(alert => 
      alert.createdAt.getTime() > cutoffTime
    );

    const cleaned = initialLength - this.alertHistory.length;
    
    if (cleaned > 0) {
      console.log(`Cleaned up ${cleaned} old alerts`);
    }

    return cleaned;
  }
}

/**
 * Estrategia para violaciones simples
 */
class SimpleViolationStrategy {
  constructor() {
    this.name = 'simple';
  }

  async processViolation(violation) {
    return {
      priority: 'NORMAL',
      recommendedAction: 'Monitor vehicle speed',
      description: `Vehicle ${violation.vehicleId} exceeded speed limit by ${violation.exceedAmount.toFixed(1)} km/h`
    };
  }
}

/**
 * Estrategia para violaciones consecutivas
 */
class ConsecutiveViolationStrategy {
  constructor() {
    this.name = 'consecutive';
  }

  async processViolation(violation) {
    return {
      priority: 'HIGH',
      recommendedAction: 'Immediate intervention required',
      description: `Vehicle ${violation.vehicleId} has ${violation.consecutiveCount} consecutive violations`,
      escalated: true
    };
  }
}

/**
 * Estrategia para violaciones críticas
 */
class CriticalViolationStrategy {
  constructor() {
    this.name = 'critical';
  }

  async processViolation(violation) {
    return {
      priority: 'CRITICAL',
      recommendedAction: 'Emergency response required',
      description: `CRITICAL: Vehicle ${violation.vehicleId} at ${violation.speed} km/h (${violation.exceedPercentage}% over limit)`,
      requiresImmediate: true,
      escalated: true
    };
  }
}

/**
 * Estrategia para patrones de violación
 */
class PatternViolationStrategy {
  constructor() {
    this.name = 'pattern';
  }

  async processViolation(violation) {
    return {
      priority: 'MEDIUM',
      recommendedAction: 'Pattern analysis required',
      description: `Pattern violation detected for vehicle ${violation.vehicleId}`,
      patternDetected: true
    };
  }
}

module.exports = AlertSystem;
