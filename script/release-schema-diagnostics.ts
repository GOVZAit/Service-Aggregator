import type pg from 'pg';
import { requiredTables } from './release-database';

/** Only metadata for already public ORM identifiers. Never reads user rows or credentials. */
export async function schemaGaps(pool: pg.Pool) {
  const connection = await pool.connect();
  const gaps: { table: string; tableExists: boolean; missingColumns: string[] }[] = [];
  try {
    await connection.query('BEGIN READ ONLY');
    await connection.query("SET LOCAL statement_timeout = '5s'");
    for (const table of requiredTables()) {
      const namespace = table.schema ?? 'public';
      const metadata = await connection.query<{ column_name: string }>(
        'SELECT column_name FROM information_schema.columns WHERE table_schema = $1 AND table_name = $2',
        [namespace, table.name],
      );
      const present = new Set(metadata.rows.map(row => row.column_name));
      const missingColumns = table.columns.map(column => column.name).filter(name => !present.has(name));
      if (missingColumns.length) {
        const exists = await connection.query<{ exists: boolean }>(
          'SELECT to_regclass($1) IS NOT NULL AS exists', [`${namespace}.${table.name}`],
        );
        gaps.push({ table: table.name, tableExists: exists.rows[0].exists, missingColumns });
      }
    }
    return gaps;
  } finally {
    await connection.query('ROLLBACK').catch(() => undefined);
    connection.release();
  }
}
