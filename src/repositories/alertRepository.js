const BaseRepository = require('./baseRepository');

/**
 * Repositorio para alertas
 * Principio: Single Responsibility - Solo maneja datos de alertas
 * Principio: Liskov Substitution - Puede sustituir al BaseRepository
 */
class AlertRepository extends BaseRepository {
  constructor() {
    super();
    this.tableName = 'alerts';
  }

  /**
   * Guarda una alerta
   * @param {object} alertData - Datos de la alerta
   * @returns {Promise<object>} Alerta guardada
   */
  async saveAlert(alertData) {
    try {
      const recordData = {
        alert_id: alertData.id,
        vehicle_id: alertData.vehicleId,
        type: alertData.type || 'SPEED_VIOLATION',
        severity: alertData.severity,
        speed: alertData.speed,
        speed_limit: alertData.speedLimit,
        exceed_amount: alertData.exceedAmount,
        exceed_percentage: alertData.exceedPercentage,
        is_consecutive: alertData.isConsecutive || false,
        consecutive_count: alertData.consecutiveCount || 1,
        location: alertData.location ? JSON.stringify(alertData.location) : null,
        vehicle_type: alertData.vehicleType || 'unknown',
        status: alertData.status || 'ACTIVE',
        priority: alertData.priority || 'NORMAL',
        recommended_action: alertData.recommendedAction,
        description: alertData.description,
        additional_data: alertData.additionalData ? JSON.stringify(alertData.additionalData) : null,
        violation_timestamp: alertData.timestamp,
        detected_at: alertData.detectedAt || new Date()
      };

      const savedAlert = await this.insert(this.tableName, recordData);
      
      // Convertir JSON strings de vuelta a objetos
      if (savedAlert.location) {
        savedAlert.location = JSON.parse(savedAlert.location);
      }
      if (savedAlert.additional_data) {
        savedAlert.additional_data = JSON.parse(savedAlert.additional_data);
      }

      return savedAlert;

    } catch (error) {
      console.error('Error saving alert:', error);
      throw error;
    }
  }

  /**
   * Obtiene alertas por vehículo
   * @param {string} vehicleId - ID del vehículo
   * @param {object} options - Opciones de búsqueda
   * @returns {Promise<array>} Alertas del vehículo
   */
  async getByVehicleId(vehicleId, options = {}) {
    try {
      const conditions = { vehicle_id: vehicleId };
      
      if (options.status) {
        conditions.status = options.status;
      }

      if (options.severity) {
        conditions.severity = options.severity;
      }

      const searchOptions = {
        orderBy: options.orderBy || 'created_at DESC',
        limit: options.limit || 100,
        offset: options.offset || 0
      };

      const alerts = await this.findWhere(this.tableName, conditions, searchOptions);
      
      return this.parseJsonFields(alerts);

    } catch (error) {
      console.error('Error getting alerts by vehicle:', error);
      throw error;
    }
  }

  /**
   * Obtiene alertas por severidad
   * @param {string} severity - Severidad de la alerta
   * @param {object} options - Opciones de búsqueda
   * @returns {Promise<array>} Alertas por severidad
   */
  async getBySeverity(severity, options = {}) {
    try {
      const conditions = { severity };
      
      if (options.status) {
        conditions.status = options.status;
      }

      const searchOptions = {
        orderBy: options.orderBy || 'created_at DESC',
        limit: options.limit || 100,
        offset: options.offset || 0
      };

      const alerts = await this.findWhere(this.tableName, conditions, searchOptions);
      
      return this.parseJsonFields(alerts);

    } catch (error) {
      console.error('Error getting alerts by severity:', error);
      throw error;
    }
  }

  /**
   * Obtiene alertas en un rango de tiempo
   * @param {Date} startDate - Fecha inicio
   * @param {Date} endDate - Fecha fin
   * @param {object} options - Opciones adicionales
   * @returns {Promise<array>} Alertas en el rango
   */
  async getByTimeRange(startDate, endDate, options = {}) {
    try {
      let whereClause = 'WHERE created_at >= $1 AND created_at <= $2';
      let params = [startDate, endDate];

      if (options.vehicleId) {
        whereClause += ' AND vehicle_id = $3';
        params.push(options.vehicleId);
      }

      if (options.severity) {
        const severityParam = params.length + 1;
        whereClause += ` AND severity = $${severityParam}`;
        params.push(options.severity);
      }

      if (options.status) {
        const statusParam = params.length + 1;
        whereClause += ` AND status = $${statusParam}`;
        params.push(options.status);
      }

      const orderClause = options.orderBy || 'created_at DESC';
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';

      const query = `
        SELECT * FROM ${this.tableName} 
        ${whereClause} 
        ORDER BY ${orderClause} 
        ${limitClause}
      `;

      const result = await this.query(query, params);
      
      return this.parseJsonFields(result.rows);

    } catch (error) {
      console.error('Error getting alerts by time range:', error);
      throw error;
    }
  }

