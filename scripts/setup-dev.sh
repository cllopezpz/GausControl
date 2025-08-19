#!/bin/bash

# Script de configuración para desarrollo con Docker Desktop y GitHub Desktop
echo "🚀 Configurando entorno de desarrollo para GausControl..."

# Verificar que Docker Desktop está funcionando
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker Desktop no está funcionando. Por favor, inicia Docker Desktop."
    exit 1
fi

echo "✅ Docker Desktop detectado"

# Verificar que Docker Compose está disponible
if ! docker-compose --version > /dev/null 2>&1; then
    echo "❌ Error: Docker Compose no está disponible."
    exit 1
fi

echo "✅ Docker Compose detectado"

# Crear archivo .env si no existe
if [ ! -f .env ]; then
    echo "📝 Creando archivo .env desde env.example..."
    cp env.example .env
    echo "⚠️  Importante: Revisa y actualiza las variables en .env según tus necesidades"
fi

# Crear directorios necesarios
echo "📁 Creando directorios necesarios..."
mkdir -p logs
mkdir -p database/init
mkdir -p nginx
mkdir -p src/config
mkdir -p src/controllers
mkdir -p src/models
mkdir -p src/routes
mkdir -p src/middlewares
mkdir -p tests

# Instalar dependencias
echo "📦 Instalando dependencias de Node.js..."
npm install

# Construir imágenes de Docker
echo "🐳 Construyendo imágenes de Docker..."
docker-compose build

# Iniciar servicios
echo "🚀 Iniciando servicios de desarrollo..."
docker-compose up -d

# Esperar a que los servicios estén listos
echo "⏳ Esperando a que los servicios estén listos..."
sleep 15

# Verificar que los servicios están funcionando
echo "🔍 Verificando servicios..."

if curl -f http://localhost:3000/health > /dev/null 2>&1; then
    echo "✅ Aplicación funcionando en http://localhost:3000"
else
    echo "❌ La aplicación no responde en el puerto 3000"
fi

if docker-compose ps | grep -q "postgres.*Up"; then
    echo "✅ Base de datos PostgreSQL funcionando"
else
    echo "❌ Base de datos PostgreSQL no está funcionando"
fi

if docker-compose ps | grep -q "redis.*Up"; then
    echo "✅ Redis funcionando"
else
    echo "❌ Redis no está funcionando"
fi

echo ""
echo "🎉 ¡Configuración completada!"
echo ""
echo "📝 Próximos pasos:"
echo "1. Abre GitHub Desktop y clona/conecta este repositorio"
echo "2. Revisa el archivo .env y ajusta las configuraciones"
echo "3. Accede a tu aplicación en: http://localhost:3000"
echo "4. Para detener los servicios: npm run docker:down"
echo "5. Para ver los logs: npm run docker:logs"
echo ""
echo "🐳 Comandos útiles de Docker:"
echo "  npm run docker:up    - Iniciar servicios"
echo "  npm run docker:down  - Detener servicios"
echo "  npm run docker:logs  - Ver logs"
echo "  npm run docker:restart - Reiniciar servicios"
