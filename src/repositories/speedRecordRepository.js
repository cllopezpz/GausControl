const BaseRepository = require('./baseRepository');

/**
 * Repositorio para registros de velocidad
 * Principio: Single Responsibility - Solo maneja datos de velocidad
 * Principio: Liskov Substitution - Puede sustituir al BaseRepository
 */
class SpeedRecordRepository extends BaseRepository {
  constructor() {
    super();
    this.tableName = 'speed_records';
  }

  /**
   * Guarda un registro de velocidad
   * @param {object} speedData - Datos de velocidad validados
   * @returns {Promise<object>} Registro guardado
   */
  async saveSpeedRecord(speedData) {
    try {
      const recordData = {
        vehicle_id: speedData.vehicleId,
        speed: speedData.speed,
        speed_limit: speedData.speedLimit || 60.0,
        location: speedData.location ? JSON.stringify(speedData.location) : null,
        metadata: speedData.metadata ? JSON.stringify(speedData.metadata) : null,
        timestamp: speedData.timestamp,
        received_at: speedData.receivedAt || new Date()
      };

      const savedRecord = await this.insert(this.tableName, recordData);
      
      // Convertir JSON strings de vuelta a objetos
      if (savedRecord.location) {
        try {
          savedRecord.location = typeof savedRecord.location === 'string' 
            ? JSON.parse(savedRecord.location) 
            : savedRecord.location;
        } catch (error) {
          console.warn('Error parsing location JSON:', error.message);
          savedRecord.location = null;
        }
      }
      if (savedRecord.metadata) {
        try {
          savedRecord.metadata = typeof savedRecord.metadata === 'string' 
            ? JSON.parse(savedRecord.metadata) 
            : savedRecord.metadata;
        } catch (error) {
          console.warn('Error parsing metadata JSON:', error.message);
          savedRecord.metadata = null;
        }
      }

      return savedRecord;

    } catch (error) {
      console.error('Error saving speed record:', error);
      throw error;
    }
  }

  /**
   * Guarda múltiples registros en una transacción
   * @param {array} speedDataArray - Array de datos de velocidad
   * @returns {Promise<array>} Registros guardados
   */
  async saveBatch(speedDataArray) {
    try {
      return await this.transaction(async (client) => {
        const savedRecords = [];

        for (const speedData of speedDataArray) {
          const recordData = {
            vehicle_id: speedData.vehicleId,
            speed: speedData.speed,
            speed_limit: speedData.speedLimit || 60.0,
            location: speedData.location ? JSON.stringify(speedData.location) : null,
            metadata: speedData.metadata ? JSON.stringify(speedData.metadata) : null,
            timestamp: speedData.timestamp,
            received_at: speedData.receivedAt || new Date()
          };

          const columns = Object.keys(recordData);
          const values = Object.values(recordData);
          const placeholders = values.map((_, index) => `$${index + 1}`);

          const query = `
            INSERT INTO ${this.tableName} (${columns.join(', ')}) 
            VALUES (${placeholders.join(', ')}) 
            RETURNING *
          `;

          const result = await client.query(query, values);
          const savedRecord = result.rows[0];

          // Convertir JSON strings
          if (savedRecord.location) {
            try {
              savedRecord.location = typeof savedRecord.location === 'string' 
                ? JSON.parse(savedRecord.location) 
                : savedRecord.location;
            } catch (error) {
              console.warn('Error parsing location JSON in batch:', error.message);
              savedRecord.location = null;
            }
          }
          if (savedRecord.metadata) {
            try {
              savedRecord.metadata = typeof savedRecord.metadata === 'string' 
                ? JSON.parse(savedRecord.metadata) 
                : savedRecord.metadata;
            } catch (error) {
              console.warn('Error parsing metadata JSON in batch:', error.message);
              savedRecord.metadata = null;
            }
          }

          savedRecords.push(savedRecord);
        }

        return savedRecords;
      });

    } catch (error) {
      console.error('Error saving speed record batch:', error);
      throw error;
    }
  }

