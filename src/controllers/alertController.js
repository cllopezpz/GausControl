const AlertRepository = require('../repositories/alertRepository');

/**
 * Controlador para endpoints de alertas
 * Principio: Single Responsibility - Solo maneja requests de alertas
 * Principio: Dependency Inversion - Depende de abstracciones
 */
class AlertController {
  constructor() {
    this.alertRepository = new AlertRepository();
  }

  /**
   * Obtiene alertas por vehículo
   * GET /api/alerts/vehicle/:vehicleId
   */
  async getByVehicle(req, res) {
    try {
      const { vehicleId } = req.params;
      const { 
        status, 
        severity, 
        limit = 100, 
        offset = 0, 
        orderBy = 'created_at DESC' 
      } = req.query;

      if (!vehicleId) {
        return res.status(400).json({
          success: false,
          error: 'Vehicle ID is required'
        });
      }

      const options = {
        status,
        severity,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy
      };

      const alerts = await this.alertRepository.getByVehicleId(vehicleId, options);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        vehicleId,
        filters: {
          status: status || 'all',
          severity: severity || 'all'
        },
        pagination: {
          limit: options.limit,
          offset: options.offset
        }
      });

    } catch (error) {
      console.error('Error getting alerts by vehicle:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene alertas por severidad
   * GET /api/alerts/severity/:severity
   */
  async getBySeverity(req, res) {
    try {
      const { severity } = req.params;
      const { 
        status, 
        limit = 100, 
        offset = 0, 
        orderBy = 'created_at DESC' 
      } = req.query;

      const validSeverities = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'];
      
      if (!validSeverities.includes(severity.toUpperCase())) {
        return res.status(400).json({
          success: false,
          error: 'Invalid severity level',
          validValues: validSeverities
        });
      }

      const options = {
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy
      };

      const alerts = await this.alertRepository.getBySeverity(severity.toUpperCase(), options);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        severity: severity.toUpperCase(),
        filters: {
          status: status || 'all'
        },
        pagination: {
          limit: options.limit,
          offset: options.offset
        }
      });

    } catch (error) {
      console.error('Error getting alerts by severity:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene alertas en un rango de tiempo
   * GET /api/alerts/range
   */
  async getByTimeRange(req, res) {
    try {
      const { 
        startDate, 
        endDate, 
        vehicleId, 
        severity, 
        status,
        limit = 1000, 
        offset = 0 
      } = req.query;

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
        severity,
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy: 'created_at DESC'
      };

      const alerts = await this.alertRepository.getByTimeRange(start, end, options);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        timeRange: {
          startDate: start.toISOString(),
          endDate: end.toISOString()
        },
        filters: {
          vehicleId: vehicleId || 'all',
          severity: severity || 'all',
          status: status || 'all'
        },
        pagination: {
          limit: options.limit,
          offset: options.offset
        }
      });

    } catch (error) {
      console.error('Error getting alerts by time range:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene alertas activas
   * GET /api/alerts/active
   */
  async getActiveAlerts(req, res) {
    try {
      const { 
        severity, 
        vehicleId,
        limit = 100, 
        offset = 0 
      } = req.query;

      const options = {
        severity,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy: 'created_at DESC'
      };

      let alerts;
      if (vehicleId) {
        alerts = await this.alertRepository.getByVehicleId(vehicleId, {
          ...options,
          status: 'ACTIVE'
        });
      } else {
        alerts = await this.alertRepository.getActiveAlerts(options);
      }

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        status: 'ACTIVE',
        filters: {
          severity: severity || 'all',
          vehicleId: vehicleId || 'all'
        }
      });

    } catch (error) {
      console.error('Error getting active alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene alertas críticas
   * GET /api/alerts/critical
   */
  async getCriticalAlerts(req, res) {
    try {
      const { 
        status = 'ACTIVE', 
        limit = 50, 
        offset = 0 
      } = req.query;

      const options = {
        status,
        limit: parseInt(limit),
        offset: parseInt(offset),
        orderBy: 'created_at DESC'
      };

      const alerts = await this.alertRepository.getCriticalAlerts(options);

      res.json({
        success: true,
        data: alerts,
        count: alerts.length,
        severity: 'CRITICAL',
        filters: {
          status: status || 'all'
        }
      });

    } catch (error) {
      console.error('Error getting critical alerts:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Actualiza el estado de una alerta
   * PUT /api/alerts/:alertId/status
   */
  async updateStatus(req, res) {
    try {
      const { alertId } = req.params;
      const { status, notes } = req.body;

      if (!alertId) {
        return res.status(400).json({
          success: false,
          error: 'Alert ID is required'
        });
      }

      const validStatuses = ['ACTIVE', 'RESOLVED', 'DISMISSED'];
      
      if (!status || !validStatuses.includes(status)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid status',
          validValues: validStatuses
        });
      }

      const additionalData = {};
      if (notes) {
        additionalData.resolution_notes = notes;
      }

      const updatedAlert = await this.alertRepository.updateStatus(
        alertId, 
        status, 
        additionalData
      );

      if (!updatedAlert) {
        return res.status(404).json({
          success: false,
          error: 'Alert not found'
        });
      }

      res.json({
        success: true,
        data: updatedAlert,
        message: `Alert status updated to ${status}`
      });

    } catch (error) {
      console.error('Error updating alert status:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene estadísticas de alertas
   * GET /api/alerts/stats
   */
  async getStats(req, res) {
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

      const stats = await this.alertRepository.getAlertStats(options);

      res.json({
        success: true,
        data: stats,
        timeRange: {
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting alert stats:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Obtiene alertas agrupadas por vehículo
   * GET /api/alerts/by-vehicle
   */
  async getAlertsByVehicle(req, res) {
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

      const alertsByVehicle = await this.alertRepository.getAlertsByVehicle(options);

      res.json({
        success: true,
        data: alertsByVehicle,
        count: alertsByVehicle.length,
        timeRange: {
          startDate: options.startDate?.toISOString(),
          endDate: options.endDate?.toISOString()
        }
      });

    } catch (error) {
      console.error('Error getting alerts by vehicle:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        message: error.message
      });
    }
  }

  /**
   * Health check específico para el módulo de alertas
   * GET /api/alerts/health
   */
  async health(req, res) {
    try {
      const dbStats = this.alertRepository.getConnectionStats();

      res.json({
        success: true,
        service: 'alert-service',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: dbStats
      });

    } catch (error) {
      console.error('Error in alert service health check:', error);
      res.status(500).json({
        success: false,
        service: 'alert-service',
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  }
}

module.exports = AlertController;
