# Multi-stage build para optimizar el tamaño final
FROM node:18-alpine AS development

# Instalar dependencias del sistema
RUN apk add --no-cache dumb-init

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p logs

# Cambiar permisos
RUN chown -R node:node /app
USER node

# Exponer puerto
EXPOSE 3000

# Comando por defecto para desarrollo
CMD ["dumb-init", "npm", "run", "dev"]

# Etapa de producción
FROM node:18-alpine AS production

# Instalar dependencias del sistema
RUN apk add --no-cache dumb-init

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --omit=dev && npm cache clean --force

# Copiar código fuente
COPY . .

# Crear directorios necesarios
RUN mkdir -p logs

# Cambiar permisos
RUN chown -R node:node /app
USER node

# Exponer puerto
EXPOSE 3000

# Comando para producción
CMD ["dumb-init", "npm", "start"]
