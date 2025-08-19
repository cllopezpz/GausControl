const request = require('supertest');
const app = require('../src/index');

describe('GausControl API Tests', () => {
  
  describe('GET /', () => {
    it('should return welcome message', async () => {
      const response = await request(app)
        .get('/')
        .expect(200);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Bienvenido a GausControl');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('GET /health', () => {
    it('should return health status', async () => {
      const response = await request(app)
        .get('/health')
        .expect(200);
      
      expect(response.body).toHaveProperty('status');
      expect(response.body.status).toBe('OK');
      expect(response.body).toHaveProperty('timestamp');
    });
  });

  describe('GET /api', () => {
    it('should return API information', async () => {
      const response = await request(app)
        .get('/api')
        .expect(200);
      
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('API de GausControl');
      expect(response.body).toHaveProperty('version');
    });
  });

  describe('GET /nonexistent', () => {
    it('should return 404 for non-existent routes', async () => {
      const response = await request(app)
        .get('/nonexistent')
        .expect(404);
      
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Endpoint no encontrado');
    });
  });

});
