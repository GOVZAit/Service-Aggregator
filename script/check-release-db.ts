import pg from 'pg';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createVerifiedBackup, ReleaseCheckError, verifyReadCompatibility } from './release-database';

// Legacy server helper calls `npm run db:push`. It now performs NO schema push or data mutation.
if (process.argv.length > 2) throw new Error('No force, migration or skip-backup arguments are accepted.');
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error('DATABASE_URL is required; no database operation was performed.');
const pool = new pg.Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
try {
  console.log('Release database gate: read-only compatibility check and verified private backup; NO automatic migration.');
  console.log(JSON.stringify(await verifyReadCompatibility(pool)));
  console.log(JSON.stringify(await createVerifiedBackup(connectionString, process.env.GOVZA_BACKUP_DIR ?? join(homedir(), '.local/state/govza/backups'))));
  console.log('Release database gate passed. No schema or row changes were made by this gate.');
} catch (error) {
  console.error(error instanceof ReleaseCheckError ? error.message : 'Database release gate failed; inspect locally without exposing credentials.');
  process.exitCode = 1;
} finally { await pool.end(); }
