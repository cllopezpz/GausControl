# Multi-stage build para optimizar el tamaño final
FROM node:18-alpine AS development

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci

# Copiar código fuente
COPY . .

# Exponer puerto
EXPOSE 3000

# Comando por defecto para desarrollo
CMD ["npm", "run", "dev"]

# Etapa de producción
FROM node:18-alpine AS production

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar solo dependencias de producción
RUN npm ci --only=production && npm cache clean --force

# Copiar código fuente
COPY . .

# Crear usuario no-root para seguridad
RUN addgroup -g 1001 -S nodejs
RUN adduser -S nextjs -u 1001

# Cambiar permisos
RUN chown -R nextjs:nodejs /app
USER nextjs

# Exponer puerto
EXPOSE 3000

# Comando para producción
CMD ["npm", "start"]
