#!/usr/bin/env node

/**
 * Script para probar el sistema MQTT con mensajes válidos
 * Genera mensajes con formato correcto para validar que el sistema funciona
 */

const mqtt = require('mqtt');
const config = require('../src/config/config');

async function sendValidMessages() {
    console.log('🧪 Testing MQTT with VALID messages...\n');
    
    // Conectar al broker MQTT
    const mqttHost = config.get('mqtt.host') || 'localhost';
    const mqttPort = config.get('mqtt.port') || 1883;
    const brokerUrl = `mqtt://${mqttHost}:${mqttPort}`;
    
    console.log(`🔗 Connecting to MQTT broker: ${brokerUrl}`);
    const client = mqtt.connect(brokerUrl);
    
    return new Promise((resolve, reject) => {
        client.on('connect', () => {
            console.log('✅ Connected to MQTT broker');
            
            const topic = config.get('mqtt.topics.vehicleSpeed') || 'vehicles/speed';
            console.log(`📡 Publishing to topic: ${topic}\n`);
            
            // Mensajes válidos de prueba
            const validMessages = [
                {
                    vehicleId: 'VEH001',
                    speed: 45.5,
                    timestamp: new Date().toISOString(),
                    location: { lat: -33.4569, lng: -70.6483 },
                    vehicleType: 'car',
                    metadata: { route: 'Route1', driver: 'Driver001' }
                },
                {
                    vehicleId: 'VEH002', 
                    speed: 75.2,
                    timestamp: new Date().toISOString(),
                    location: { lat: -33.4570, lng: -70.6485 },
                    vehicleType: 'truck'
                },
                {
                    vehicleId: 'VEH003',
                    speed: 62.0,
                    timestamp: new Date().toISOString()
                },
                {
                    vehicleId: 'VEH003',
                    speed: 65.5,
                    timestamp: new Date().toISOString()
                },
                {
                    vehicleId: 'VEH003',
                    speed: 68.0,
                    timestamp: new Date().toISOString()
                },
                {
                    vehicleId: 'VEH004',
                    speed: 35.0,
                    timestamp: new Date().toISOString(),
                    vehicleType: 'motorcycle'
                },
                {
                    vehicleId: 'VEH005',
                    speed: 95.5,
                    timestamp: new Date().toISOString(),
                    location: { lat: -33.4575, lng: -70.6490 }
                }
            ];
            
            let messageIndex = 0;
            
            const sendNextMessage = () => {
                if (messageIndex >= validMessages.length) {
                    console.log('\n✅ All valid messages sent successfully!');
                    client.end();
                    resolve();
                    return;
                }
                
                const message = validMessages[messageIndex];
                const messageStr = JSON.stringify(message);
                
                console.log(`📤 Sending message ${messageIndex + 1}/${validMessages.length}:`);
                console.log(`   Vehicle: ${message.vehicleId}, Speed: ${message.speed} km/h`);
                
                if (message.speed > 60) {
                    console.log(`   🚨 Expected VIOLATION alert (speed > 60)`);
                    if (message.vehicleId === 'VEH003' && messageIndex >= 4) {
                        console.log(`   🚨🚨 Expected CRITICAL alert (3+ consecutive violations)`);
                    }
                }
                
                client.publish(topic, messageStr, { qos: 1 }, (err) => {
                    if (err) {
                        console.error(`❌ Error sending message ${messageIndex + 1}:`, err);
                        reject(err);
                        return;
                    }
                    
                    console.log(`   ✅ Message sent successfully\n`);
                    messageIndex++;
                    
                    // Pausa entre mensajes para simular flujo real
                    setTimeout(sendNextMessage, 1000);
                });
            };
            
            // Iniciar envío de mensajes
            sendNextMessage();
        });
        
        client.on('error', (error) => {
            console.error('❌ MQTT connection error:', error);
            reject(error);
        });
    });
}

async function main() {
    try {
        await sendValidMessages();
        console.log('\n🎉 Test completed successfully!');
        console.log('💡 Check the application logs for processing results:');
        console.log('   docker-compose logs -f app');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ Test failed:', error);
        process.exit(1);
    }
}

// Ejecutar solo si es llamado directamente
if (require.main === module) {
    main();
}

module.exports = { sendValidMessages };
