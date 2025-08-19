#!/bin/bash

# Script para iniciar el entorno de desarrollo completo
echo "🚀 Iniciando GausControl IoT Development Environment..."

# Función para verificar si un comando existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Verificar Docker
if ! command_exists docker; then
    echo "❌ Docker no está instalado. Por favor instala Docker Desktop."
    exit 1
fi

if ! command_exists docker-compose; then
    echo "❌ Docker Compose no está instalado."
    exit 1
fi

echo "✅ Docker verificado"

# Verificar si Docker está ejecutándose
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker no está ejecutándose. Por favor inicia Docker Desktop."
    exit 1
fi

echo "✅ Docker está ejecutándose"

# Limpiar contenedores anteriores si existen
echo "🧹 Limpiando contenedores anteriores..."
docker-compose down --remove-orphans

# Construir imágenes
echo "🔨 Construyendo imágenes Docker..."
docker-compose build --no-cache

# Iniciar servicios
echo "🚀 Iniciando servicios..."
docker-compose up -d

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."

# Función para esperar por un servicio
wait_for_service() {
    local service=$1
    local port=$2
    local timeout=60
    local count=0
    
    echo "⏳ Esperando por $service en puerto $port..."
    
    while ! nc -z localhost $port && [ $count -lt $timeout ]; do
        sleep 1
        count=$((count + 1))
        if [ $((count % 10)) -eq 0 ]; then
            echo "⏳ Todavía esperando por $service... (${count}s)"
        fi
    done
    
    if [ $count -ge $timeout ]; then
        echo "❌ Timeout esperando por $service"
        return 1
    else
        echo "✅ $service está listo"
        return 0
    fi
}

# Esperar por PostgreSQL
if command_exists nc; then
    wait_for_service "PostgreSQL" 5432
    wait_for_service "Redis" 6379
    wait_for_service "Mosquitto MQTT" 1883
    wait_for_service "Aplicación Node.js" 3000
else
    echo "⏳ Esperando 30 segundos para que los servicios se inicialicen..."
    sleep 30
fi

# Mostrar estado de los contenedores
echo ""
echo "📊 Estado de los contenedores:"
docker-compose ps

echo ""
echo "🎉 ¡Entorno de desarrollo iniciado exitosamente!"
echo ""
echo "📡 Servicios disponibles:"
echo "  🌐 Aplicación Web: http://localhost:3000"
echo "  🗄️  Base de datos PostgreSQL: localhost:5432"
echo "  🔄 Redis: localhost:6379"
echo "  📨 MQTT Broker: localhost:1883"
echo ""
echo "🧪 Para probar el sistema MQTT:"
echo "  npm run mqtt:test        # Enviar mensajes de prueba"
echo "  npm run mqtt:traffic     # Simular tráfico"
echo "  npm run mqtt:violations  # Generar violaciones consecutivas"
echo ""
echo "📋 Para ver logs en tiempo real:"
echo "  docker-compose logs -f app        # Logs de la aplicación"
echo "  docker-compose logs -f mosquitto  # Logs del broker MQTT"
echo "  docker-compose logs -f            # Todos los logs"
echo ""
echo "🛑 Para detener:"
echo "  docker-compose down"
echo ""

# Abrir navegador automáticamente si estamos en un entorno gráfico
if command_exists xdg-open; then
    echo "🌐 Abriendo navegador..."
    xdg-open http://localhost:3000
elif command_exists open; then
    echo "🌐 Abriendo navegador..."
    open http://localhost:3000
fi

echo "✅ Setup completo!"
