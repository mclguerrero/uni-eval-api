# uni-eval-api — Contexto del Proyecto

## Qué es
Backend REST API para un **sistema de evaluación docente universitaria**.
Permite configurar evaluaciones, aplicarlas, y generar métricas/reportes por facultad, programa, semestre y grupo.

## Stack
- **Runtime:** Node.js 18+ / Express 4
- **ORM:** Prisma 6 (multi-schema)
- **DBs:** MySQL — 3 instancias separadas (ver abajo)
- **Auth:** JWT + bcryptjs
- **LLM:** Ollama (llama3.1:8b) para análisis de comentarios
- **Reportes:** docxtemplater + chartjs-node-canvas
- **Logging:** Winston con rotación diaria
- **Validación:** Ajv + Joi
- **Docs:** Swagger en `/api-docs`

## Entry points
```
npm run dev   → nodemon src/server.js
npm start     → node src/server.js
```
Puerto: `5000` (configurado en .env)

## Bases de datos (3 conexiones Prisma)
| Alias | Variable | Base | Propósito |
|---|---|---|---|
| `localPrisma` | `DATABASE_URL` | `app` (localhost) | App local: evaluaciones, configuraciones |
| `userPrisma` | `DATABASE_URL_USER` | `sigedin_ies` (remoto) | Vista académica: `vista_academica_insitus` |
| `authPrisma` | `DATABASE_URL_AUTH` | `sigedin_seguridad` (remoto) | Autenticación: `datalogin` |

> **IMPORTANTE:** No hacer `prisma db pull` en remoto (auth/user). Los schemas son manuales.

## Estructura de src/
```
src/
├── server.js                  ← Entry point, signals, startup
├── app.js                     ← Express setup, CORS, Helmet, rutas
├── db.js                      ← Init de 3 clientes Prisma
├── config/
│   ├── prisma.js              ← Exporta localPrisma, userPrisma, authPrisma
│   ├── cors_config.js
│   ├── jwt_config.js
│   ├── logger_config.js       ← Winston
│   └── ollama_config.js
├── api/v1/
│   ├── modules/
│   │   ├── router.js          ← Orquestador de todos los módulos
│   │   ├── ai/                ← Ollama: proveedores, modelos, claves
│   │   ├── app/               ← Núcleo: tipos, aspectos, escalas, evaluaciones, cfg
│   │   ├── auth/              ← Roles, usuarios, login
│   │   ├── filter/            ← Cascada de filtros académicos
│   │   └── metric/            ← Métricas y reportes .docx
│   └── middlewares/
│       └── authorization.service.js  ← RBAC por scope académico
└── common/
    ├── bulk-cfg/              ← Operaciones bulk cfg_a / cfg_e
    ├── crud/                  ← Base CRUD reutilizable
    └── validation/
```

## Patrón por módulo (Repository → Service → Controller → Router)
Cada módulo sigue exactamente este patrón:
```
filter.repository.js   ← SQL/Prisma puro, sin lógica
filter.service.js      ← Lógica de negocio
filter.controller.js   ← HTTP: extrae params, llama service, responde
filter.router.js       ← Registra rutas Express
filter.swagger.js      ← Documentación OpenAPI
```

## Alias de módulos (@)
```js
@db          → src/db
@config      → src/config
@middlewares → src/api/v1/middlewares
@utils       → src/api/v1/utils
```

## API Base URL
```
http://localhost:5000/api/v1
```

## Módulos y rutas principales
| Ruta | Módulo | Descripción |
|---|---|---|
| `/filter/*` | filter/ | Cascada: periodos→sedes→facultades→programas→semestres→grupos |
| `/metric/*` | metric/ | Métricas de evaluación con filtros académicos |
| `/eval` | app/eval/ | CRUD evaluaciones |
| `/tipo`, `/aspecto`, `/escala` | app/ | Framework T-A-E |
| `/rol`, `/user/rol`, `/user/prog` | auth/ | RBAC académico |
| `/ai/*` | ai/ | Integración Ollama |

## Fuente de verdad académica
La vista `vista_academica_insitus` (en `userPrisma`) es la fuente de todos los datos académicos:
- `NOM_FACULTAD`, `NOM_PROGRAMA`, `NOM_SEDE`, `PERIODO`, `SEMESTRE`, `GRUPO`
- Todos los filtros leen de esta vista

## Authorization (RBAC)
- `authorization.service.js` valida el scope del usuario vs el recurso solicitado
- Scope almacenado en `user_prog` table: `{programa, sede, facultad, semestre, grupo, periodo}`
- `getUserAcademicScopeContext()` → extrae contexto académico del usuario autenticado
- `matchesScopeWithUserContext()` → valida acceso

## LLM / Ollama
- Host: `http://127.0.0.1:11434`
- Modelo: `llama3.1:8b-instruct-q4_K_M`
- Usado en: análisis de comentarios abiertos en evaluaciones
