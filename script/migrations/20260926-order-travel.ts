import type pg from 'pg';
import { quoteIdentifier as q, requiredTables, ReleaseCheckError } from '../release-database';

/** A single reviewed additive migration, not an automatic ORM schema synchronizer. */
export const MIGRATION_ID = '20260926-orders-travel-columns';
export const TRAVEL_COLUMNS = ['travel_status', 'live_location_url', 'travel_updated_at'] as const;
export interface ColumnMetadata { name: string; typeOid: number; notNull: boolean; defaultValue: string | null }
export function classifyTravelColumns(columns: ColumnMetadata[]): 'missing' | 'present' {
  const found = TRAVEL_COLUMNS.map(name => columns.find(column => column.name === name));
  if (found.every(column => !column)) return 'missing';
  if (found.some(column => !column)) throw new ReleaseCheckError('Partial travel schema requires separate review; no automatic repair.');
  const [status, url, updated] = found as ColumnMetadata[];
  if (status.typeOid !== 25 || !status.notNull || status.defaultValue !== "'idle'::text" ||
      url.typeOid !== 25 || url.notNull || url.defaultValue !== null ||
      updated.typeOid !== 1184 || updated.notNull || updated.defaultValue !== null) {
    throw new ReleaseCheckError('Existing travel-column definition differs; it will not be overwritten.');
  }
  return 'present';
}

async function columns(connection: pg.PoolClient): Promise<ColumnMetadata[]> {
  const result = await connection.query<ColumnMetadata>(`
    SELECT a.attname AS name, a.atttypid::int AS "typeOid", a.attnotnull AS "notNull",
      pg_get_expr(d.adbin, d.adrelid) AS "defaultValue"
    FROM pg_catalog.pg_attribute a
    LEFT JOIN pg_catalog.pg_attrdef d ON d.adrelid = a.attrelid AND d.adnum = a.attnum
    WHERE a.attrelid = 'public.orders'::regclass AND a.attnum > 0 AND NOT a.attisdropped
    ORDER BY a.attnum
  `);
  return result.rows;
}

export async function applyOrderTravelMigration(pool: pg.Pool, backup: { sha256: string; bytes: number; verifiedAt: string }) {
  if (!/^[a-f0-9]{64}$/.test(backup.sha256) || backup.bytes <= 5 ||
      !Number.isFinite(Date.parse(backup.verifiedAt)) || Math.abs(Date.now() - Date.parse(backup.verifiedAt)) > 600_000) {
    throw new ReleaseCheckError('A newly verified backup is required before this named migration.');
  }
  const connection = await pool.connect();
  try {
    await connection.query('BEGIN');
    await connection.query("SET LOCAL lock_timeout = '3s'");
    await connection.query("SET LOCAL statement_timeout = '15s'");
    const lock = await connection.query<{ locked: boolean }>("SELECT pg_try_advisory_xact_lock(71621, 20260926) AS locked");
    if (!lock.rows[0].locked) throw new ReleaseCheckError('Another release migration is running.');
    const version = await connection.query('SHOW server_version_num');
    if (Number(version.rows[0].server_version_num) < 110000) throw new ReleaseCheckError('Server version requires separate migration review.');
    const table = await connection.query<{ kind: string; inherited: boolean }>(`
      SELECT relkind AS kind, EXISTS(SELECT 1 FROM pg_catalog.pg_inherits WHERE inhrelid = c.oid OR inhparent = c.oid) AS inherited
      FROM pg_catalog.pg_class c WHERE c.oid = to_regclass('public.orders')
    `);
    if (table.rows.length !== 1 || table.rows[0].kind !== 'r' || table.rows[0].inherited) {
      throw new ReleaseCheckError('Expected an existing ordinary orders table; no table will be created or replaced.');
    }
    const initial = classifyTravelColumns(await columns(connection));
    if (initial === 'present') {
      await connection.query('COMMIT');
      return { migration: MIGRATION_ID, state: 'already-applied', schemaChanged: false };
    }
    // Refuse unrelated incompatibilities before taking the short exclusive table lock.
    for (const expected of requiredTables()) {
      const selected = expected.columns.filter(column => expected.name !== 'orders' || !(TRAVEL_COLUMNS as readonly string[]).includes(column.name));
      try {
        await connection.query(`SELECT ${selected.map(column => q(column.name)).join(',')} FROM ${q(expected.schema ?? 'public')}.${q(expected.name)} LIMIT 0`);
      } catch {
        throw new ReleaseCheckError(`Unrelated schema incompatibility in ${expected.name}; named migration refused.`);
      }
    }
    await connection.query('LOCK TABLE ONLY public.orders IN ACCESS EXCLUSIVE MODE');
    if (classifyTravelColumns(await columns(connection)) !== 'missing') {
      throw new ReleaseCheckError('Schema changed during preparation; retry after review.');
    }
    await connection.query(`ALTER TABLE public.orders
      ADD COLUMN travel_status text NOT NULL DEFAULT 'idle',
      ADD COLUMN live_location_url text,
      ADD COLUMN travel_updated_at timestamp with time zone`);
    if (classifyTravelColumns(await columns(connection)) !== 'present') throw new ReleaseCheckError('Migration postcondition failed.');
    await connection.query('COMMIT');
    return { migration: MIGRATION_ID, state: 'applied', schemaChanged: true, addedColumns: [...TRAVEL_COLUMNS] };
  } catch (error) {
    await connection.query('ROLLBACK').catch(() => undefined);
    throw error instanceof ReleaseCheckError ? error : new ReleaseCheckError('Named travel migration failed and was rolled back; no release activation.');
  } finally { connection.release(); }
}
