const SimpleSpeedValidator = require('../validators/simpleSpeedValidator');
const config = require('../config/config');

/**
 * Procesador de datos de velocidad siguiendo principios SOLID
 * Principio: Single Responsibility - Solo procesa datos de velocidad
 * Principio: Open/Closed - Abierto para extensión, cerrado para modificación
 * Principio: Dependency Inversion - Depende de abstracciones
 */
class SpeedProcessor {
  constructor(alertSystem = null, dataStore = null) {
    this.validator = new SpeedDataValidator();
    this.alertSystem = alertSystem; // Inyección de dependencia
    this.dataStore = dataStore; // Inyección de dependencia
    this.vehicleStates = new Map(); // Estado en memoria de vehículos
    this.speedLimit = config.get('alerts.speedLimit');
    this.consecutiveLimit = config.get('alerts.consecutiveLimit');
    this.timeWindow = config.get('alerts.timeWindow');
    this.processedCount = 0;
    this.violationCount = 0;
  }

  /**
   * Procesa un mensaje individual de velocidad
   * @param {object} rawData - Datos sin procesar
   * @returns {object} Resultado del procesamiento
   */
  async processSpeedData(rawData) {
    try {
      // Validar datos
      const validationResult = this.validator.validateSpeedData(rawData);
      
      if (!validationResult.isValid) {
        return {
          success: false,
          error: 'Validation failed',
          details: validationResult.errors,
          originalData: rawData
        };
      }

      const speedData = validationResult.data;
      this.processedCount++;

      // Actualizar estado del vehículo
      const vehicleState = this.updateVehicleState(speedData);

      // Verificar violaciones de velocidad
      const violation = this.checkSpeedViolation(speedData, vehicleState);

      // Almacenar en base de datos si hay dataStore disponible
      if (this.dataStore) {
        await this.dataStore.saveSpeedRecord(speedData);
      }

      // Generar alertas si es necesario
      if (violation && this.alertSystem) {
        await this.alertSystem.processViolation(violation);
      }

      return {
        success: true,
        data: speedData,
        vehicleState,
        violation,
        stats: this.getProcessingStats()
      };

    } catch (error) {
      console.error('Error processing speed data:', error);
      
      return {
        success: false,
        error: 'Processing error',
        details: error.message,
        originalData: rawData
      };
    }
  }

  /**
   * Procesa un lote de mensajes de velocidad
   * @param {array} rawDataArray - Array de datos sin procesar
   * @returns {object} Resultado del procesamiento en lote
   */
  async processBatch(rawDataArray) {
    try {
      const batchValidation = this.validator.validateBatch(rawDataArray);
      
      if (!batchValidation.isValid) {
        return {
          success: false,
          error: 'Batch validation failed',
          details: batchValidation.errors,
          validCount: 0,
          totalCount: rawDataArray.length
        };
      }

      const results = [];
      const violations = [];

      for (const speedData of batchValidation.validItems) {
        const result = await this.processSpeedData(speedData);
        results.push(result);

        if (result.violation) {
          violations.push(result.violation);
        }
      }

      return {
        success: true,
        results,
        violations,
        stats: {
          total: rawDataArray.length,
          processed: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length,
          violations: violations.length
        }
      };

    } catch (error) {
      console.error('Error processing batch:', error);
      
      return {
        success: false,
        error: 'Batch processing error',
        details: error.message,
        validCount: 0,
        totalCount: rawDataArray.length
      };
    }
  }

  /**
   * Actualiza el estado de un vehículo
   * @param {object} speedData - Datos de velocidad validados
   * @returns {object} Estado actualizado del vehículo
   */
  updateVehicleState(speedData) {
    const { vehicleId } = speedData;
    
    const currentState = this.vehicleStates.get(vehicleId) || {
      vehicleId,
      lastSeen: null,
      consecutiveViolations: 0,
      totalViolations: 0,
      averageSpeed: 0,
      maxSpeed: 0,
      recordCount: 0,
      speedHistory: []
    };

    // Actualizar estadísticas
    currentState.lastSeen = speedData.timestamp;
    currentState.recordCount++;
    currentState.maxSpeed = Math.max(currentState.maxSpeed, speedData.speed);

    // Calcular velocidad promedio
    const totalSpeed = (currentState.averageSpeed * (currentState.recordCount - 1)) + speedData.speed;
    currentState.averageSpeed = totalSpeed / currentState.recordCount;

    // Mantener historial de velocidades (últimas 10)
    currentState.speedHistory.push({
      speed: speedData.speed,
      timestamp: speedData.timestamp
    });

    if (currentState.speedHistory.length > 10) {
      currentState.speedHistory.shift();
    }

    // Verificar violación consecutiva
    if (speedData.speed > this.speedLimit) {
      currentState.consecutiveViolations++;
      currentState.totalViolations++;
    } else {
      currentState.consecutiveViolations = 0; // Reset si no hay violación
    }

    // Actualizar en memoria
    this.vehicleStates.set(vehicleId, currentState);

    return { ...currentState };
  }

