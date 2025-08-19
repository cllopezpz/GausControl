const express = require('express');
const crypto = require('crypto');
const { spawn } = require('child_process');
const path = require('path');

const app = express();
const PORT = process.env.WEBHOOK_PORT || 9000;
const SECRET = process.env.WEBHOOK_SECRET || 'gaus-control-webhook-secret';

// Middleware para parsing de JSON
app.use(express.json());

// Función para verificar la firma del webhook
function verifySignature(payload, signature) {
  if (!signature) return false;
  
  const expectedSignature = 'sha256=' + crypto
    .createHmac('sha256', SECRET)
    .update(payload, 'utf8')
    .digest('hex');
    
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

// Función para ejecutar el script de actualización
function executeUpdate() {
  return new Promise((resolve, reject) => {
    const isWindows = process.platform === 'win32';
    const scriptPath = isWindows ? 
      path.join(__dirname, 'auto-update.bat') : 
      path.join(__dirname, 'auto-update.sh');
    
    console.log(`🚀 Ejecutando script de actualización: ${scriptPath}`);
    
    const updateProcess = spawn(
      isWindows ? scriptPath : 'bash',
      isWindows ? [] : [scriptPath],
      {
        cwd: path.join(__dirname, '..'),
        stdio: ['inherit', 'pipe', 'pipe'],
        shell: isWindows
      }
    );
    
    let output = '';
    let error = '';
    
    updateProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      console.log(chunk);
    });
    
    updateProcess.stderr.on('data', (data) => {
      const chunk = data.toString();
      error += chunk;
      console.error(chunk);
    });
    
    updateProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Actualización completada exitosamente');
        resolve({ success: true, output, code });
      } else {
        console.error(`❌ Actualización falló con código: ${code}`);
        reject({ success: false, error, code });
      }
    });
    
    updateProcess.on('error', (err) => {
      console.error('❌ Error al ejecutar script:', err);
      reject({ success: false, error: err.message });
    });
  });
}

// Endpoint para recibir webhooks de GitHub
app.post('/webhook', async (req, res) => {
  try {
    const signature = req.headers['x-hub-signature-256'];
    const payload = JSON.stringify(req.body);
    
    // Verificar la firma del webhook (opcional)
    if (SECRET && SECRET !== 'gaus-control-webhook-secret') {
      if (!verifySignature(payload, signature)) {
        console.log('❌ Firma de webhook inválida');
        return res.status(401).json({ error: 'Firma inválida' });
      }
    }
    
    const event = req.headers['x-github-event'];
    const body = req.body;
    
    console.log(`📨 Webhook recibido: ${event}`);
    
    // Procesar solo eventos de push a la rama main
    if (event === 'push' && body.ref === 'refs/heads/main') {
      console.log('🔄 Push a main detectado, iniciando actualización...');
      console.log(`📝 Commit: ${body.head_commit?.message || 'N/A'}`);
      console.log(`👤 Autor: ${body.head_commit?.author?.name || 'N/A'}`);
      
      // Responder inmediatamente para no hacer esperar a GitHub
      res.status(200).json({ 
        message: 'Webhook recibido, iniciando actualización...',
        commit: body.head_commit?.id,
        timestamp: new Date().toISOString()
      });
      
      // Ejecutar actualización de forma asíncrona
      try {
        await executeUpdate();
        console.log('🎉 Actualización automática completada');
      } catch (error) {
        console.error('❌ Error en actualización automática:', error);
      }
      
    } else {
      console.log(`ℹ️ Evento ignorado: ${event} (rama: ${body.ref || 'N/A'})`);
      res.status(200).json({ 
        message: 'Evento recibido pero ignorado',
        event,
        ref: body.ref 
      });
    }
    
  } catch (error) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// Endpoint de health check
app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'GausControl Webhook Server',
    timestamp: new Date().toISOString(),
    port: PORT
  });
});

// Endpoint para actualización manual
app.post('/update', async (req, res) => {
  try {
    console.log('🔄 Actualización manual solicitada...');
    
    res.status(200).json({ 
      message: 'Actualización manual iniciada...',
      timestamp: new Date().toISOString()
    });
    
    await executeUpdate();
    console.log('🎉 Actualización manual completada');
    
  } catch (error) {
    console.error('❌ Error en actualización manual:', error);
  }
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log('🎯 Servidor de webhooks iniciado');
  console.log(`🌐 Puerto: ${PORT}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`🔍 Health check: http://localhost:${PORT}/health`);
  console.log(`🔄 Actualización manual: POST http://localhost:${PORT}/update`);
  console.log('');
  console.log('📝 Para configurar en GitHub:');
  console.log(`   1. Ve a tu repositorio > Settings > Webhooks`);
  console.log(`   2. Add webhook con URL: http://tu-servidor:${PORT}/webhook`);
  console.log('   3. Content type: application/json');
  console.log('   4. Eventos: Just the push event');
  console.log('');
  console.log('⚠️ Nota: Asegúrate de configurar WEBHOOK_SECRET en producción');
});

module.exports = app;
