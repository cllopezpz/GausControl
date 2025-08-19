# GausControl 🚀

Proyecto de control y gestión desarrollado con Node.js, Docker Desktop y GitHub Desktop.

## 📋 Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:

- **Docker Desktop**: [Descargar aquí](https://www.docker.com/products/docker-desktop/)
- **GitHub Desktop**: [Descargar aquí](https://desktop.github.com/)
- **Node.js** (v16 o superior): [Descargar aquí](https://nodejs.org/)
- **Git**: [Descargar aquí](https://git-scm.com/)

## 🚀 Configuración Inicial

### Opción 1: Configuración Automática (Recomendada)

#### En Windows:
```bash
# Ejecutar el script de configuración
scripts\setup-dev.bat
```

#### En Linux/macOS:
```bash
# Dar permisos de ejecución y ejecutar
chmod +x scripts/setup-dev.sh
./scripts/setup-dev.sh
```

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

## 🏗️ Arquitectura del Proyecto

```
GausControl/
├── src/
│   ├── config/          # Configuraciones (DB, Redis)
│   ├── controllers/     # Controladores de rutas
│   ├── models/          # Modelos de datos
│   ├── routes/          # Definición de rutas
│   ├── middlewares/     # Middlewares personalizados
│   └── index.js         # Punto de entrada
├── tests/               # Pruebas automatizadas
├── scripts/             # Scripts de configuración
├── database/            # Scripts de base de datos
├── docker-compose.yml   # Configuración de servicios
├── Dockerfile           # Imagen de la aplicación
└── README.md           # Documentación
```

## 🌐 Servicios Incluidos

| Servicio | Puerto | Descripción |
|----------|--------|-------------|
| **Aplicación** | 3000 | API principal de GausControl |
| **PostgreSQL** | 5432 | Base de datos principal |
| **Redis** | 6379 | Cache y sesiones |
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

## 🚀 Despliegue

### Desarrollo
```bash
npm run docker:dev
```

### Producción
```bash
npm run docker:prod
```

## 🛠️ Troubleshooting

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

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit tus cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT. Ver `LICENSE` para más detalles.

## 🆘 Soporte

Si tienes problemas:

1. Revisa la sección de [Troubleshooting](#🛠️-troubleshooting)
2. Busca en los [Issues](../../issues) existentes
3. Crea un nuevo [Issue](../../issues/new) si no encuentras solución

---

**Desarrollado con ❤️ por el equipo de GausControl**