  /**
   * Verifica si hay violación de velocidad
   * @param {object} speedData - Datos de velocidad
   * @param {object} vehicleState - Estado del vehículo
   * @returns {object|null} Datos de violación o null
   */
  checkSpeedViolation(speedData, vehicleState) {
    if (speedData.speed <= this.speedLimit) {
      return null; // No hay violación
    }

    this.violationCount++;

    // Determinar severidad de la violación
    const exceedAmount = speedData.speed - this.speedLimit;
    const exceedPercentage = (exceedAmount / this.speedLimit) * 100;

    let severity;
    if (exceedPercentage > 50) {
      severity = 'CRITICAL';
    } else if (exceedPercentage > 25) {
      severity = 'HIGH';
    } else if (exceedPercentage > 10) {
      severity = 'MEDIUM';
    } else {
      severity = 'LOW';
    }

    // Verificar si es violación consecutiva crítica
    const isConsecutive = vehicleState.consecutiveViolations >= this.consecutiveLimit;

    return {
      id: `violation_${Date.now()}_${speedData.vehicleId}`,
      vehicleId: speedData.vehicleId,
      speed: speedData.speed,
      speedLimit: this.speedLimit,
      exceedAmount,
      exceedPercentage: parseFloat(exceedPercentage.toFixed(2)),
      severity,
      isConsecutive,
      consecutiveCount: vehicleState.consecutiveViolations,
      timestamp: speedData.timestamp,
      location: speedData.location || null,
      vehicleType: speedData.vehicleType || 'unknown',
      detectedAt: new Date()
    };
  }

  /**
   * Obtiene el estado actual de un vehículo
   * @param {string} vehicleId - ID del vehículo
   * @returns {object|null} Estado del vehículo o null
   */
  getVehicleState(vehicleId) {
    return this.vehicleStates.get(vehicleId) || null;
  }

  /**
   * Obtiene todos los estados de vehículos
   * @returns {Array} Array de estados de vehículos
   */
  getAllVehicleStates() {
    return Array.from(this.vehicleStates.values());
  }

  /**
   * Limpia estados de vehículos antiguos
   * @param {number} maxAge - Edad máxima en milisegundos
   * @returns {number} Número de estados eliminados
   */
  cleanupOldStates(maxAge = 3600000) { // 1 hora por defecto
    const cutoffTime = new Date(Date.now() - maxAge);
    let cleanedCount = 0;

    for (const [vehicleId, state] of this.vehicleStates.entries()) {
      if (state.lastSeen < cutoffTime) {
        this.vehicleStates.delete(vehicleId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} old vehicle states`);
    }

    return cleanedCount;
  }

  /**
   * Obtiene estadísticas de procesamiento
   * @returns {object} Estadísticas actuales
   */
  getProcessingStats() {
    return {
      processedCount: this.processedCount,
      violationCount: this.violationCount,
      activeVehicles: this.vehicleStates.size,
      speedLimit: this.speedLimit,
      violationRate: this.processedCount > 0 ? 
        parseFloat(((this.violationCount / this.processedCount) * 100).toFixed(2)) : 0
    };
  }

  /**
   * Resetea estadísticas de procesamiento
   */
  resetStats() {
    this.processedCount = 0;
    this.violationCount = 0;
    console.log('Processing statistics reset');
  }

  /**
   * Actualiza la configuración del procesador
   * @param {object} newConfig - Nueva configuración
   */
  updateConfiguration(newConfig) {
    if (newConfig.speedLimit && newConfig.speedLimit > 0) {
      this.speedLimit = newConfig.speedLimit;
    }

    if (newConfig.consecutiveLimit && newConfig.consecutiveLimit > 0) {
      this.consecutiveLimit = newConfig.consecutiveLimit;
    }

    if (newConfig.timeWindow && newConfig.timeWindow > 0) {
      this.timeWindow = newConfig.timeWindow;
    }

    console.log('Speed processor configuration updated');
  }
}

module.exports = SpeedProcessor;
