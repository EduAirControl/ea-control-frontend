# Etapa 1: build
FROM node:20 AS builder

WORKDIR /app

ARG VITE_API_URL=http://localhost:8080
ENV VITE_API_URL=${VITE_API_URL}

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: servidor web
FROM nginx:alpine

RUN addgroup -S appgroup -g 1000 
    && adduser -S appuser -G appgroup -u 1000

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Configuración para ejecutar Nginx sin privilegios de root
RUN sed -i 's|pid[[:space:]]*/run/nginx.pid;|pid /tmp/nginx.pid;|' /etc/nginx/nginx.conf 
    && sed -i '/^[[:space:]]*user[[:space:]]/d' /etc/nginx/nginx.conf 
    && chown -R appuser:appgroup 
        /usr/share/nginx/html 
        /var/cache/nginx 
        /var/log/nginx 
        /etc/nginx/conf.d 
    && chmod -R 755 /usr/share/nginx/html

USER appuser

EXPOSE 80

HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 
    CMD wget -qO- http://127.0.0.1/ || exit 1

CMD ["nginx", "-g", "daemon off;"]