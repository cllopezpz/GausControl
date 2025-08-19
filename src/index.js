const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const http = require('http');
const { Server } = require('socket.io');
require('dotenv').config();

// Importar servicios principales
const MqttSpeedProcessor = require('./services/mqttSpeedProcessor');
const SpeedRoutes = require('./routes/speedRoutes');
const AlertRoutes = require('./routes/alertRoutes');
const config = require('./config/config');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: config.getModule('websocket').cors
});

const PORT = config.get('server.port');

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos
app.use(express.static('public'));

// Variables globales
let mqttProcessor = null;

// Configurar WebSocket para notificaciones en tiempo real
io.on('connection', (socket) => {
  console.log(`🔌 Client connected: ${socket.id}`);
  
  socket.on('disconnect', () => {
    console.log(`🔌 Client disconnected: ${socket.id}`);
  });
});

// Rutas de API
app.use('/api/speed', new SpeedRoutes().getRouter());
app.use('/api/alerts', new AlertRoutes().getRouter());

// Rutas básicas
app.get('/', (req, res) => {
  res.json({
    message: 'GausControl - IoT Speed Monitoring System',
    version: '1.0.0',
    status: 'running',
    features: [
      'Real-time MQTT speed monitoring',
      'Automatic alert generation',
      'REST API for data queries',
      'WebSocket notifications'
    ]
  });
});

app.get('/health', (req, res) => {
  const status = mqttProcessor ? mqttProcessor.getStatus() : { isRunning: false };
  
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    mqttProcessor: status
  });
});

// Endpoint para controlar el procesador MQTT
app.post('/api/processor/start', async (req, res) => {
  try {
    if (!mqttProcessor) {
      mqttProcessor = new MqttSpeedProcessor();
    }
    
    await mqttProcessor.start();
    
    res.json({
      success: true,
      message: 'MQTT Speed Processor started successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start MQTT processor',
      details: error.message
    });
  }
});

app.post('/api/processor/stop', async (req, res) => {
  try {
    if (mqttProcessor) {
      await mqttProcessor.stop();
    }
    
    res.json({
      success: true,
      message: 'MQTT Speed Processor stopped successfully'
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop MQTT processor',
      details: error.message
    });
  }
});

app.get('/api/processor/status', (req, res) => {
  const status = mqttProcessor ? mqttProcessor.getStatus() : { isRunning: false };
  
  res.json({
    success: true,
    data: status
  });
});

// Manejo global de errores
app.use((error, req, res, next) => {
  console.error('Unhandled error:', error);
  
  res.status(500).json({
    success: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
    availableEndpoints: [
      'GET /',
      'GET /health',
      'POST /api/processor/start',
      'POST /api/processor/stop',
      'GET /api/processor/status',
      'GET /api/speed/*',
      'GET /api/alerts/*'
    ]
  });
});

// Función de inicialización
async function initializeSystem() {
  try {
    console.log('🚀 Initializing GausControl IoT System...');
    
    // Crear procesador MQTT
    mqttProcessor = new MqttSpeedProcessor();
    
    // Auto-iniciar el procesador si está configurado
    if (process.env.AUTO_START_PROCESSOR !== 'false') {
      console.log('📡 Auto-starting MQTT processor...');
      await mqttProcessor.start();
    }
    
    console.log('✅ System initialization complete');
    
  } catch (error) {
    console.error('❌ System initialization failed:', error);
    process.exit(1);
  }
}

// Manejo de señales del sistema
process.on('SIGINT', async () => {
  console.log('\n🛑 Received SIGINT, shutting down gracefully...');
  
  try {
    if (mqttProcessor) {
      await mqttProcessor.stop();
    }
    
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down gracefully...');
  
  try {
    if (mqttProcessor) {
      await mqttProcessor.stop();
    }
    
    server.close(() => {
      console.log('✅ Server closed');
      process.exit(0);
    });
    
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

// Iniciar servidor
server.listen(PORT, async () => {
  console.log(`🌐 Server running on port ${PORT}`);
  console.log(`📡 MQTT broker expected at localhost:1883`);
  console.log(`📊 WebSocket server ready for real-time notifications`);
  
  // Inicializar sistema
  await initializeSystem();
});

module.exports = app;