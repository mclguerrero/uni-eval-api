require('dotenv').config();
require('module-alias/register');

const { initializeDatabase, localPrisma } = require('@db');
const FilterRepository = require('../src/api/v1/modules/filter/filter.repository');
const FilterService = require('../src/api/v1/modules/filter/filter.service');
const RolRepository = require('../src/api/v1/modules/auth/rol/rol.repository');
const RolService = require('../src/api/v1/modules/auth/rol/rol.service');

async function fetchScopeFilters() {
	console.log('[sync-scope] Obteniendo filtros directamente del servicio...');

	const repository = new FilterRepository();
	const service = new FilterService(repository);
	const data = await service.getAllFilters();

	if (!data || typeof data !== 'object') {
		throw new Error('El servicio no retornó un objeto de filtros válido');
	}

	const required = ['sedes', 'periodos', 'programas', 'semestres', 'grupos'];

	for (const key of required) {
		if (!Array.isArray(data[key])) {
			throw new Error(`El servicio no retornó un array válido para ${key}`);
		}
	}

	return data;
}

async function fetchRolesMix() {
	console.log('[sync-scope] Obteniendo roles mixtos directamente del servicio...');

	const repository = new RolRepository();
	const service = new RolService(repository);
	const roles = await service.getMixedRolesOnline();

	if (!Array.isArray(roles)) {
		throw new Error('El servicio no retornó un array válido de roles');
	}

	return roles;
}

function normalizeValues(values = []) {
	const unique = new Set();
	for (const value of values) {
		const normalized = String(value || '').trim();
		if (normalized) unique.add(normalized);
	}
	return [...unique];
}

function normalizeValue(value) {
	return String(value || '').trim();
}

function normalizeTextForCompare(value) {
	return normalizeValue(value)
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toUpperCase();
}

function normalizeSemestres(values = []) {
	const unique = new Set();
	for (const value of values) {
		const normalized = String(value || '').trim();
		if (normalized) unique.add(normalized);
	}
	
	// Ordenar semestres según orden ordinal (insensible a tildes)
	const ordinalOrder = {
		'PRIMER SEMESTRE': 1,
		'SEGUNDO SEMESTRE': 2,
		'TERCER SEMESTRE': 3,
		'CUARTO SEMESTRE': 4,
		'QUINTO SEMESTRE': 5,
		'SEXTO SEMESTRE': 6,
		'SEPTIMO SEMESTRE': 7,
		'OCTAVO SEMESTRE': 8,
		'NOVENO SEMESTRE': 9,
		'DECIMO SEMESTRE': 10
	};

	const getRank = (value) => {
		const normalized = normalizeTextForCompare(value);

		for (const [label, rank] of Object.entries(ordinalOrder)) {
			if (normalized.includes(label)) {
				return rank;
			}
		}

		return Number.MAX_SAFE_INTEGER;
	};
	
	const sorted = [...unique].sort((a, b) => {
		const rankA = getRank(a);
		const rankB = getRank(b);

		if (rankA !== rankB) {
			return rankA - rankB;
		}

		return normalizeTextForCompare(a).localeCompare(normalizeTextForCompare(b));
	});
	
	return sorted;
}

async function upsertSede(nombre) {
	const nombreSafe = normalizeValue(nombre);
	if (!nombreSafe) {
		throw new Error('Registro inválido para sede: nombre requerido');
	}

	const sql = 'INSERT INTO sede (nombre) VALUES (?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)';
	await localPrisma.$executeRaw`INSERT INTO sede (nombre) VALUES (${nombreSafe}) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`;
	return sql;
}

async function upsertPrograma(nombre) {
	const nombreSafe = normalizeValue(nombre);
	if (!nombreSafe) {
		throw new Error('Registro inválido para programa: nombre requerido');
	}

	const sql = 'INSERT INTO prog (nombre) VALUES (?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)';
	await localPrisma.$executeRaw`INSERT INTO prog (nombre) VALUES (${nombreSafe}) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`;
	return sql;
}

async function upsertSemestre(nombre) {
	const nombreSafe = normalizeValue(nombre);
	if (!nombreSafe) {
		throw new Error('Registro inválido para semestre: nombre requerido');
	}

	const sql = 'INSERT INTO smstre (nombre) VALUES (?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)';
	await localPrisma.$executeRaw`INSERT INTO smstre (nombre) VALUES (${nombreSafe}) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`;
	return sql;
}

async function upsertGrupo(nombre) {
	const nombreSafe = normalizeValue(nombre);
	if (!nombreSafe) {
		throw new Error('Registro inválido para grupo: nombre requerido');
	}

	const sql = 'INSERT INTO grp (nombre) VALUES (?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)';
	await localPrisma.$executeRaw`INSERT INTO grp (nombre) VALUES (${nombreSafe}) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`;
	return sql;
}

