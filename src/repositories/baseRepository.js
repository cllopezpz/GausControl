const { Pool } = require('pg');
const config = require('../config/config');

/**
 * Repositorio base siguiendo principios SOLID
 * Principio: Single Responsibility - Solo maneja acceso a datos
 * Principio: Open/Closed - Base para extender otros repositorios
 */
class BaseRepository {
  constructor() {
    this.pool = null;
    this.initialized = false;
  }

  /**
   * Inicializa la conexión a la base de datos
   * @returns {Promise<void>}
   */
  async initialize() {
    if (this.initialized) {
      return;
    }

    try {
      const dbConfig = config.getModule('database');
      
      this.pool = new Pool({
        host: dbConfig.host,
        port: dbConfig.port,
        database: dbConfig.database,
        user: dbConfig.username,
        password: dbConfig.password,
        min: dbConfig.pool.min,
        max: dbConfig.pool.max,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 10000,
      });

      // Probar conexión
      const client = await this.pool.connect();
      await client.query('SELECT NOW()');
      client.release();

      this.initialized = true;
      console.log('Database connection initialized successfully');

    } catch (error) {
      console.error('Error initializing database connection:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una consulta SQL
   * @param {string} text - Query SQL
   * @param {array} params - Parámetros de la consulta
   * @returns {Promise<object>} Resultado de la consulta
   */
  async query(text, params = []) {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const start = Date.now();
      const result = await this.pool.query(text, params);
      const duration = Date.now() - start;

      // Solo mostrar queries lentas en desarrollo
      if (duration > 1000 && config.get('server.env') === 'development') {
        console.warn(`Slow query detected (${duration}ms):`, text.substring(0, 100));
      }

      return result;

    } catch (error) {
      console.error('Database query error:', {
        query: text.substring(0, 200),
        params,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Ejecuta una transacción
   * @param {function} callback - Función que ejecuta las queries
   * @returns {Promise<any>} Resultado de la transacción
   */
  async transaction(callback) {
    if (!this.initialized) {
      await this.initialize();
    }

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;

    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Transaction error:', error);
      throw error;

    } finally {
      client.release();
    }
  }

  /**
   * Encuentra un registro por ID
   * @param {string} tableName - Nombre de la tabla
   * @param {string} id - ID del registro
   * @param {string} idColumn - Nombre de la columna ID (por defecto 'id')
   * @returns {Promise<object|null>} Registro encontrado o null
   */
  async findById(tableName, id, idColumn = 'id') {
    const query = `SELECT * FROM ${tableName} WHERE ${idColumn} = $1`;
    const result = await this.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Encuentra registros con condiciones
   * @param {string} tableName - Nombre de la tabla
   * @param {object} conditions - Condiciones de búsqueda
   * @param {object} options - Opciones adicionales (limit, offset, orderBy)
   * @returns {Promise<array>} Array de registros
   */
  async findWhere(tableName, conditions = {}, options = {}) {
    const whereClause = this.buildWhereClause(conditions);
    const orderClause = options.orderBy ? `ORDER BY ${options.orderBy}` : '';
    const limitClause = options.limit ? `LIMIT ${options.limit}` : '';
    const offsetClause = options.offset ? `OFFSET ${options.offset}` : '';

    const query = `
      SELECT * FROM ${tableName} 
      ${whereClause.clause} 
      ${orderClause} 
      ${limitClause} 
      ${offsetClause}
    `.trim();

    const result = await this.query(query, whereClause.params);
    return result.rows;
  }

  /**
   * Cuenta registros con condiciones
   * @param {string} tableName - Nombre de la tabla
   * @param {object} conditions - Condiciones de búsqueda
   * @returns {Promise<number>} Número de registros
   */
  async count(tableName, conditions = {}) {
    const whereClause = this.buildWhereClause(conditions);
    const query = `SELECT COUNT(*) as count FROM ${tableName} ${whereClause.clause}`;
    
    const result = await this.query(query, whereClause.params);
    return parseInt(result.rows[0].count, 10);
  }

  /**
   * Inserta un nuevo registro
   * @param {string} tableName - Nombre de la tabla
   * @param {object} data - Datos a insertar
   * @returns {Promise<object>} Registro insertado
   */
  async insert(tableName, data) {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const placeholders = values.map((_, index) => `$${index + 1}`);

    const query = `
      INSERT INTO ${tableName} (${columns.join(', ')}) 
      VALUES (${placeholders.join(', ')}) 
      RETURNING *
    `;

    const result = await this.query(query, values);
    return result.rows[0];
  }

  /**
   * Actualiza un registro
   * @param {string} tableName - Nombre de la tabla
   * @param {string} id - ID del registro
   * @param {object} data - Datos a actualizar
   * @param {string} idColumn - Nombre de la columna ID
   * @returns {Promise<object|null>} Registro actualizado o null
   */
  async update(tableName, id, data, idColumn = 'id') {
    const columns = Object.keys(data);
    const values = Object.values(data);
    const setClause = columns.map((col, index) => `${col} = $${index + 1}`);

    const query = `
      UPDATE ${tableName} 
      SET ${setClause.join(', ')} 
      WHERE ${idColumn} = $${values.length + 1} 
      RETURNING *
    `;

    const result = await this.query(query, [...values, id]);
    return result.rows[0] || null;
  }

  /**
   * Elimina un registro
   * @param {string} tableName - Nombre de la tabla
   * @param {string} id - ID del registro
   * @param {string} idColumn - Nombre de la columna ID
   * @returns {Promise<boolean>} True si se eliminó correctamente
   */
  async delete(tableName, id, idColumn = 'id') {
    const query = `DELETE FROM ${tableName} WHERE ${idColumn} = $1`;
    const result = await this.query(query, [id]);
    return result.rowCount > 0;
  }

  /**
   * Construye una cláusula WHERE
   * @param {object} conditions - Condiciones
   * @returns {object} Cláusula WHERE y parámetros
   */
  buildWhereClause(conditions) {
    const keys = Object.keys(conditions);
    
    if (keys.length === 0) {
      return { clause: '', params: [] };
    }

    const clauses = keys.map((key, index) => `${key} = $${index + 1}`);
    const params = Object.values(conditions);

    return {
      clause: `WHERE ${clauses.join(' AND ')}`,
      params
    };
  }

  /**
   * Obtiene estadísticas de la conexión
   * @returns {object} Estadísticas de la pool de conexiones
   */
  getConnectionStats() {
    if (!this.pool) {
      return { connected: false };
    }

    return {
      connected: true,
      totalCount: this.pool.totalCount,
      idleCount: this.pool.idleCount,
      waitingCount: this.pool.waitingCount
    };
  }

  /**
   * Cierra todas las conexiones
   * @returns {Promise<void>}
   */
  async close() {
    if (this.pool) {
      await this.pool.end();
      this.initialized = false;
      console.log('Database connections closed');
    }
  }
}

module.exports = BaseRepository;
