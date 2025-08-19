const express = require('express');
const SpeedController = require('../controllers/speedController');

/**
 * Rutas para endpoints de velocidad
 * Principio: Single Responsibility - Solo define rutas de velocidad
 */
class SpeedRoutes {
  constructor() {
    this.router = express.Router();
    this.speedController = new SpeedController();
    this.initializeRoutes();
  }

  /**
   * Inicializa todas las rutas de velocidad
   */
  initializeRoutes() {
    // Health check
    this.router.get('/health', this.speedController.health.bind(this.speedController));

    // Estadísticas
    this.router.get('/stats/system', this.speedController.getSystemStats.bind(this.speedController));
    this.router.get('/stats/vehicle/:vehicleId', this.speedController.getVehicleStats.bind(this.speedController));

    // Consultas de datos
    this.router.get('/vehicle/:vehicleId', this.speedController.getByVehicle.bind(this.speedController));
    this.router.get('/range', this.speedController.getByTimeRange.bind(this.speedController));
    this.router.get('/violations', this.speedController.getViolations.bind(this.speedController));

    // Creación de registros (para testing)
    this.router.post('/record', this.speedController.createRecord.bind(this.speedController));
  }

  /**
   * Obtiene el router configurado
   * @returns {express.Router} Router de Express
   */
  getRouter() {
    return this.router;
  }
}

module.exports = SpeedRoutes;
