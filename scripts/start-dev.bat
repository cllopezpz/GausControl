@echo off
echo 🚀 Iniciando GausControl IoT Development Environment...

REM Verificar Docker
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker no está instalado. Por favor instala Docker Desktop.
    pause
    exit /b 1
)

where docker-compose >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker Compose no está instalado.
    pause
    exit /b 1
)

echo ✅ Docker verificado

REM Verificar si Docker está ejecutándose
docker info >nul 2>nul
if %errorlevel% neq 0 (
    echo ❌ Docker no está ejecutándose. Por favor inicia Docker Desktop.
    pause
    exit /b 1
)

echo ✅ Docker está ejecutándose

REM Limpiar contenedores anteriores
echo 🧹 Limpiando contenedores anteriores...
docker-compose down --remove-orphans

REM Construir imágenes
echo 🔨 Construyendo imágenes Docker...
docker-compose build --no-cache

REM Iniciar servicios
echo 🚀 Iniciando servicios...
docker-compose up -d

REM Esperar a que los servicios estén listos
echo ⏳ Esperando a que los servicios estén listos...
timeout /t 30 /nobreak

REM Mostrar estado
echo.
echo 📊 Estado de los contenedores:
docker-compose ps

echo.
echo 🎉 ¡Entorno de desarrollo iniciado exitosamente!
echo.
echo 📡 Servicios disponibles:
echo   🌐 Aplicación Web: http://localhost:3000
echo   🗄️  Base de datos PostgreSQL: localhost:5432
echo   🔄 Redis: localhost:6379
echo   📨 MQTT Broker: localhost:1883
echo.
echo 🧪 Para probar el sistema MQTT:
echo   npm run mqtt:test        # Enviar mensajes de prueba
echo   npm run mqtt:traffic     # Simular tráfico
echo   npm run mqtt:violations  # Generar violaciones consecutivas
echo.
echo 📋 Para ver logs en tiempo real:
echo   docker-compose logs -f app        # Logs de la aplicación
echo   docker-compose logs -f mosquitto  # Logs del broker MQTT
echo   docker-compose logs -f            # Todos los logs
echo.
echo 🛑 Para detener:
echo   docker-compose down
echo.

REM Abrir navegador
start http://localhost:3000

echo ✅ Setup completo!
pause
