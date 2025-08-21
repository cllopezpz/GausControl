# GausControl - IoT Speed Monitoring System 🚀

Sistema de monitoreo de velocidad en tiempo real usando MQTT, con alertas automáticas y APIs REST para consultas.

## 🎯 Características Principales

- **Consumo MQTT en tiempo real** del tópico `vehicles/speed`
- **Alertas automáticas**:
  - Alerta simple: cuando velocidad > 60 km/h
  - Alerta crítica: 3+ violaciones consecutivas
- **Manejo robusto** de mensajes malformados y pérdida de conexión
- **APIs REST** para consultas históricas
- **Publicación de alertas** en tópico `vehicles/alerts`
- **Base de datos PostgreSQL** para persistencia
- **WebSockets** para notificaciones en tiempo real

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Docker Desktop**: [Descargar aquí](https://www.docker.com/products/docker-desktop/)
- **GitHub Desktop**: [Descargar aquí](https://desktop.github.com/)
- **Node.js** (v16 o superior): [Descargar aquí](https://nodejs.org/)
- **Git**: [Descargar aquí](https://git-scm.com/)

## 🚀 Configuración Inicial

### Opción 1: Configuración Automática (Recomendada)

```bash
# Un solo comando para iniciar todo el entorno
npm run setup

# O alternativamente:
npm run start:dev
```

Esto ejecutará automáticamente:
- �?Verificación de Docker
- 🔨 Construcción de imágenes  
- 🚀 Inicio de todos los servicios
- 🌐 Apertura del navegador en http://localhost:3000

#### Scripts Específicos por Plataforma:

**Windows:**
```bash
scripts\start-dev.bat
```

**Linux/macOS:**
```bash
chmod +x scripts/start-dev.sh
./scripts/start-dev.sh
```

### 🌐 Interfaz Web

Una vez iniciado, abre tu navegador en:
**http://localhost:3000**

La interfaz web te permite:
- 📊 Monitorear estado del sistema en tiempo real
- 🎮 Controlar el procesador MQTT
- 📋 Ver logs del sistema
- 🔌 Probar APIs disponibles

### Opción 2: Configuración Manual

1. **Clonar el repositorio**:
   ```bash
   git clone <tu-repositorio-url>
   cd GausControl
   ```

2. **Configurar variables de entorno**:
   ```bash
   cp env.example .env
   # Edita .env según tus necesidades
   ```

3. **Instalar dependencias**:
   ```bash
   npm install
   ```

4. **Iniciar con Docker**:
   ```bash
   npm run docker:up
   ```

## 🐳 Comandos de Docker

| Comando | Descripción |
|---------|-------------|
| `npm run docker:build` | Construir imágenes |
| `npm run docker:up` | Iniciar servicios en segundo plano |
| `npm run docker:down` | Detener servicios |
| `npm run docker:logs` | Ver logs en tiempo real |
| `npm run docker:restart` | Reiniciar servicios |
| `npm run docker:clean` | Limpiar contenedores y volúmenes |
| `npm run docker:dev` | Modo desarrollo con hot reload |
| `npm run docker:prod` | Modo producción |
| `npm run update` | 🔄 **Actualización automática completa** |
| `npm run pull-and-restart` | Actualizar imágenes y reiniciar |
| `npm run watch` | Ver logs de la aplicación en tiempo real |
| `npm run webhook` | Iniciar servidor de webhooks para auto-deploy |

## 🏗�?Arquitectura del Sistema IoT

### 🔧 Funcionamiento del Sistema

#### 1. **Ingesta de Datos**
- **Vehículos IoT** publican datos de velocidad en el tópico MQTT `vehicles/speed`
- **MQTT Broker** (Mosquitto) recibe y distribuye mensajes en tiempo real
- **Formato de mensaje**:
```json
{
  "vehicleId": "VEH001",
  "speed": 75.5,
  "timestamp": "2024-01-15T10:30:00Z",
  "location": {"lat": -33.4489, "lng": -70.6693},
  "vehicleType": "car"
}
```

#### 2. **Procesamiento en Tiempo Real**
- **MQTT Speed Processor** consume mensajes del tópico
- **Validación robusta** de datos con manejo de mensajes malformados
- **Speed Processor** aplica lógica de negocio:
  - Detecta violaciones de velocidad (> 60 km/h)
  - Rastrea violaciones consecutivas por vehículo
  - Calcula estadísticas en tiempo real

#### 3. **Sistema de Alertas**
- **Alertas Simples**: Velocidad > 60 km/h
  ```
  🚨 ALERT: VEH001 exceeded speed at 75.5 km/h at 10:30:00
  ```
- **Alertas Críticas**: 3+ violaciones consecutivas
  ```
  🚨🚨 CRITICAL ALERT: VEH001 exceeded speed consecutively 3 times
  ```
- **Publicación**: Alertas se publican en `vehicles/alerts`
- **Notificaciones**: WebSockets para updates en tiempo real

#### 4. **Persistencia y Consultas**
- **PostgreSQL**: Almacena registros de velocidad y alertas
- **Redis**: Cache para sesiones y datos temporales
- **APIs REST**: Consultas históricas y estadísticas
- **WebSocket**: Notificaciones en tiempo real


### 🏗�?Estructura del Código

```
GausControl/
├── src/
�?  ├── config/              # ⚙️ Configuraciones centralizadas
�?  �?  ├── config.js        # Configuración principal
�?  �?  ├── database.js      # Configuración PostgreSQL
�?  �?  └── redis.js         # Configuración Redis
�?  �?�?  ├── services/            # 🔧 Lógica de negocio
�?  �?  ├── mqttClient.js            # Cliente MQTT
�?  �?  ├── mqttSpeedProcessor.js    # Procesador principal MQTT
�?  �?  ├── speedProcessor.js        # Lógica de velocidad
�?  �?  └── alertSystem.js           # Sistema de alertas
�?  �?�?  ├── repositories/        # 💾 Acceso a datos
�?  �?  ├── baseRepository.js        # Repositorio base
�?  �?  ├── speedRecordRepository.js # Datos de velocidad
�?  �?  └── alertRepository.js       # Datos de alertas
�?  �?�?  ├── validators/          # �?Validación de datos
�?  �?  ├── speedDataValidator.js    # Validador Joi (legacy)
�?  �?  └── simpleSpeedValidator.js  # Validador robusto
�?  �?�?  ├── controllers/         # 🎮 Controladores API
�?  �?  ├── speedController.js       # Endpoints de velocidad
�?  �?  └── alertController.js       # Endpoints de alertas
�?  �?�?  ├── routes/              # 🛣�?Definición de rutas
�?  �?  ├── speedRoutes.js           # Rutas de velocidad
�?  �?  └── alertRoutes.js           # Rutas de alertas
�?  �?�?  └── index.js             # 🚀 Punto de entrada principal
�?├── database/                # 🗄�?Scripts de base de datos
�?  └── init/
�?      └── 01-schema.sql    # Schema inicial PostgreSQL
�?├── scripts/                 # 📜 Scripts de utilidad
�?  ├── mqtt-publisher.js    # Publicador de pruebas MQTT
�?  ├── test-valid-messages.js # Tests con mensajes válidos
�?  ├── start-dev.sh/.bat    # Scripts de inicio
�?  └── auto-update.sh/.bat  # Scripts de actualización
�?├── public/                  # 🌐 Interfaz web
�?  └── index.html           # Dashboard de monitoreo
�?├── mosquitto/               # 🦟 Configuración MQTT
�?  └── config/
�?      └── mosquitto.conf   # Configuración del broker
�?├── docker-compose.yml       # 🐳 Orquestación de servicios
├── Dockerfile              # 📦 Imagen de la aplicación
└── README.md               # 📖 Documentación
```

### 🔄 Principios de Diseño

#### SOLID Principles Implementation:
- **Single Responsibility**: Cada clase tiene una responsabilidad específica
- **Open/Closed**: Extensible sin modificar código existente
- **Liskov Substitution**: Interfaces intercambiables
- **Interface Segregation**: Interfaces específicas y focalizadas
- **Dependency Inversion**: Dependencias a través de abstracciones

#### Design Patterns:
- **Repository Pattern**: Abstracción de acceso a datos
- **Strategy Pattern**: Diferentes tipos de alertas
- **Observer Pattern**: WebSockets para notificaciones
- **Factory Pattern**: Creación de objetos validadores

### 🛡�?Robustez y Manejo de Errores

- **Reconexión automática** MQTT en caso de pérdida de conexión
- **Validación robusta** de mensajes con manejo de JSON malformado
- **Transacciones de base de datos** para consistencia
- **Logs estructurados** para debugging y monitoreo
- **Health checks** para todos los servicios
- **Graceful shutdown** para cierre limpio de conexiones

### 🔧 Mejoras Implementadas

#### Validación de Datos Mejorada
- **SimpleSpeedValidator**: Validador personalizado sin dependencias externas
- **Manejo seguro de JSON**: Previene errores `SyntaxError: Unexpected token o`
- **Campos opcionales**: Acepta valores `null` para `location` y `metadata`
- **Tipos de vehículo flexibles**: Incluye `"unknown"` como valor válido

#### Robustez del Sistema
- **Procesamiento resiliente**: Continúa funcionando con mensajes malformados
- **Logs informativos**: Debugging detallado solo en modo desarrollo
- **Control de errores granular**: Cada componente maneja sus errores específicos
- **Reinicio automático**: Docker mantiene servicios activos ante fallos

## 🌐 Servicios Incluidos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **Aplicación** | 3000 | API principal de GausControl |
| **PostgreSQL** | 5432, 5433 | Base de datos principal |
| **Redis** | 6379, 6380 | Cache y sesiones |
| **MQTT Broker** | 1883, 9001 | Eclipse Mosquitto para IoT |
| **Nginx** | 80/443 | Proxy reverso (solo producción) |

## 🔧 Desarrollo Local

### Usando GitHub Desktop

1. **Clonar repositorio**:
   - Abre GitHub Desktop
   - Clic en "Clone a repository from the Internet"
   - Pega la URL del repositorio

2. **Hacer cambios**:
   - Realiza tus modificaciones
   - GitHub Desktop detectará automáticamente los cambios
   - Escribe un mensaje de commit descriptivo
   - Haz clic en "Commit to main"

3. **Sincronizar**:
   - Clic en "Push origin" para subir cambios
   - Clic en "Fetch origin" para obtener cambios

### Usando Docker Desktop

1. **Ver contenedores**:
   - Abre Docker Desktop
   - Ve a la pestaña "Containers"
   - Verás todos los servicios de GausControl

2. **Monitorear servicios**:
   - Clic en un contenedor para ver logs
   - Usa el terminal integrado para debugging

## 📊 Endpoints Disponibles

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/` | GET | Página principal |
| `/health` | GET | Health check del servicio |
| `/api` | GET | Información de la API |

## 🧪 Pruebas

```bash
# Ejecutar todas las pruebas
npm test

# Ejecutar pruebas en modo watch
npm run test:watch

# Ejecutar pruebas con coverage
npm run test:coverage
```

## 🔒 Variables de Entorno

Copia `env.example` a `.env` y configura:

```env
# Aplicación
NODE_ENV=development
PORT=3000

# Base de datos
DB_HOST=database
DB_PORT=5432
DB_NAME=gaus_control
DB_USER=gaus_user
DB_PASSWORD=gaus_password

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# Seguridad
JWT_SECRET=tu_jwt_secret_muy_seguro
SESSION_SECRET=tu_session_secret_muy_seguro
```

## 🚀 Despliegue y Automatización

### 🔄 Actualización Automática

El proyecto incluye **automatización completa** para actualizar los contenedores cuando actualices el repositorio:

#### Opción 1: Comando Directo (Recomendado)
```bash
# Un solo comando actualiza todo automáticamente
npm run update
```

#### Opción 2: Scripts Específicos
```bash
# En Windows
scripts\auto-update.bat

# En Linux/macOS
chmod +x scripts/auto-update.sh
./scripts/auto-update.sh
```

#### Opción 3: Webhook para Auto-Deploy
```bash
# Iniciar servidor de webhooks (puerto 9000)
npm run webhook
```

Luego configura el webhook en GitHub:
1. Ve a tu repositorio �?Settings �?Webhooks
2. Add webhook: `http://tu-servidor:9000/webhook`
3. Content type: `application/json`
4. Events: `Just the push event`

### 🎯 Pipeline de CI/CD

El proyecto incluye **GitHub Actions** que se ejecutan automáticamente:

- �?**Pruebas** automáticas en cada push
- 🔨 **Build** y push de imágenes Docker
- 🚀 **Deploy** automático en la rama main
- 🔒 **Escaneo de seguridad** con Trivy
- 📊 **Reportes** detallados de despliegue

### Desarrollo
```bash
npm run docker:dev
```

### Producción
```bash
npm run docker:prod
```

## 🛠�?Troubleshooting

### Problemas Comunes

**Docker no inicia:**
- Verifica que Docker Desktop esté ejecutándose
- Revisa que no hay conflictos de puertos

**Base de datos no conecta:**
- Verifica las variables de entorno en `.env`
- Asegúrate que el contenedor de PostgreSQL esté ejecutándose

**Puertos ocupados:**
- Cambia los puertos en `docker-compose.yml`
- O detén los servicios que usan esos puertos

### Logs de Debug

```bash
# Ver logs de todos los servicios
npm run docker:logs

# Ver logs de un servicio específico
docker-compose logs -f app
docker-compose logs -f database
docker-compose logs -f redis
```

## 📡 Testing del Sistema MQTT

### Comandos de Testing Disponibles

```bash
# �?Enviar mensajes VÁLIDOS para verificar funcionamiento
npm run mqtt:valid

# Enviar mensajes de prueba variados (incluye malformados)
npm run mqtt:test

# Simular tráfico continuo por 60 segundos
npm run mqtt:traffic

# Enviar mensaje individual: VEH001 a 75 km/h
npm run mqtt:single VEH001 75

# Generar violaciones consecutivas (críticas)
npm run mqtt:violations
```

### Recomendación de Testing

**Para verificar que el sistema funciona correctamente**, utiliza:
```bash
npm run mqtt:valid
```
Este comando envía mensajes con formato correcto y genera alertas predecibles, ideal para validar el funcionamiento del sistema.

### Ejemplo de Mensaje MQTT

```json
{
  "vehicleId": "VEH001",
  "speed": 75.5,
  "timestamp": "2024-01-15T10:30:00Z",
  "location": {
    "latitude": -33.4489,
    "longitude": -70.6693
  },
  "vehicleType": "car",
  "metadata": {
    "test": true
  }
}
```

### Alertas Esperadas

#### Alerta Simple (speed > 60)
```
🚨 ALERT: VEH001 exceeded speed at 75.5 km/h at 10:30:00
```

#### Alerta Crítica (3+ consecutivas)
```
🚨🚨 CRITICAL ALERT: VEH001 exceeded speed consecutively 3 times
```


---

