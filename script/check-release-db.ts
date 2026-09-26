import pg from 'pg';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createVerifiedBackup, ReleaseCheckError, verifyReadCompatibility } from './release-database';
import { schemaGaps } from './release-schema-diagnostics';

// Legacy helper entry point. This never performs schema push or row mutations.
if (process.argv.length > 2) throw new Error('No force, migration or skip-backup arguments are accepted.');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required; no database operation was performed.');
const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
try {
  console.log('Release database gate: verified private backup and read-only compatibility check; NO automatic migration.');
  // Preserve the exact existing database even when a later compatibility check rejects the release.
  console.log(JSON.stringify(await createVerifiedBackup(connectionString, process.env.GOVZA_BACKUP_DIR ?? join(homedir(), '.local/state/govza/backups'))));
  try {
    console.log(JSON.stringify(await verifyReadCompatibility(pool)));
  } catch (error) {
    // Additional metadata is diagnostic only: it cannot approve or bypass a failed gate.
    try { console.error(JSON.stringify({ schemaCompatibilityGaps: await schemaGaps(pool) })); }
    catch { console.error('Schema metadata unavailable; no rows or credentials were logged.'); }
    throw error;
  }
  console.log('Release database gate passed. No schema or row changes were made by this gate.');
} catch (error) {
  console.error(error instanceof ReleaseCheckError ? error.message : 'Database release gate failed; inspect locally without exposing credentials.');
  process.exitCode = 1;
} finally { await pool.end(); }
