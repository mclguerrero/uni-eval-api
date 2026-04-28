# =========================
# Stage 1 - Builder
# =========================
FROM node:20-bookworm-slim AS builder

WORKDIR /app

# Necesario para Prisma + compilación de módulos nativos (canvas)
RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl \
  python3 \
  make \
  g++ \
  pkg-config \
  libcairo2-dev \
  libpango1.0-dev \
  libjpeg62-turbo-dev \
  libgif-dev \
  libpixman-1-dev \
  libpng-dev \
  && rm -rf /var/lib/apt/lists/*

# Copiar archivos de dependencias
COPY package.json package-lock.json ./

# Instalar dependencias
RUN npm ci

# Copiar todo el código fuente
COPY . .

# Generar Prisma Client requeridos en Linux
RUN npm run db:generate:local \
    && npm run db:generate:auth \
    && npm run db:generate:user

# =========================
# Stage 2 - Runtime
# =========================
FROM node:20-bookworm-slim

WORKDIR /app

# Instalar runtime libs + openssl + dumb-init + netcat
RUN apt-get update && apt-get install -y --no-install-recommends \
  openssl \
  dumb-init \
  netcat-traditional \
  libcairo2 \
  libpango-1.0-0 \
  libjpeg62-turbo \
  libgif7 \
  libpixman-1-0 \
  libpng16-16 \
  && rm -rf /var/lib/apt/lists/*

# Crear usuario no-root
RUN groupadd -r nodejs && useradd -r -g nodejs nodejs

# Copiar código y node_modules desde el builder
COPY --from=builder /app /app



# Permisos para usuario no-root
RUN mkdir -p /app/logs && chown -R nodejs:nodejs /app

# Cambiar a usuario no-root
USER nodejs

# Exponer puerto
EXPOSE 5000

# Healthcheck
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:5000/health', r => {if(r.statusCode!==200) throw new Error(r.statusCode)})"

# Usar dumb-init wrapper para ejecutar el proceso principal
# Con lógica de espera a MySQL integrada
CMD ["dumb-init", "sh", "-c", "\necho '⏳ Esperando a que MySQL esté listo en mysql-local:3306...';\nfor i in $(seq 1 30); do\n  if nc -z mysql-local 3306 2>/dev/null; then\n    echo '✅ MySQL está listo!';\n    break;\n  fi;\n  echo \"  Intento $i/30: MySQL no está listo todavía, esperando...\";\n  sleep 10;\n  if [ $i -eq 30 ]; then\n    echo '❌ MySQL no se conectó después de 5 minutos. Abortando.';\n    exit 1;\n  fi;\ndone;\necho '🚀 Iniciando aplicación...';\nnpm run db:pull:local && npm run db:generate:local && node scripts/generate-schemas.js && node scripts/generate-swagger.js && node src/server.js"]