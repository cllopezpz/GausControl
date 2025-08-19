const express = require('express');
const AlertController = require('../controllers/alertController');

/**
 * Rutas para endpoints de alertas
 * Principio: Single Responsibility - Solo define rutas de alertas
 */
class AlertRoutes {
  constructor() {
    this.router = express.Router();
    this.alertController = new AlertController();
    this.initializeRoutes();
  }

  /**
   * Inicializa todas las rutas de alertas
   */
  initializeRoutes() {
    // Health check
    this.router.get('/health', this.alertController.health.bind(this.alertController));

    // Estadísticas
    this.router.get('/stats', this.alertController.getStats.bind(this.alertController));
    this.router.get('/by-vehicle', this.alertController.getAlertsByVehicle.bind(this.alertController));

    // Alertas especiales
    this.router.get('/active', this.alertController.getActiveAlerts.bind(this.alertController));
    this.router.get('/critical', this.alertController.getCriticalAlerts.bind(this.alertController));

    // Consultas de datos
    this.router.get('/vehicle/:vehicleId', this.alertController.getByVehicle.bind(this.alertController));
    this.router.get('/severity/:severity', this.alertController.getBySeverity.bind(this.alertController));
    this.router.get('/range', this.alertController.getByTimeRange.bind(this.alertController));

    // Actualización de estado
    this.router.put('/:alertId/status', this.alertController.updateStatus.bind(this.alertController));
  }

  /**
   * Obtiene el router configurado
   * @returns {express.Router} Router de Express
   */
  getRouter() {
    return this.router;
  }
}

module.exports = AlertRoutes;
