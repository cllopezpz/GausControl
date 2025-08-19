const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares de seguridad
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ruta básica de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'GausControl está funcionando correctamente',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Ruta principal
app.get('/', (req, res) => {
  res.json({
    message: 'Bienvenido a GausControl',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      api: '/api'
    }
  });
});

// Rutas de API
app.get('/api', (req, res) => {
  res.json({
    message: 'API de GausControl',
    version: '1.0.0',
    documentation: 'Documentación en desarrollo'
  });
});

// Manejo de errores 404
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Endpoint no encontrado',
    path: req.originalUrl
  });
});

// Manejo global de errores
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Error interno del servidor',
    message: process.env.NODE_ENV === 'development' ? err.message : 'Algo salió mal'
  });
});

// Iniciar el servidor
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 GausControl servidor iniciado en puerto ${PORT}`);
  console.log(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📱 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
