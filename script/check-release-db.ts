import pg from 'pg';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createVerifiedBackup, ReleaseCheckError, verifyReadCompatibility } from './release-database';
import { schemaGaps } from './release-schema-diagnostics';
import { applyOrderTravelMigration } from './migrations/20260926-order-travel';

// Legacy helper entry point. Never runs an automatic ORM push.
// The only reviewed DDL phase is the named, additive orders-travel migration below.
if (process.argv.length > 2) throw new Error('No force, arbitrary migration or skip-backup arguments are accepted.');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required; no database operation was performed.');
const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
try {
  console.log('Release preparation: verified private backup, reviewed orders-travel migration, then strict READ ONLY compatibility gate. No automatic ORM push.');
  const backup = await createVerifiedBackup(connectionString, process.env.GOVZA_BACKUP_DIR ?? join(homedir(), '.local/state/govza/backups'));
  console.log(JSON.stringify(backup));
  console.log(JSON.stringify(await applyOrderTravelMigration(pool, backup)));
  try { console.log(JSON.stringify(await verifyReadCompatibility(pool))); }
  catch (error) {
    try { console.error(JSON.stringify({ schemaCompatibilityGaps: await schemaGaps(pool) })); }
    catch { console.error('Schema metadata unavailable; no rows or credentials were logged.'); }
    throw error;
  }
  console.log('Release database gate passed. Backup and explicitly reviewed migration completed; no tables or existing columns were removed.');
} catch (error) {
  console.error(error instanceof ReleaseCheckError ? error.message : 'Database release preparation failed; inspect locally without exposing credentials.');
  process.exitCode = 1;
} finally { await pool.end(); }