  /**
   * Obtiene registros de velocidad por vehículo
   * @param {string} vehicleId - ID del vehículo
   * @param {object} options - Opciones de búsqueda
   * @returns {Promise<array>} Registros de velocidad
   */
  async getByVehicleId(vehicleId, options = {}) {
    try {
      const conditions = { vehicle_id: vehicleId };
      const searchOptions = {
        orderBy: options.orderBy || 'timestamp DESC',
        limit: options.limit || 100,
        offset: options.offset || 0
      };

      const records = await this.findWhere(this.tableName, conditions, searchOptions);
      
      // Convertir JSON strings
      return records.map(record => {
        if (record.location) {
          try {
            record.location = typeof record.location === 'string' 
              ? JSON.parse(record.location) 
              : record.location;
          } catch (error) {
            console.warn('Error parsing location JSON in getByVehicleId:', error.message);
            record.location = null;
          }
        }
        if (record.metadata) {
          try {
            record.metadata = typeof record.metadata === 'string' 
              ? JSON.parse(record.metadata) 
              : record.metadata;
          } catch (error) {
            console.warn('Error parsing metadata JSON in getByVehicleId:', error.message);
            record.metadata = null;
          }
        }
        return record;
      });

    } catch (error) {
      console.error('Error getting speed records by vehicle:', error);
      throw error;
    }
  }

  /**
   * Obtiene registros en un rango de tiempo
   * @param {Date} startDate - Fecha inicio
   * @param {Date} endDate - Fecha fin
   * @param {object} options - Opciones adicionales
   * @returns {Promise<array>} Registros en el rango
   */
  async getByTimeRange(startDate, endDate, options = {}) {
    try {
      let whereClause = 'WHERE timestamp >= $1 AND timestamp <= $2';
      let params = [startDate, endDate];

      if (options.vehicleId) {
        whereClause += ' AND vehicle_id = $3';
        params.push(options.vehicleId);
      }

      const orderClause = options.orderBy || 'timestamp DESC';
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
      const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

      const query = `
        SELECT * FROM ${this.tableName} 
        ${whereClause} 
        ORDER BY ${orderClause} 
        ${limitClause} 
        ${offsetClause}
      `;

      const result = await this.query(query, params);
      
      // Convertir JSON strings
      return result.rows.map(record => {
        if (record.location) {
          try {
            record.location = typeof record.location === 'string' 
              ? JSON.parse(record.location) 
              : record.location;
          } catch (error) {
            console.warn('Error parsing location JSON in getByTimeRange:', error.message);
            record.location = null;
          }
        }
        if (record.metadata) {
          try {
            record.metadata = typeof record.metadata === 'string' 
              ? JSON.parse(record.metadata) 
              : record.metadata;
          } catch (error) {
            console.warn('Error parsing metadata JSON in getByTimeRange:', error.message);
            record.metadata = null;
          }
        }
        return record;
      });

    } catch (error) {
      console.error('Error getting speed records by time range:', error);
      throw error;
    }
  }

