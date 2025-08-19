#!/bin/bash

# Script de auto-actualización para GausControl
# Este script puede ser usado para actualizar automáticamente los contenedores

set -e

echo "🔄 Iniciando proceso de auto-actualización de GausControl..."

# Verificar que estamos en el directorio correcto
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Error: No se encontró docker-compose.yml. Asegúrate de estar en el directorio raíz del proyecto."
    exit 1
fi

# Verificar que Docker está funcionando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker no está funcionando. Por favor, inicia Docker Desktop."
    exit 1
fi

# Función para mostrar el progreso
show_progress() {
    local current=$1
    local total=$2
    local desc=$3
    echo "[$current/$total] $desc"
}

# 1. Obtener cambios del repositorio
show_progress 1 6 "📥 Obteniendo últimos cambios del repositorio..."
git fetch origin
git pull origin main

# 2. Detener contenedores actuales (pero mantener las bases de datos)
show_progress 2 6 "⏹️ Deteniendo aplicación actual..."
docker-compose stop app

# 3. Construir nueva imagen
show_progress 3 6 "🔨 Construyendo nueva imagen de Docker..."
docker-compose build app

# 4. Actualizar dependencias si es necesario
if [ -f "package.json" ]; then
    show_progress 4 6 "📦 Actualizando dependencias..."
    npm ci
fi

# 5. Iniciar contenedores actualizados
show_progress 5 6 "🚀 Iniciando aplicación actualizada..."
docker-compose up -d

# 6. Esperar y verificar que la aplicación está funcionando
show_progress 6 6 "🔍 Verificando que la aplicación está funcionando..."
echo "⏳ Esperando a que la aplicación esté lista..."

# Esperar hasta 60 segundos para que la aplicación responda
timeout 60 bash -c 'until curl -f http://localhost:3000/health > /dev/null 2>&1; do sleep 2; done' || {
    echo "❌ Error: La aplicación no responde después de 60 segundos"
    echo "📋 Logs de la aplicación:"
    docker-compose logs --tail=20 app
    exit 1
}

# Verificar endpoints principales
echo "🧪 Probando endpoints principales..."

# Test health endpoint
if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Health check: OK"
else
    echo "❌ Health check: FAIL"
    exit 1
fi

# Test main endpoint
if curl -f http://localhost:3000/ > /dev/null 2>&1; then
    echo "✅ Main endpoint: OK"
else
    echo "❌ Main endpoint: FAIL"
    exit 1
fi

# Test API endpoint
if curl -f http://localhost:3000/api > /dev/null 2>&1; then
    echo "✅ API endpoint: OK"
else
    echo "❌ API endpoint: FAIL"
    exit 1
fi

# Limpiar imágenes no utilizadas
echo "🧹 Limpiando imágenes antiguas..."
docker image prune -f

# Mostrar estado final
echo ""
echo "🎉 ¡Actualización completada exitosamente!"
echo ""
echo "📊 Estado de los contenedores:"
docker-compose ps

echo ""
echo "🌐 Aplicación disponible en:"
echo "  - Principal: http://localhost:3000"
echo "  - Health: http://localhost:3000/health"
echo "  - API: http://localhost:3000/api"

echo ""
echo "📝 Comandos útiles:"
echo "  - Ver logs: docker-compose logs -f app"
echo "  - Reiniciar: docker-compose restart app"
echo "  - Detener: docker-compose down"

echo ""
echo "✅ GausControl actualizado a la última versión del repositorio!"