  /**
   * Obtiene alertas activas
   * @param {object} options - Opciones de búsqueda
   * @returns {Promise<array>} Alertas activas
   */
  async getActiveAlerts(options = {}) {
    try {
      return await this.getBySeverity(null, { 
        ...options, 
        status: 'ACTIVE' 
      });

    } catch (error) {
      console.error('Error getting active alerts:', error);
      throw error;
    }
  }

  /**
   * Obtiene alertas críticas
   * @param {object} options - Opciones de búsqueda
   * @returns {Promise<array>} Alertas críticas
   */
  async getCriticalAlerts(options = {}) {
    try {
      return await this.getBySeverity('CRITICAL', options);

    } catch (error) {
      console.error('Error getting critical alerts:', error);
      throw error;
    }
  }

  /**
   * Actualiza el estado de una alerta
   * @param {string} alertId - ID de la alerta
   * @param {string} status - Nuevo estado
   * @param {object} additionalData - Datos adicionales
   * @returns {Promise<object|null>} Alerta actualizada
   */
  async updateStatus(alertId, status, additionalData = {}) {
    try {
      const updateData = { 
        status,
        ...additionalData
      };

      if (status === 'RESOLVED') {
        updateData.resolved_at = new Date();
      }

      const updatedAlert = await this.update(this.tableName, alertId, updateData, 'alert_id');
      
      if (updatedAlert) {
        return this.parseJsonFields([updatedAlert])[0];
      }

      return null;

    } catch (error) {
      console.error('Error updating alert status:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de alertas
   * @param {object} options - Opciones de tiempo
   * @returns {Promise<object>} Estadísticas de alertas
   */
  async getAlertStats(options = {}) {
    try {
      let whereClause = '';
      let params = [];

      if (options.startDate && options.endDate) {
        whereClause = 'WHERE created_at >= $1 AND created_at <= $2';
        params.push(options.startDate, options.endDate);
      }

      const query = `
        SELECT 
          COUNT(*) as total_alerts,
          COUNT(DISTINCT vehicle_id) as affected_vehicles,
          COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low_severity,
          COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_severity,
          COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_severity,
          COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_severity,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_alerts,
          COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END) as resolved_alerts,
          COUNT(CASE WHEN is_consecutive = true THEN 1 END) as consecutive_violations,
          ROUND(AVG(exceed_percentage), 2) as avg_exceed_percentage,
          ROUND(MAX(exceed_percentage), 2) as max_exceed_percentage
        FROM ${this.tableName} 
        ${whereClause}
      `;

      const result = await this.query(query, params);
      return result.rows[0];

    } catch (error) {
      console.error('Error getting alert stats:', error);
      throw error;
    }
  }

  /**
   * Obtiene alertas agrupadas por vehículo
   * @param {object} options - Opciones de búsqueda
   * @returns {Promise<array>} Alertas agrupadas por vehículo
   */
  async getAlertsByVehicle(options = {}) {
    try {
      let whereClause = '';
      let params = [];

      if (options.startDate && options.endDate) {
        whereClause = 'WHERE created_at >= $1 AND created_at <= $2';
        params.push(options.startDate, options.endDate);
      }

      const query = `
        SELECT 
          vehicle_id,
          COUNT(*) as total_alerts,
          COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) as critical_count,
          COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) as high_count,
          COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) as medium_count,
          COUNT(CASE WHEN severity = 'LOW' THEN 1 END) as low_count,
          COUNT(CASE WHEN status = 'ACTIVE' THEN 1 END) as active_count,
          ROUND(AVG(exceed_percentage), 2) as avg_exceed_percentage,
          MAX(created_at) as last_alert_time
        FROM ${this.tableName} 
        ${whereClause}
        GROUP BY vehicle_id
        ORDER BY total_alerts DESC
      `;

      const result = await this.query(query, params);
      return result.rows;

    } catch (error) {
      console.error('Error getting alerts by vehicle:', error);
      throw error;
    }
  }

  /**
   * Elimina alertas antiguas
   * @param {number} daysOld - Días de antigüedad
   * @returns {Promise<number>} Número de alertas eliminadas
   */
  async cleanupOldAlerts(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const query = `
        DELETE FROM ${this.tableName} 
        WHERE created_at < $1 AND status IN ('RESOLVED', 'DISMISSED')
      `;
      
      const result = await this.query(query, [cutoffDate]);

      console.log(`Cleaned up ${result.rowCount} old alerts`);
      return result.rowCount;

    } catch (error) {
      console.error('Error cleaning up old alerts:', error);
      throw error;
    }
  }

  /**
   * Parsea campos JSON en los resultados
   * @param {array} alerts - Array de alertas
   * @returns {array} Alertas con campos JSON parseados
   */
  parseJsonFields(alerts) {
    return alerts.map(alert => {
      if (alert.location) {
        try {
          alert.location = JSON.parse(alert.location);
        } catch (e) {
          alert.location = null;
        }
      }
      
      if (alert.additional_data) {
        try {
          alert.additional_data = JSON.parse(alert.additional_data);
        } catch (e) {
          alert.additional_data = null;
        }
      }
      
      return alert;
    });
  }
}

module.exports = AlertRepository;
