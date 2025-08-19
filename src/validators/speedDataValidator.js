const Joi = require('joi');

/**
 * Validador para datos de velocidad
 * Principio: Single Responsibility - Solo valida datos de velocidad
 * Principio: Dependency Inversion - Depende de abstracciones (Joi)
 */
class SpeedDataValidator {
  constructor() {
    // Schema para validar datos de velocidad de vehículos (más permisivo)
    this.speedDataSchema = Joi.object({
      vehicleId: Joi.string()
        .pattern(/^[A-Za-z0-9]+$/)
        .min(3)
        .max(20)
        .required()
        .description('Identificador único del vehículo'),

      speed: Joi.number()
        .min(0)
        .max(500) // Velocidad máxima realista
        .required()
        .description('Velocidad en km/h'),

      timestamp: Joi.alternatives()
        .try(
          Joi.date(),
          Joi.string().isoDate(),
          Joi.string(),
          Joi.number().min(0)
        )
        .default(() => new Date().toISOString())
        .description('Timestamp del registro'),

      location: Joi.alternatives()
        .try(
          Joi.object({
            lat: Joi.number().min(-90).max(90),
            lng: Joi.number().min(-180).max(180)
          }),
          Joi.object({
            latitude: Joi.number().min(-90).max(90),
            longitude: Joi.number().min(-180).max(180)
          }),
          Joi.null(),
          Joi.allow(null)
        )
        .allow(null)
        .optional()
        .description('Ubicación GPS opcional'),

      vehicleType: Joi.string()
        .valid('car', 'truck', 'bus', 'motorcycle', 'emergency', 'public', 'unknown')
        .default('unknown')
        .optional()
        .description('Tipo de vehículo'),

      metadata: Joi.alternatives()
        .try(
          Joi.object(),
          Joi.null(),
          Joi.allow(null)
        )
        .allow(null)
        .optional()
        .description('Metadata adicional')
    }).unknown(false);

    // Schema para validar lotes de datos
    this.batchSchema = Joi.array()
      .items(this.speedDataSchema)
      .min(1)
      .max(100) // Límite razonable para lotes
      .required();
  }

  /**
   * Valida un mensaje individual de velocidad
   * @param {object} data - Datos a validar
   * @returns {object} Resultado de validación
   */
  validateSpeedData(data) {
    try {
      const { error, value } = this.speedDataSchema.validate(data, {
        abortEarly: false,
        stripUnknown: true,
        convert: true,
        allowUnknown: false,
        presence: 'optional'
      });

      if (error) {
        const validationErrors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          value: detail.context?.value
        }));

        console.warn('Speed data validation failed:', validationErrors);

        return {
          isValid: false,
          errors: validationErrors,
          data: null
        };
      }

      // Normalizar timestamp
      const normalizedData = this.normalizeData(value);

      return {
        isValid: true,
        errors: [],
        data: normalizedData
      };

    } catch (err) {
      console.error('Unexpected error during speed data validation:', err);
      
      return {
        isValid: false,
        errors: [{
          field: 'unknown',
          message: 'Unexpected validation error',
          value: data
        }],
        data: null
      };
    }
  }

  /**
   * Valida un lote de mensajes de velocidad
   * @param {array} dataArray - Array de datos a validar
   * @returns {object} Resultado de validación del lote
   */
  validateBatch(dataArray) {
    try {
      const { error, value } = this.batchSchema.validate(dataArray, {
        abortEarly: false,
        stripUnknown: true,
        convert: true
      });

      if (error) {
        console.warn('Batch validation failed:', error.message);

        return {
          isValid: false,
          errors: error.details,
          validItems: [],
          invalidItems: dataArray
        };
      }

      // Validar cada item individualmente
      const results = value.map((item, index) => ({
        index,
        ...this.validateSpeedData(item)
      }));

      const validItems = results
        .filter(result => result.isValid)
        .map(result => result.data);

      const invalidItems = results
        .filter(result => !result.isValid)
        .map(result => ({
          index: result.index,
          errors: result.errors,
          originalData: dataArray[result.index]
        }));

      return {
        isValid: invalidItems.length === 0,
        errors: invalidItems,
        validItems,
        invalidItems: invalidItems.map(item => item.originalData),
        stats: {
          total: dataArray.length,
          valid: validItems.length,
          invalid: invalidItems.length
        }
      };

    } catch (err) {
      console.error('Unexpected error during batch validation:', err);
      
      return {
        isValid: false,
        errors: [{ message: 'Unexpected batch validation error' }],
        validItems: [],
        invalidItems: dataArray
      };
    }
  }

  /**
   * Normaliza los datos después de la validación
   * @param {object} data - Datos validados
   * @returns {object} Datos normalizados
   */
  normalizeData(data) {
    // Normalizar timestamp a objeto Date
    let normalizedTimestamp;
    if (typeof data.timestamp === 'string') {
      normalizedTimestamp = new Date(data.timestamp);
    } else if (typeof data.timestamp === 'number') {
      normalizedTimestamp = new Date(data.timestamp);
    } else {
      normalizedTimestamp = data.timestamp;
    }

    return {
      ...data,
      timestamp: normalizedTimestamp,
      receivedAt: new Date(), // Timestamp de recepción
      speed: parseFloat(data.speed.toFixed(2)) // Redondear a 2 decimales
    };
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
      schemaVersion: '1.0.0',
      supportedFields: Object.keys(this.speedDataSchema.describe().keys),
      maxBatchSize: 100,
      speedRange: { min: 0, max: 300 }
    };
  }
}

module.exports = SpeedDataValidator;