  /**
   * Obtiene violaciones de velocidad
   * @param {object} options - Opciones de búsqueda
   * @returns {Promise<array>} Registros de violaciones
   */
  async getViolations(options = {}) {
    try {
      let whereClause = 'WHERE speed > speed_limit';
      let params = [];

      if (options.vehicleId) {
        whereClause += ' AND vehicle_id = $1';
        params.push(options.vehicleId);
      }

      if (options.startDate && options.endDate) {
        const dateParam = params.length + 1;
        whereClause += ` AND timestamp >= $${dateParam} AND timestamp <= $${dateParam + 1}`;
        params.push(options.startDate, options.endDate);
      }

      const orderClause = options.orderBy || 'timestamp DESC';
      const limitClause = options.limit ? `LIMIT ${options.limit}` : '';

      const query = `
        SELECT *, (speed - speed_limit) as exceed_amount,
               ROUND(((speed - speed_limit) / speed_limit * 100), 2) as exceed_percentage
        FROM ${this.tableName} 
        ${whereClause} 
        ORDER BY ${orderClause} 
        ${limitClause}
      `;

      const result = await this.query(query, params);
      
      return result.rows.map(record => {
        if (record.location) {
          try {
            record.location = typeof record.location === 'string' 
              ? JSON.parse(record.location) 
              : record.location;
          } catch (error) {
            console.warn('Error parsing location JSON in getViolations:', error.message);
            record.location = null;
          }
        }
        if (record.metadata) {
          try {
            record.metadata = typeof record.metadata === 'string' 
              ? JSON.parse(record.metadata) 
              : record.metadata;
          } catch (error) {
            console.warn('Error parsing metadata JSON in getViolations:', error.message);
            record.metadata = null;
          }
        }
        return record;
      });

    } catch (error) {
      console.error('Error getting speed violations:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de velocidad por vehículo
   * @param {string} vehicleId - ID del vehículo
   * @param {object} options - Opciones de tiempo
   * @returns {Promise<object>} Estadísticas del vehículo
   */
  async getVehicleStats(vehicleId, options = {}) {
    try {
      let whereClause = 'WHERE vehicle_id = $1';
      let params = [vehicleId];

      if (options.startDate && options.endDate) {
        whereClause += ' AND timestamp >= $2 AND timestamp <= $3';
        params.push(options.startDate, options.endDate);
      }

      const query = `
        SELECT 
          vehicle_id,
          COUNT(*) as total_records,
          COUNT(CASE WHEN speed > speed_limit THEN 1 END) as violation_count,
          ROUND(AVG(speed), 2) as avg_speed,
          ROUND(MAX(speed), 2) as max_speed,
          ROUND(MIN(speed), 2) as min_speed,
          ROUND(AVG(speed_limit), 2) as avg_speed_limit,
          ROUND(
            (COUNT(CASE WHEN speed > speed_limit THEN 1 END) * 100.0 / COUNT(*)), 
            2
          ) as violation_rate
        FROM ${this.tableName} 
        ${whereClause}
        GROUP BY vehicle_id
      `;

      const result = await this.query(query, params);
      return result.rows[0] || null;

    } catch (error) {
      console.error('Error getting vehicle stats:', error);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas generales del sistema
   * @param {object} options - Opciones de tiempo
   * @returns {Promise<object>} Estadísticas generales
   */
  async getSystemStats(options = {}) {
    try {
      let whereClause = '';
      let params = [];

      if (options.startDate && options.endDate) {
        whereClause = 'WHERE timestamp >= $1 AND timestamp <= $2';
        params.push(options.startDate, options.endDate);
      }

      const query = `
        SELECT 
          COUNT(*) as total_records,
          COUNT(DISTINCT vehicle_id) as unique_vehicles,
          COUNT(CASE WHEN speed > speed_limit THEN 1 END) as total_violations,
          ROUND(AVG(speed), 2) as overall_avg_speed,
          ROUND(MAX(speed), 2) as overall_max_speed,
          ROUND(
            (COUNT(CASE WHEN speed > speed_limit THEN 1 END) * 100.0 / COUNT(*)), 
            2
          ) as overall_violation_rate
        FROM ${this.tableName} 
        ${whereClause}
      `;

      const result = await this.query(query, params);
      return result.rows[0];

    } catch (error) {
      console.error('Error getting system stats:', error);
      throw error;
    }
  }

  /**
   * Elimina registros antiguos
   * @param {number} daysOld - Días de antigüedad
   * @returns {Promise<number>} Número de registros eliminados
   */
  async cleanupOldRecords(daysOld = 30) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const query = `DELETE FROM ${this.tableName} WHERE created_at < $1`;
      const result = await this.query(query, [cutoffDate]);

      console.log(`Cleaned up ${result.rowCount} old speed records`);
      return result.rowCount;

    } catch (error) {
      console.error('Error cleaning up old records:', error);
      throw error;
    }
  }
}

module.exports = SpeedRecordRepository;
