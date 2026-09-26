import { is } from 'drizzle-orm';
import { PgTable, getTableConfig } from 'drizzle-orm/pg-core';
import type pg from 'pg';
import { createHash, randomUUID } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createReadStream, closeSync, fsyncSync, lstatSync, mkdirSync, openSync, readSync, realpathSync, renameSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import { resolve, relative, isAbsolute, sep } from 'node:path';
import * as schema from '../shared/database-schema';
import { backupConnection } from './backup-connection';

export class ReleaseCheckError extends Error {}
export const quoteIdentifier = (name: string) => '"' + name.replaceAll('"', '""') + '"';
export function requiredTables() {
  return (Object.values(schema) as unknown[]).filter((value): value is PgTable => is(value, PgTable)).map(getTableConfig);
}
const isWithin = (parent: string, child: string) => {
  const path = relative(parent, child);
  return path === '' || (path !== '..' && !path.startsWith('..' + sep) && !isAbsolute(path));
};

/** Only column existence/read compatibility is checked, not a full migration diff. No records are returned. */
export async function verifyReadCompatibility(pool: pg.Pool, schemaOverride?: string) {
  const connection = await pool.connect();
  let columns = 0;
  try {
    await connection.query('BEGIN READ ONLY');
    await connection.query("SET LOCAL statement_timeout = '5s'");
    if ((await connection.query('SHOW transaction_read_only')).rows[0].transaction_read_only !== 'on') {
      throw new ReleaseCheckError('Read-only transaction could not be verified.');
    }
    for (const table of requiredTables()) {
      const name = `${quoteIdentifier(schemaOverride ?? table.schema ?? 'public')}.${quoteIdentifier(table.name)}`;
      const fields = table.columns.map(column => quoteIdentifier(column.name)).join(', ');
      try { await connection.query(`SELECT ${fields} FROM ${name} LIMIT 0`); }
      catch { throw new ReleaseCheckError(`Schema compatibility failed for ${table.name}; no migration was attempted.`); }
      columns += table.columns.length;
    }
    return { tables: requiredTables().length, columns, databaseWrites: false };
  } finally {
    await connection.query('ROLLBACK').catch(() => undefined);
    connection.release();
  }
}

/** Backup stays outside the release/web root. Never return backup contents or DB credentials. */
export async function createVerifiedBackup(connectionString: string, directory: string) {
  const root = resolve(directory);
  if (isWithin(resolve(process.cwd()), root)) {
    throw new ReleaseCheckError('Backup directory must be outside the release and web root.');
  }
  mkdirSync(root, { recursive: true, mode: 0o700 });
  if (isWithin(realpathSync(process.cwd()), realpathSync(root))) {
    throw new ReleaseCheckError('Resolved backup directory must be outside the release.');
  }
  const info = lstatSync(root);
  if (!info.isDirectory() || info.isSymbolicLink() || (info.mode & 0o077) !== 0 || info.uid !== process.getuid?.()) {
    throw new ReleaseCheckError('Backup directory must be private, owned by this account, and not a symlink.');
  }
  const filename = `database-${new Date().toISOString().replaceAll(':', '-')}-${randomUUID()}.dump`;
  const partial = resolve(root, filename + '.partial');
  const final = resolve(root, filename);
  const passfile = resolve(root, filename + '.pgpass');
  let fd: number | undefined;
  let passfileCreated = false;
  try {
    fd = openSync(partial, 'wx', 0o600);
    const connection = backupConnection(connectionString, passfile);
    writeFileSync(passfile, connection.passwordFile, { mode: 0o600, flag: 'wx' });
    passfileCreated = true;
    const result = spawnSync('pg_dump', ['--no-password', '--format=custom', '--lock-wait-timeout=10s'], {
      env: connection.env,
      stdio: ['ignore', fd, 'pipe'], timeout: 120_000, maxBuffer: 1024 * 1024,
    });
    if (result.status !== 0 || result.error || (result.stderr?.length ?? 0) > 0) {
      throw new ReleaseCheckError('Backup failed or reported warnings; deployment must stop. Inspect pg_dump locally.');
    }
    fsyncSync(fd); closeSync(fd); fd = undefined;
    const header = Buffer.alloc(5); const input = openSync(partial, 'r');
    try { readSync(input, header, 0, 5, 0); } finally { closeSync(input); }
    if (header.toString() !== 'PGDMP') throw new ReleaseCheckError('Backup archive header is invalid.');
    const listing = spawnSync('pg_restore', ['--list', partial], { encoding: 'utf8', timeout: 30_000, maxBuffer: 8 * 1024 * 1024 });
    if (listing.status !== 0 || !listing.stdout.includes('TABLE DATA')) throw new ReleaseCheckError('Backup contents could not be listed.');
    // Without --dbname this decodes every data block locally; it never connects to or restores any DB.
    const decode = spawnSync('pg_restore', ['--no-owner', '--no-acl', '--file=/dev/null', partial], { stdio: ['ignore','ignore','pipe'], timeout: 120_000, maxBuffer: 1024 * 1024 });
    if (decode.status !== 0 || decode.error) throw new ReleaseCheckError('Full backup decoding failed.');
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(partial)) hash.update(chunk);
    const metadata = { file: filename, bytes: statSync(partial).size, sha256: hash.digest('hex'), verifiedAt: new Date().toISOString(), verification: 'pg_restore list + full offline decode; no production restore' };
    renameSync(partial, final);
    writeFileSync(final + '.json', JSON.stringify(metadata, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
    return { ...metadata, directory: root };
  } finally {
    if (fd !== undefined) closeSync(fd);
    if (passfileCreated) unlinkSync(passfile);
    try { unlinkSync(partial); } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
  }
}
