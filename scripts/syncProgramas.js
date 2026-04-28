require('dotenv').config();
require('module-alias/register');

const { initializeDatabase, localPrisma } = require('@db');
const FilterRepository = require('../src/api/v1/modules/filter/filter.repository');
const FilterService = require('../src/api/v1/modules/filter/filter.service');

async function fetchProgramas() {
  console.log('[sync] Obteniendo programas directamente del servicio...');
  
  const repository = new FilterRepository();
  const service = new FilterService(repository);
  
  const programas = await service.getProgramas();
  
  if (!Array.isArray(programas)) {
    throw new Error('El servicio no retornó un array válido');
  }

  return programas;
}

async function upsertPrograma(nombre) {
  // Usando SQL parametrizado con Prisma para evitar inyecciones
  const sql = `INSERT INTO prog (nombre) VALUES (?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`;
  // Nota: con Prisma, la forma segura es usar $executeRaw template con parámetros
  await localPrisma.$executeRaw`INSERT INTO prog (nombre) VALUES (${nombre}) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`;
  return sql;
}

async function run() {
  console.log('[sync] Iniciando sincronización de programas...');
  try {
    // Inicializar conexiones de BD
    await initializeDatabase();

    // Obtener programas del endpoint
    const programas = await fetchProgramas();
    console.log(`[sync] Programas recibidos: ${programas.length}`);

    let ok = 0;
    let fail = 0;
    let lastSql = '';

    for (const raw of programas) {
      const nombre = String(raw).trim();
      if (!nombre) {
        console.warn('[sync] Nombre vacío, se omite.');
        fail += 1;
        continue;
      }
      try {
        lastSql = await upsertPrograma(nombre);
        ok += 1;
        console.log(`[sync] Upsert OK: ${nombre}`);
      } catch (e) {
        fail += 1;
        console.error(`[sync] Error al insertar "${nombre}": ${e.message}`);
      }
    }

    console.log('---');
    console.log(`[sync] Finalizado. OK: ${ok}, Errores: ${fail}`);
    if (lastSql) {
      console.log('[sync] SQL usado para inserción:');
      console.log(lastSql);
    }
  } catch (e) {
    console.error('[sync] Falló la sincronización:', e.message);
    process.exitCode = 1;
  } finally {
    try {
      await localPrisma.$disconnect();
    } catch {}
  }
}

if (require.main === module) {
  run();
}
