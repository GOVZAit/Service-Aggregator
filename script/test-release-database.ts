/** Uses two empty, ephemeral localhost PostgreSQL service databases. No existing tables are removed or altered. */
import assert from 'node:assert/strict';
import { mkdtempSync, chmodSync, readFileSync, statSync, mkdirSync, readdirSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import pg from 'pg';
import { createVerifiedBackup, quoteIdentifier as q, requiredTables, verifyReadCompatibility } from './release-database';
function testUrl(value: string | undefined) {
  const url = new URL(value ?? 'postgresql://localhost/missing');
  assert.ok(process.env.NODE_ENV === 'test' && ['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.pathname.endsWith('_test'), 'Only isolated localhost test databases are allowed.');
  return url;
}
const sourceUrl = testUrl(process.env.DATABASE_URL);
const restoreUrl = testUrl(process.env.RESTORE_TEST_DATABASE_URL);
assert.notEqual(sourceUrl.toString(),restoreUrl.toString());
const source = new pg.Pool({ connectionString: sourceUrl.toString() });
const restored = new pg.Pool({ connectionString: restoreUrl.toString() });
const dir = mkdtempSync(join(tmpdir(), 'govza-backup-test-')); chmodSync(dir, 0o700);
let cases = 0;
async function test(name: string, action: () => Promise<void> | void) { await action(); cases++; console.log('PASS '+name); }
try {
  for (const pool of [source,restored]) {
    const check=await pool.query("SELECT count(*)::int n FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')");
    assert.equal(check.rows[0].n,0,'Refuse to use a database containing existing tables.');
  }
  const tables = requiredTables();
  for (const table of tables) {
    const columns = table.columns.map(col => `${q(col.name)} ${col.getSQLType()}`).join(',');
    await source.query(`CREATE TABLE ${q(table.name)} (${columns})`);
  }
  await source.query("INSERT INTO auto_parts_suppliers(imported_data,manual_overrides) VALUES ('{\"name\":\"fixture\"}', '{}'); CREATE TABLE unlisted_sentinel(value text); INSERT INTO unlisted_sentinel VALUES ('preserve me');");
  await test('complete inventory includes 34 tables',()=>{assert.equal(tables.length,34);assert.equal(new Set(tables.map(t=>t.name)).size,34);assert.ok(tables.some(t=>t.name==='auto_parts_suppliers'));});
  await test('every schema source is inventoried',()=>{
    const inventory=readFileSync('shared/database-schema.ts','utf8');
    for(const file of readdirSync('shared').filter(f=>f.endsWith('.ts')&&f!=='database-schema.ts')){
      if(readFileSync(join('shared',file),'utf8').includes('= pgTable('))assert.ok(inventory.includes(`'./${file.slice(0,-3)}'`),file);
    }
  });
  await test('identifiers are quoted',()=>assert.equal(q('a"b'),'"a""b"'));
  await test('real read-only compatibility check succeeds',async()=>{const result=await verifyReadCompatibility(source);assert.equal(result.tables,34);assert.equal(result.databaseWrites,false);});
  await test('missing column fails closed using a simulated connection',async()=>{
    const calls:string[]=[];
    const simulated={connect:async()=>({query:async(sql:string)=>{calls.push(sql);if(sql.startsWith('SELECT '))throw new Error('missing column');return {rows:[{transaction_read_only:'on'}]};},release:()=>undefined})} as unknown as pg.Pool;
    await assert.rejects(verifyReadCompatibility(simulated),/Schema compatibility failed/);
    assert.ok(calls.every(sql=>/^(BEGIN READ ONLY|SET LOCAL|SHOW |SELECT |ROLLBACK)/.test(sql)));
  });
  await test('existing fixture records and unlisted table preserved',async()=>{
    assert.equal((await source.query('SELECT value FROM unlisted_sentinel')).rows[0].value,'preserve me');
    assert.equal((await source.query('SELECT count(*)::int n FROM auto_parts_suppliers')).rows[0].n,1);
  });
  const backup=await createVerifiedBackup(sourceUrl.toString(),dir);
  await test('full archive and offline decode succeed',()=>{assert.ok(backup.bytes>100);assert.match(backup.sha256,/^[a-f0-9]{64}$/);});
  await test('archive and manifest permissions are private',()=>{assert.equal(statSync(join(dir,backup.file)).mode&0o777,0o600);assert.equal(statSync(join(dir,backup.file+'.json')).mode&0o777,0o600);assert.ok(!JSON.stringify(backup).includes(sourceUrl.toString()));});
  await test('fixture archive restores into the second empty service',async()=>{
    const result=spawnSync('pg_restore',['--exit-on-error','--no-owner','--no-acl','--dbname='+restoreUrl.toString(),join(dir,backup.file)],{encoding:'utf8',timeout:60_000});
    assert.equal(result.status,0,result.stderr);
    await verifyReadCompatibility(restored);
    assert.equal((await restored.query('SELECT value FROM unlisted_sentinel')).rows[0].value,'preserve me');
    assert.deepEqual((await restored.query('SELECT imported_data FROM auto_parts_suppliers')).rows,(await source.query('SELECT imported_data FROM auto_parts_suppliers')).rows);
  });
  await test('public directory rejected',async()=>{const bad=join(dir,'insecure');mkdirSync(bad,{mode:0o755});await assert.rejects(createVerifiedBackup(sourceUrl.toString(),bad),/private/);});
  await test('release directory rejected',async()=>{await assert.rejects(createVerifiedBackup(sourceUrl.toString(),process.cwd()),/outside/);});
  await test('symlink destination rejected',async()=>{const link=join(dir,'link');symlinkSync(dir,link);await assert.rejects(createVerifiedBackup(sourceUrl.toString(),link),/symlink/);});
  await test('failed backup preserves previous verified archive',async()=>{const bad=new URL(sourceUrl);bad.port='1';await assert.rejects(createVerifiedBackup(bad.toString(),dir),/Backup failed/);assert.ok(statSync(join(dir,backup.file)).size>0);assert.ok(!readdirSync(dir).some(f=>f.endsWith('.partial')));});
  await test('unattended schema push refused by configuration',()=>{
    const result=spawnSync(process.execPath,['node_modules/drizzle-kit/bin.cjs','push'],{env:{...process.env,DATABASE_URL:sourceUrl.toString(),NODE_ENV:'production'},encoding:'utf8',timeout:20_000});
    assert.match(result.stdout+result.stderr,/Automatic schema push is disabled/);
  });
} finally { await source.end();await restored.end(); }
console.log(`${cases} release database safety checks passed.`);
