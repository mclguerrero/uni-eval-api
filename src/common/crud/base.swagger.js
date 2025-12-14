function buildCrudDocs(nameOrOptions, schema) {
  // Allow passing either a simple name (string) or options
  const isOptions = typeof nameOrOptions === "object" && nameOrOptions !== null;
  const rawName = isOptions ? (nameOrOptions.name || nameOrOptions.route || "") : (nameOrOptions || "");

  const pascalize = str =>
    String(str || "")
      .split(/[^a-zA-Z0-9]+/)
      .filter(Boolean)
      .map(s => s.charAt(0).toUpperCase() + s.slice(1))
      .join("");

  const Name = isOptions
    ? pascalize(nameOrOptions.schemaName || nameOrOptions.displayName || rawName)
    : pascalize(rawName);

  const route = isOptions
    ? (nameOrOptions.route || (rawName ? `/${rawName}` : "/"))
    : (rawName ? `/${rawName}` : "/");

  const displayName = isOptions
    ? (nameOrOptions.displayName || Name)
    : Name;

  // -------------------------------
  // SCHEMAS DINÁMICOS
  // -------------------------------
  const buildProps = (filterFn = () => true) =>
    Object.fromEntries(
      Object.entries(schema)
        .filter(([k, v]) => filterFn(v))
        .map(([k, v]) => [
          k,
          {
            type: v.type,
            ...(v.example ? { example: v.example } : {}),
            ...(v.nullable ? { nullable: true } : {}),
          },
        ])
    );

  const entitySchema = {
    type: "object",
    properties: buildProps(),
  };

  const writableProps = buildProps(v => !v.readonly);

  const createRequired = Object.entries(schema)
    .filter(([_, v]) => !v.optional && !v.readonly)
    .map(([k]) => k);

  // -------------------------------
  // Normalizar operaciones deshabilitadas
  // -------------------------------
  const disableRaw = isOptions ? nameOrOptions.disable : undefined;
  const disableSet = new Set(
    Array.isArray(disableRaw)
      ? disableRaw.map(d => String(d).toLowerCase())
      : []
  );
  const mapKey = op => {
    const k = String(op).toLowerCase();
    switch (k) {
      case 'getall':
      case 'list':
      case 'find':
        return 'list';
      case 'getbyid':
      case 'get':
      case 'findone':
        return 'get';
      case 'post':
      case 'create':
        return 'create';
      case 'put':
      case 'update':
        return 'update';
      case 'del':
      case 'remove':
      case 'delete':
        return 'delete';
      default:
        return k;
    }
  };
  const isEnabled = key => !disableSet.has(mapKey(key));

  // -------------------------------
  // Construcción dinámica de paths según métodos habilitados
  // -------------------------------
  const paths = {};

  // Helper para fusionar paths extra sin sobrescribir métodos existentes
  const mergePaths = (base, extra) => {
    if (!extra || typeof extra !== 'object') return base;
    for (const [p, ops] of Object.entries(extra)) {
      base[p] = base[p] || {};
      if (ops && typeof ops === 'object') {
        for (const [method, def] of Object.entries(ops)) {
          base[p][method] = def; // Sobrescribe método específico si se redefine
        }
      }
    }
    return base;
  };

  const rootPathOps = {};
  if (isEnabled('list')) {
    rootPathOps.get = {
      summary: `Listar todos los ${displayName} con paginación`,
      tags: [displayName],
      parameters: [
        { in: "query", name: "page", schema: { type: "integer", default: 1 } },
        { in: "query", name: "limit", schema: { type: "integer", default: 10 } },
      ],
      responses: {
        200: {
          description: `Lista paginada de ${displayName}`,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${Name}Paginated` },
            },
          },
        },
      },
    };
  }
  if (isEnabled('create')) {
    rootPathOps.post = {
      summary: `Crear un ${displayName}`,
      tags: [displayName],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/Create${Name}Input` },
          },
        },
      },
      responses: {
        201: {
          description: `${displayName} creado`,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${Name}` },
            },
          },
        },
      },
    };
  }
  if (Object.keys(rootPathOps).length) paths[route] = rootPathOps;

  const idPathOps = {};
  if (isEnabled('get')) {
    idPathOps.get = {
      summary: `Obtener un ${displayName} por ID`,
      tags: [displayName],
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: `${displayName} encontrado`,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${Name}` },
            },
          },
        },
        404: { description: "No encontrado" },
      },
    };
  }
  if (isEnabled('update')) {
    idPathOps.put = {
      summary: `Actualizar un ${displayName}`,
      tags: [displayName],
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "integer" },
        },
      ],
      requestBody: {
        required: true,
        content: {
          "application/json": {
            schema: { $ref: `#/components/schemas/Update${Name}Input` },
          },
        },
      },
      responses: {
        200: {
          description: `${displayName} actualizado`,
          content: {
            "application/json": {
              schema: { $ref: `#/components/schemas/${Name}` },
            },
          },
        },
        404: { description: "No encontrado" },
      },
    };
  }
  if (isEnabled('delete')) {
    idPathOps.delete = {
      summary: `Eliminar un ${displayName}`,
      tags: [displayName],
      parameters: [
        {
          in: "path",
          name: "id",
          required: true,
          schema: { type: "integer" },
        },
      ],
      responses: {
        200: {
          description: "Eliminado correctamente",
          content: {
            "application/json": {
              schema: {
                type: "object",
                properties: {
                  success: { type: "boolean", example: true },
                  message: { type: "string", example: `${displayName} eliminado` },
                },
              },
            },
          },
        },
        404: { description: "No encontrado" },
      },
    };
  }
  if (Object.keys(idPathOps).length) paths[`${route}/{id}`] = idPathOps;

  // Permitir inyectar rutas/operaciones personalizadas desde options
  const extraPaths = isOptions ? nameOrOptions.extraPaths : undefined;
  mergePaths(paths, extraPaths);

  // Si no hay paths habilitados, devolver estructura mínima (sin rutas)
  // Permitir inyectar tags y componentes extra
  const extraTags = isOptions ? nameOrOptions.extraTags : undefined;
  const extraComponents = isOptions ? nameOrOptions.extraComponents : undefined;

  const baseTags = [
    {
      name: displayName,
      description: `Gestión de ${displayName}`,
    },
  ];

  const components = {
    schemas: {
      [Name]: entitySchema,

      [`Create${Name}Input`]: {
        type: "object",
        required: createRequired,
        properties: writableProps,
      },

      [`Update${Name}Input`]: {
        type: "object",
        properties: writableProps,
      },

      // Nuevo schema para paginación
      [`${Name}Paginated`]: {
        type: "object",
        properties: {
          data: {
            type: "array",
            items: { $ref: `#/components/schemas/${Name}` },
          },
          pagination: {
            type: "object",
            properties: {
              page: { type: "integer", example: 1 },
              limit: { type: "integer", example: 10 },
              total: { type: "integer", example: 100 },
              pages: { type: "integer", example: 10 },
              hasNext: { type: "boolean", example: true },
              hasPrev: { type: "boolean", example: false },
            },
          },
        },
      },
    },
  };

  if (extraComponents && typeof extraComponents === 'object') {
    if (extraComponents.schemas && typeof extraComponents.schemas === 'object') {
      components.schemas = { ...components.schemas, ...extraComponents.schemas };
    }
  }

  return {
    tags: Array.isArray(extraTags) ? [...baseTags, ...extraTags] : baseTags,
    components,
    paths,
  };
}

module.exports = buildCrudDocs;
