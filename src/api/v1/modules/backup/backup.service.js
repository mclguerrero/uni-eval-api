const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

/**
 * Parsea la DATABASE_URL de Prisma para extraer host, port, user, password y dbname.
 * Formato: mysql://user:password@host:port/dbname
 */
function parseDatabaseUrl(url) {
  const match = url.match(
    /^mysql:\/\/([^:]+):([^@]*)@([^:]+):(\d+)\/(.+)$/
  );
  if (!match) throw new Error('DATABASE_URL tiene un formato no reconocido');
  const [, user, password, host, port, database] = match;
  return { user, password: decodeURIComponent(password), host, port, database };
}

/**
 * Ejecuta mysqldump y devuelve el contenido SQL como Buffer.
 * Solo hace dump de la base de datos `app` (DATABASE_URL).
 */
function runMysqldump({ user, password, host, port, database }) {
  return new Promise((resolve, reject) => {
    // Crear archivo temporal de opciones para no exponer la contraseña en la línea de comandos
    const tmpFile = path.join(os.tmpdir(), `mysqldump_${process.pid}.cnf`);
    fs.writeFileSync(tmpFile, `[client]\npassword=${password}\n`, { mode: 0o600 });

    const args = [
      `--defaults-extra-file=${tmpFile}`,
      `-u${user}`,
      `-h${host}`,
      `-P${port}`,
      '--single-transaction',
      '--routines',
      '--triggers',
      '--set-gtid-purged=OFF',
      '--no-tablespaces',
      database,
    ];

    const chunks = [];
    const { spawn } = require('child_process');
    const proc = spawn('mysqldump', args);

    proc.stdout.on('data', (chunk) => chunks.push(chunk));

    let stderr = '';
    proc.stderr.on('data', (d) => { stderr += d.toString(); });

    proc.on('close', (code) => {
      fs.unlink(tmpFile, () => {});
      if (code !== 0) {
        return reject(new Error(`mysqldump falló (código ${code}): ${stderr.trim()}`));
      }
      resolve(Buffer.concat(chunks));
    });

    proc.on('error', (err) => {
      fs.unlink(tmpFile, () => {});
      if (err.code === 'ENOENT') {
        reject(new Error('mysqldump no está instalado o no se encuentra en el PATH del servidor'));
      } else {
        reject(err);
      }
    });
  });
}

/**
 * Genera el backup de la base de datos `app`.
 * @returns {{ buffer: Buffer, filename: string, database: string }}
 */
async function generateBackup() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL no está configurada en el entorno');

  const conn = parseDatabaseUrl(databaseUrl);

  const buffer = await runMysqldump(conn);

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `backup_${conn.database}_${timestamp}.sql`;

  return { buffer, filename, database: conn.database };
}

module.exports = { generateBackup };
