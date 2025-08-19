const SpeedRecordRepository = require('../repositories/speedRecordRepository');
const SpeedDataValidator = require('../validators/speedDataValidator');

/**
 * Controlador para endpoints de velocidad
 * Principio: Single Responsibility - Solo maneja requests de velocidad
 * Principio: Dependency Inversion - Depende de abstracciones
 */
class SpeedController {
  constructor() {
    this.speedRepository = new SpeedRecordRepository();
    this.validator = new SpeedDataValidator();
  }

  /**
   * Obtiene registros de velocidad por vehículo
   * GET /api/speed/vehicle/:vehicleId
   */
  async getByVehicle(req, res) {
    try {
      const { vehicleId } = req.params;
      const { limit = 100, offset = 0, orderBy = 'timestamp DESC' } = req.query;

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          error: 'Vehicle ID is required'
        });
      }

      const options = {
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy
      };

      const records = await this.speedRepository.getByVehicleId(vehicleId, options);

      res.json({
        success: true,
        data: records,
        count: records.length,
        vehicleId,
        pagination: {
          limit: options.limit,
          offset: options.offset
        }
      });

    } catch (error) {
      console.error('Error getting speed records by vehicle:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene registros en un rango de tiempo
   * GET /api/speed/range
   */
  async getByTimeRange(req, res) {
    try {
      const { startDate, endDate, vehicleId, limit = 1000, offset = 0 } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid date format'
        });
      }

      const options = {
        vehicleId,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy: 'timestamp DESC'
      };

      const records = await this.speedRepository.getByTimeRange(start, end, options);

      res.json({
        success: true,
        data: records,
        count: records.length,
        timeRange: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        pagination: {
          limit: options.limit,
          offset: options.offset
        }
      });

    } catch (error) {
      console.error('Error getting speed records by time range:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene violaciones de velocidad
   * GET /api/speed/violations
   */
  async getViolations(req, res) {
    try {
      const { vehicleId, startDate, endDate, limit = 100 } = req.query;

      const options = {
        vehicleId,
        limit: parseInt(limit),
        orderBy: 'timestamp DESC'
      };

      if (startDate && endDate) {
        options.startDate = new Date(startDate);
        options.endDate = new Date(endDate);

        if (isNaN(options.startDate.getTime()) || isNaN(options.endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid date format'
          });
        }
      }

      const violations = await this.speedRepository.getViolations(options);

      res.json({
        success: true,
        data: violations,
        count: violations.length,
        filters: {
          vehicleId: vehicleId || 'all',
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting speed violations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene estadísticas de un vehículo
   * GET /api/speed/stats/vehicle/:vehicleId
   */
  async getVehicleStats(req, res) {
    try {
      const { vehicleId } = req.params;
      const { startDate, endDate } = req.query;

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          error: 'Vehicle ID is required'
        });
      }

      const options = {};

      if (startDate && endDate) {
        options.startDate = new Date(startDate);
        options.endDate = new Date(endDate);

        if (isNaN(options.startDate.getTime()) || isNaN(options.endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid date format'
          });
        }
      }

      const stats = await this.speedRepository.getVehicleStats(vehicleId, options);

      if (!stats) {
        return res.status(404).json({
          success: false,
          error: 'No records found for this vehicle'
        });
      }

      res.json({
        success: true,
        data: stats,
        vehicleId,
        timeRange: {
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting vehicle stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene estadísticas generales del sistema
   * GET /api/speed/stats/system
   */
  async getSystemStats(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const options = {};

      if (startDate && endDate) {
        options.startDate = new Date(startDate);
        options.endDate = new Date(endDate);

        if (isNaN(options.startDate.getTime()) || isNaN(options.endDate.getTime())) {
          return res.status(400).json({
            success: false,
            error: 'Invalid date format'
          });
        }
      }

      const stats = await this.speedRepository.getSystemStats(options);

      res.json({
        success: true,
        data: stats,
        timeRange: {
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting system stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Endpoint para crear un registro de velocidad manualmente (para testing)
   * POST /api/speed/record
   */
  async createRecord(req, res) {
    try {
      const speedData = req.body;

      // Validar datos
      const validationResult = this.validator.validateSpeedData(speedData);

      if (!validationResult.isValid) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationResult.errors
        });
      }

      // Guardar en base de datos
      const savedRecord = await this.speedRepository.saveSpeedRecord(validationResult.data);

      res.status(201).json({
        success: true,
        data: savedRecord,
        message: 'Speed record created successfully'
      });

    } catch (error) {
      console.error('Error creating speed record:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Health check específico para el módulo de velocidad
   * GET /api/speed/health
   */
  async health(req, res) {
    try {
      const dbStats = this.speedRepository.getConnectionStats();
      const validatorStats = this.validator.getValidationStats();

      res.json({
        success: true,
        service: 'speed-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbStats,
        validator: validatorStats
      });

    } catch (error) {
      console.error('Error in speed service health check:', error);
      res.status(500).json({
        success: false,
        service: 'speed-service',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
}

module.exports = SpeedController;
