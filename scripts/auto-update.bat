@echo off
REM Script de auto-actualización para GausControl en Windows
REM Este script puede ser usado para actualizar automáticamente los contenedores

echo 🔄 Iniciando proceso de auto-actualización de GausControl...

REM Verificar que estamos en el directorio correcto
if not exist "docker-compose.yml" (
    echo ❌ Error: No se encontró docker-compose.yml. Asegúrate de estar en el directorio raíz del proyecto.
    pause
    exit /b 1
)

REM Verificar que Docker está funcionando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Docker no está funcionando. Por favor, inicia Docker Desktop.
    pause
    exit /b 1
)

REM 1. Obtener cambios del repositorio
echo [1/6] 📥 Obteniendo últimos cambios del repositorio...
git fetch origin
git pull origin main

if %errorlevel% neq 0 (
    echo ⚠️ Advertencia: No se pudieron obtener cambios del repositorio. Continuando con la versión local...
)

REM 2. Detener contenedores actuales (pero mantener las bases de datos)
echo [2/6] ⏹️ Deteniendo aplicación actual...
docker-compose stop app

REM 3. Construir nueva imagen
echo [3/6] 🔨 Construyendo nueva imagen de Docker...
docker-compose build app

if %errorlevel% neq 0 (
    echo ❌ Error: No se pudo construir la imagen de Docker.
    pause
    exit /b 1
)

REM 4. Actualizar dependencias si es necesario
if exist "package.json" (
    echo [4/6] 📦 Actualizando dependencias...
    npm ci
)

REM 5. Iniciar contenedores actualizados
echo [5/6] 🚀 Iniciando aplicación actualizada...
docker-compose up -d

if %errorlevel% neq 0 (
    echo ❌ Error: No se pudieron iniciar los contenedores.
    pause
    exit /b 1
)

REM 6. Esperar y verificar que la aplicación está funcionando
echo [6/6] 🔍 Verificando que la aplicación está funcionando...
echo ⏳ Esperando a que la aplicación esté lista...

REM Esperar 30 segundos para que la aplicación se inicie
timeout /t 30 /nobreak >nul

REM Verificar endpoints principales
echo 🧪 Probando endpoints principales...

REM Test health endpoint
curl -f http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Health check: OK
) else (
    echo ❌ Health check: FAIL
    echo 📋 Logs de la aplicación:
    docker-compose logs --tail=20 app
    pause
    exit /b 1
)

REM Test main endpoint
curl -f http://localhost:3000/ >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Main endpoint: OK
) else (
    echo ❌ Main endpoint: FAIL
    pause
    exit /b 1
)

REM Test API endpoint
curl -f http://localhost:3000/api >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ API endpoint: OK
) else (
    echo ❌ API endpoint: FAIL
    pause
    exit /b 1
)

REM Limpiar imágenes no utilizadas
echo 🧹 Limpiando imágenes antiguas...
docker image prune -f >nul 2>&1

REM Mostrar estado final
echo.
echo 🎉 ¡Actualización completada exitosamente!
echo.
echo 📊 Estado de los contenedores:
docker-compose ps

echo.
echo 🌐 Aplicación disponible en:
echo   - Principal: http://localhost:3000
echo   - Health: http://localhost:3000/health
echo   - API: http://localhost:3000/api

echo.
echo 📝 Comandos útiles:
echo   - Ver logs: docker-compose logs -f app
echo   - Reiniciar: docker-compose restart app
echo   - Detener: docker-compose down

echo.
echo ✅ GausControl actualizado a la última versión del repositorio!
echo.
pause
