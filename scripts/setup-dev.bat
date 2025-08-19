@echo off
REM Script de configuración para desarrollo en Windows con Docker Desktop y GitHub Desktop

echo 🚀 Configurando entorno de desarrollo para GausControl...

REM Verificar que Docker Desktop está funcionando
docker info >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Docker Desktop no está funcionando. Por favor, inicia Docker Desktop.
    pause
    exit /b 1
)

echo ✅ Docker Desktop detectado

REM Verificar que Docker Compose está disponible
docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Error: Docker Compose no está disponible.
    pause
    exit /b 1
)

echo ✅ Docker Compose detectado

REM Crear archivo .env si no existe
if not exist .env (
    echo 📝 Creando archivo .env desde env.example...
    copy env.example .env
    echo ⚠️  Importante: Revisa y actualiza las variables en .env según tus necesidades
)

REM Crear directorios necesarios
echo 📁 Creando directorios necesarios...
if not exist logs mkdir logs
if not exist database\init mkdir database\init
if not exist nginx mkdir nginx
if not exist src\config mkdir src\config
if not exist src\controllers mkdir src\controllers
if not exist src\models mkdir src\models
if not exist src\routes mkdir src\routes
if not exist src\middlewares mkdir src\middlewares
if not exist tests mkdir tests

REM Instalar dependencias
echo 📦 Instalando dependencias de Node.js...
npm install

REM Construir imágenes de Docker
echo 🐳 Construyendo imágenes de Docker...
docker-compose build

REM Iniciar servicios
echo 🚀 Iniciando servicios de desarrollo...
docker-compose up -d

REM Esperar a que los servicios estén listos
echo ⏳ Esperando a que los servicios estén listos...
timeout /t 15 /nobreak >nul

REM Verificar que los servicios están funcionando
echo 🔍 Verificando servicios...

curl -f http://localhost:3000/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Aplicación funcionando en http://localhost:3000
) else (
    echo ❌ La aplicación no responde en el puerto 3000
)

docker-compose ps | findstr "postgres.*Up" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Base de datos PostgreSQL funcionando
) else (
    echo ❌ Base de datos PostgreSQL no está funcionando
)

docker-compose ps | findstr "redis.*Up" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Redis funcionando
) else (
    echo ❌ Redis no está funcionando
)

echo.
echo 🎉 ¡Configuración completada!
echo.
echo 📝 Próximos pasos:
echo 1. Abre GitHub Desktop y clona/conecta este repositorio
echo 2. Revisa el archivo .env y ajusta las configuraciones
echo 3. Accede a tu aplicación en: http://localhost:3000
echo 4. Para detener los servicios: npm run docker:down
echo 5. Para ver los logs: npm run docker:logs
echo.
echo 🐳 Comandos útiles de Docker:
echo   npm run docker:up    - Iniciar servicios
echo   npm run docker:down  - Detener servicios
echo   npm run docker:logs  - Ver logs
echo   npm run docker:restart - Reiniciar servicios
echo.
pause
