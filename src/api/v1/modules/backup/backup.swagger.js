/**
 * @swagger
 * tags:
 *   name: Backup
 *   description: Exportación / backup de la base de datos local (app)
 */

/**
 * @swagger
 * /backup:
 *   get:
 *     tags: [Backup]
 *     summary: Descarga un dump SQL completo de la base de datos `app`
 *     description: |
 *       Ejecuta `mysqldump` sobre la base de datos `app` (DATABASE_URL) y devuelve
 *       el archivo `.sql` listo para descargar.
 *       - Incluye rutinas, triggers y usa transacción única (`--single-transaction`).
 *       - Solo accesible con token JWT válido (admin).
 *       - Requiere que `mysqldump` esté instalado y en el PATH del servidor.
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Archivo SQL generado correctamente
 *         headers:
 *           Content-Disposition:
 *             description: 'Nombre del archivo, e.g. backup_app_2026-06-07T12-00-00.sql'
 *             schema:
 *               type: string
 *           X-Backup-Database:
 *             description: Nombre de la base de datos respaldada
 *             schema:
 *               type: string
 *           X-Backup-Filename:
 *             description: Nombre del archivo generado
 *             schema:
 *               type: string
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: Token no proporcionado o inválido
 *       500:
 *         description: Error ejecutando mysqldump (no instalado, credenciales incorrectas, etc.)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: false
 *                 message:
 *                   type: string
 *                   example: mysqldump no está instalado o no se encuentra en el PATH del servidor
 */
