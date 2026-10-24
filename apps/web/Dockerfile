# ==========================================
# Stage 1: Build React + Vite
# ==========================================
FROM node:20 AS builder

WORKDIR /app

ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# ==========================================
# Stage 2: Nginx
# ==========================================
FROM nginx:alpine

# Crear usuario sin privilegios
RUN addgroup -S appgroup -g 1000 \
    && adduser -S appuser -G appgroup -u 1000

# Copiar archivos compilados de React
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración del sitio
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Configurar Nginx para ejecutarse como usuario no-root
RUN sed -i 's|pid[[:space:]]*/run/nginx.pid;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf \
    && sed -i '/^[[:space:]]*user[[:space:]]/d' /etc/nginx/nginx.conf \
    && chown -R appuser:appgroup \
        /usr/share/nginx/html \
        /var/cache/nginx \
        /var/log/nginx \
        /etc/nginx/conf.d \
    && chmod -R 755 /usr/share/nginx/html

# Ejecutar como usuario sin privilegios
USER appuser

# Puerto HTTP del contenedor
EXPOSE 80

# Comprobar que el servidor responde
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
    CMD wget -qO- http://127.0.0.1/ || exit 1

# Iniciar Nginx en primer plano
CMD ["nginx", "-g", "daemon off;"]