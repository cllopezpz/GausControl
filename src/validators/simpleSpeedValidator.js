/**
 * Validador simple y directo para datos de velocidad
 * Sin dependencias de Joi - manejo manual más controlado
 */
class SimpleSpeedValidator {
  constructor() {
    this.validVehicleTypes = ['car', 'truck', 'bus', 'motorcycle', 'emergency', 'public', 'unknown'];
  }

  /**
   * Valida un mensaje de velocidad
   * @param {object} data - Datos a validar
   * @returns {object} Resultado de validación
   */
  validateSpeedData(data) {
    const errors = [];

    try {
      // Validar que sea un objeto
      if (!data || typeof data !== 'object') {
        return {
          isValid: false,
          errors: [{ field: 'root', message: 'Data must be an object', value: data }],
          data: null
        };
      }

      // Validar vehicleId (requerido)
      if (!data.vehicleId || typeof data.vehicleId !== 'string') {
        errors.push({
          field: 'vehicleId',
          message: 'vehicleId is required and must be a string',
          value: data.vehicleId
        });
      } else if (data.vehicleId.length < 3 || data.vehicleId.length > 20) {
        errors.push({
          field: 'vehicleId',
          message: 'vehicleId must be between 3 and 20 characters',
          value: data.vehicleId
        });
      } else if (!/^[A-Za-z0-9]+$/.test(data.vehicleId)) {
        errors.push({
          field: 'vehicleId',
          message: 'vehicleId must contain only alphanumeric characters',
          value: data.vehicleId
        });
      }

      // Validar speed (requerido)
      if (data.speed === undefined || data.speed === null) {
        errors.push({
          field: 'speed',
          message: 'speed is required',
          value: data.speed
        });
      } else if (typeof data.speed !== 'number' || isNaN(data.speed)) {
        errors.push({
          field: 'speed',
          message: 'speed must be a valid number',
          value: data.speed
        });
      } else if (data.speed < 0 || data.speed > 500) {
        errors.push({
          field: 'speed',
          message: 'speed must be between 0 and 500 km/h',
          value: data.speed
        });
      }

      // Validar timestamp (opcional)
      let normalizedTimestamp = data.timestamp;
      if (data.timestamp) {
        if (typeof data.timestamp === 'string') {
          const parsedDate = new Date(data.timestamp);
          if (isNaN(parsedDate.getTime())) {
            errors.push({
              field: 'timestamp',
              message: 'timestamp must be a valid date string',
              value: data.timestamp
            });
          } else {
            normalizedTimestamp = parsedDate.toISOString();
          }
        } else if (typeof data.timestamp === 'number') {
          normalizedTimestamp = new Date(data.timestamp).toISOString();
        } else if (!(data.timestamp instanceof Date)) {
          errors.push({
            field: 'timestamp',
            message: 'timestamp must be a date, string, or number',
            value: data.timestamp
          });
        }
      } else {
        normalizedTimestamp = new Date().toISOString();
      }

      // Validar location (opcional - puede ser null)
      let normalizedLocation = data.location;
      if (data.location !== undefined && data.location !== null) {
        if (typeof data.location !== 'object') {
          errors.push({
            field: 'location',
            message: 'location must be an object or null',
            value: data.location
          });
        } else {
          // Validar coordenadas
          const hasLat = data.location.lat !== undefined || data.location.latitude !== undefined;
          const hasLng = data.location.lng !== undefined || data.location.longitude !== undefined;
          
          if (hasLat || hasLng) {
            const lat = data.location.lat || data.location.latitude;
            const lng = data.location.lng || data.location.longitude;
            
            if (typeof lat !== 'number' || lat < -90 || lat > 90) {
              errors.push({
                field: 'location.latitude',
                message: 'latitude must be a number between -90 and 90',
                value: lat
              });
            }
            
            if (typeof lng !== 'number' || lng < -180 || lng > 180) {
              errors.push({
                field: 'location.longitude',
                message: 'longitude must be a number between -180 and 180',
                value: lng
              });
            }
            
            // Normalizar formato
            normalizedLocation = {
              lat: lat,
              lng: lng
            };
          }
        }
      }

      // Validar vehicleType (opcional)
      let normalizedVehicleType = data.vehicleType || 'unknown';
      if (data.vehicleType && !this.validVehicleTypes.includes(data.vehicleType)) {
        // No es error, simplemente usar 'unknown'
        normalizedVehicleType = 'unknown';
      }

      // Validar metadata (opcional - puede ser null)
      let normalizedMetadata = data.metadata;
      if (data.metadata !== undefined && data.metadata !== null) {
        if (typeof data.metadata !== 'object') {
          // No es error, simplemente ignorar
          normalizedMetadata = null;
        }
      }

      // Si hay errores críticos, retornar error
      if (errors.length > 0) {
        return {
          isValid: false,
          errors: errors,
          data: null
        };
      }

      // Construir datos normalizados
      const normalizedData = {
        vehicleId: data.vehicleId.trim(),
        speed: Number(data.speed),
        timestamp: normalizedTimestamp,
        location: normalizedLocation,
        vehicleType: normalizedVehicleType,
        metadata: normalizedMetadata,
        receivedAt: new Date()
      };

      return {
        isValid: true,
        errors: [],
        data: normalizedData
      };

    } catch (error) {
      console.error('Unexpected error during validation:', error);
      return {
        isValid: false,
        errors: [{ field: 'unknown', message: 'Unexpected validation error', value: data }],
        data: null
      };
    }
  }

  /**
   * Verifica si los datos representan una violación de velocidad
   * @param {object} data - Datos de velocidad validados
   * @param {number} speedLimit - Límite de velocidad
   * @returns {boolean} True si es una violación
   */
  isSpeedViolation(data, speedLimit) {
    if (!data || typeof data.speed !== 'number') {
      return false;
    }
    return data.speed > speedLimit;
  }

  /**
   * Obtiene estadísticas de validación
   * @returns {object} Estadísticas del validador
   */
  getValidationStats() {
    return {
      validatorType: 'SimpleSpeedValidator',
      version: '1.0.0',
      supportedFields: ['vehicleId', 'speed', 'timestamp', 'location', 'vehicleType', 'metadata'],
      validVehicleTypes: this.validVehicleTypes,
      speedRange: { min: 0, max: 500 }
    };
  }
}

module.exports = SimpleSpeedValidator;