async function upsertPeriodo(nombre) {
	const nombreSafe = normalizeValue(nombre);
	if (!nombreSafe) {
		throw new Error('Registro inválido para periodo: nombre requerido');
	}

	const sql = 'INSERT INTO peri (nombre) VALUES (?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)';
	await localPrisma.$executeRaw`INSERT INTO peri (nombre) VALUES (${nombreSafe}) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre)`;
	return sql;
}

async function upsertRolMix({ id, nombre, tipo_participacion }) {
	const origen = normalizeValue(tipo_participacion).toUpperCase();
	const rol_origen_id = Number(id);
	const nombreSafe = normalizeValue(nombre);

	if (!rol_origen_id || !nombreSafe || !origen) {
		throw new Error('Registro inválido para rol_mix: faltan campos requeridos');
	}

	const sql =
		'INSERT INTO rol_mix (rol_origen_id, nombre, origen) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), origen = VALUES(origen)';
	await localPrisma.$executeRaw`INSERT INTO rol_mix (rol_origen_id, nombre, origen) VALUES (${rol_origen_id}, ${nombreSafe}, ${origen}) ON DUPLICATE KEY UPDATE nombre = VALUES(nombre), origen = VALUES(origen)`;
	return sql;
}

async function syncCollection({ label, values, upsertFn }) {
	let ok = 0;
	let fail = 0;
	let lastSql = '';

	for (const item of values) {
		try {
			lastSql = await upsertFn(item);
			ok += 1;
			console.log(`[sync-scope] Upsert OK (${label}): nombre=${item}`);
		} catch (error) {
			fail += 1;
			console.error(`[sync-scope] Error en ${label}="${item}": ${error.message}`);
		}
	}

	console.log(`[sync-scope] ${label}: ${ok} OK, ${fail} errores`);
	return { ok, fail, lastSql };
}

async function syncRolesCollection({ roles }) {
	let ok = 0;
	let fail = 0;
	let lastSql = '';

	for (const item of roles) {
		try {
			lastSql = await upsertRolMix(item);
			ok += 1;
			console.log(
				`[sync-scope] Upsert OK (rol_mix): id=${item.id}, nombre=${item.nombre}, origen=${item.tipo_participacion}`
			);
		} catch (error) {
			fail += 1;
			console.error(`[sync-scope] Error en rol_mix id=${item?.id}: ${error.message}`);
		}
	}

	console.log(`[sync-scope] rol_mix: ${ok} OK, ${fail} errores`);
	return { ok, fail, lastSql };
}

async function run() {
	console.log('[sync-scope] Iniciando sincronización de scope...');

	try {
		await initializeDatabase();

		const filters = await fetchScopeFilters();
		const rolesMix = await fetchRolesMix();

		const sedes = normalizeValues(filters.sedes);
		const periodos = normalizeValues(filters.periodos);
		const programas = normalizeValues(filters.programas);
		const semestres = normalizeSemestres(filters.semestres);
		const grupos = normalizeValues(filters.grupos);

		console.log(
			`[sync-scope] Recibidos: sedes=${sedes.length}, periodos=${periodos.length}, programas=${programas.length}, semestres=${semestres.length}, grupos=${grupos.length}, rol_mix=${rolesMix.length}`
		);

		const results = await Promise.all([
			syncCollection({ label: 'sede', values: sedes, upsertFn: upsertSede }),
			syncCollection({ label: 'peri', values: periodos, upsertFn: upsertPeriodo }),
			syncCollection({ label: 'prog', values: programas, upsertFn: upsertPrograma }),
			syncCollection({ label: 'smstre', values: semestres, upsertFn: upsertSemestre }),
			syncCollection({ label: 'grp', values: grupos, upsertFn: upsertGrupo }),
			syncRolesCollection({ roles: rolesMix })
		]);

		const totals = results.reduce(
			(acc, item) => {
				acc.ok += item.ok;
				acc.fail += item.fail;
				return acc;
			},
			{ ok: 0, fail: 0 }
		);

		console.log('---');
		console.log(`[sync-scope] Finalizado. Upserts OK: ${totals.ok}, Errores: ${totals.fail}`);
		const lastSql = results.map(r => r.lastSql).filter(Boolean).pop();
		if (lastSql) {
			console.log('[sync-scope] SQL usado para inserción:');
			console.log(lastSql);
		}
	} catch (error) {
		console.error('[sync-scope] Falló la sincronización:', error.message);
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

