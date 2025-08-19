#!/usr/bin/env node

/**
 * Utilidad para publicar mensajes de prueba al tópico vehicles/speed
 * Simula vehículos enviando datos de velocidad
 */

const mqtt = require('mqtt');

class MqttPublisher {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.publishCount = 0;
  }

  /**
   * Conecta al broker MQTT
   */
  async connect() {
    try {
      console.log('Connecting to MQTT broker at localhost:1883...');
      
      this.client = mqtt.connect('mqtt://localhost:1883', {
        clientId: 'test-publisher-' + Date.now(),
        clean: true,
        connectTimeout: 5000,
        keepalive: 60
      });

      return new Promise((resolve, reject) => {
        this.client.on('connect', () => {
          this.isConnected = true;
          console.log('✅ Connected to MQTT broker successfully');
          resolve();
        });

        this.client.on('error', (error) => {
          console.error('❌ MQTT connection error:', error);
          reject(error);
        });

        this.client.on('offline', () => {
          this.isConnected = false;
          console.log('📴 MQTT client went offline');
        });
      });

    } catch (error) {
      console.error('Error connecting to MQTT:', error);
      throw error;
    }
  }

  /**
   * Publica un mensaje de velocidad
   */
  async publishSpeedMessage(vehicleId, speed, options = {}) {
    if (!this.isConnected) {
      throw new Error('MQTT client is not connected');
    }

    const message = {
      vehicleId,
      speed,
      timestamp: new Date().toISOString(),
      location: options.location || {
        latitude: -33.4489 + (Math.random() - 0.5) * 0.01,
        longitude: -70.6693 + (Math.random() - 0.5) * 0.01
      },
      vehicleType: options.vehicleType || 'car',
      metadata: options.metadata || {
        test: true,
        messageNumber: this.publishCount + 1
      }
    };

    return new Promise((resolve, reject) => {
      this.client.publish('vehicles/speed', JSON.stringify(message), { qos: 1 }, (error) => {
        if (error) {
          console.error(`❌ Error publishing message:`, error);
          reject(error);
          return;
        }

        this.publishCount++;
        console.log(`📤 [${this.publishCount}] Published: ${vehicleId} at ${speed} km/h`);
        resolve();
      });
    });
  }

  /**
   * Envía mensajes de prueba variados
   */
  async sendTestMessages() {
    console.log('\n🧪 Sending test messages...\n');

    // Mensaje normal (no violación)
    await this.publishSpeedMessage('VEH001', 45.5);
    await this.sleep(500);

    // Mensaje con violación simple
    await this.publishSpeedMessage('VEH002', 75.0);
    await this.sleep(500);

    // Mensaje malformado (para probar robustez)
    await this.publishRawMessage('vehicles/speed', '{"invalid": "json"');
    await this.sleep(500);

    // Serie de violaciones consecutivas para VEH003
    await this.publishSpeedMessage('VEH003', 65.0);
    await this.sleep(200);
    await this.publishSpeedMessage('VEH003', 67.5);
    await this.sleep(200);
    await this.publishSpeedMessage('VEH003', 70.0); // Esta debería generar alerta crítica
    await this.sleep(500);

    // Mensaje sin campos requeridos
    await this.publishRawMessage('vehicles/speed', JSON.stringify({
      vehicleId: 'VEH004'
      // Falta campo speed
    }));
    await this.sleep(500);

    // Velocidad muy alta (crítica)
    await this.publishSpeedMessage('VEH005', 95.0, {
      vehicleType: 'emergency'
    });

    console.log('\n✅ Test messages sent successfully\n');
  }

  /**
   * Simula tráfico continuo
   */
  async simulateTraffic(duration = 60000) {
    console.log(`\n🚗 Simulating traffic for ${duration/1000} seconds...\n`);

    const vehicles = ['VEH001', 'VEH002', 'VEH003', 'VEH004', 'VEH005'];
    const startTime = Date.now();

    while (Date.now() - startTime < duration) {
      const vehicleId = vehicles[Math.floor(Math.random() * vehicles.length)];
      
      // Velocidad normal la mayoría del tiempo, ocasionalmente alta
      let speed;
      if (Math.random() < 0.2) { // 20% probabilidad de violación
        speed = 60 + Math.random() * 30; // 60-90 km/h
      } else {
        speed = 30 + Math.random() * 25; // 30-55 km/h
      }

      await this.publishSpeedMessage(vehicleId, parseFloat(speed.toFixed(1)));
      await this.sleep(1000 + Math.random() * 2000); // 1-3 segundos entre mensajes
    }

    console.log('\n🏁 Traffic simulation completed\n');
  }

  /**
   * Publica mensaje raw (para testing de mensajes malformados)
   */
  async publishRawMessage(topic, message) {
    return new Promise((resolve, reject) => {
      this.client.publish(topic, message, { qos: 1 }, (error) => {
        if (error) {
          reject(error);
          return;
        }
        
        this.publishCount++;
        console.log(`📤 [${this.publishCount}] Published raw message to ${topic}`);
        resolve();
      });
    });
  }

  /**
   * Desconecta del broker
   */
  async disconnect() {
    if (this.client) {
      this.client.end();
      console.log('✅ Disconnected from MQTT broker');
    }
  }

  /**
   * Utilidad para pausa
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// CLI Interface
async function main() {
  const publisher = new MqttPublisher();

  try {
    await publisher.connect();

    const args = process.argv.slice(2);
    const command = args[0] || 'test';

    switch (command) {
      case 'test':
        await publisher.sendTestMessages();
        break;

      case 'traffic':
        const duration = parseInt(args[1]) || 60000;
        await publisher.simulateTraffic(duration);
        break;

      case 'single':
        const vehicleId = args[1] || 'VEH001';
        const speed = parseFloat(args[2]) || 50.0;
        await publisher.publishSpeedMessage(vehicleId, speed);
        break;

      case 'violations':
        // Enviar violaciones consecutivas
        for (let i = 1; i <= 5; i++) {
          await publisher.publishSpeedMessage('VEH999', 65 + i * 2);
          await publisher.sleep(500);
        }
        break;

      default:
        console.log('Available commands:');
        console.log('  test     - Send various test messages');
        console.log('  traffic  - Simulate continuous traffic (duration in ms)');
        console.log('  single   - Send single message (vehicleId, speed)');
        console.log('  violations - Send consecutive violations');
        break;
    }

  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  } finally {
    await publisher.disconnect();
  }
}

// Ejecutar si es llamado directamente
if (require.main === module) {
  main().catch(console.error);
}

module.exports = MqttPublisher;
