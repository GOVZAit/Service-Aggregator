/** Only synthetic rows in an initially empty ephemeral localhost *_test database. */
import assert from 'node:assert/strict';
import { mkdtempSync, chmodSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import pg from 'pg';
import { applyOrderTravelMigration, classifyTravelColumns, TRAVEL_COLUMNS, type ColumnMetadata } from './migrations/20260926-order-travel';
import { createVerifiedBackup, quoteIdentifier as q, requiredTables, verifyReadCompatibility } from './release-database';
const uri = new URL(process.env.DATABASE_URL ?? 'postgres://localhost/missing');
assert.ok(process.env.NODE_ENV === 'test' && ['localhost','127.0.0.1','[::1]'].includes(uri.hostname) && uri.pathname.endsWith('_test'));
const pool = new pg.Pool({ connectionString: uri.toString() });
let passed = 0;
async function check(name: string, fn: () => Promise<void> | void) { await fn(); passed++; console.log('PASS ' + name); }
try {
  assert.equal((await pool.query("SELECT count(*)::int n FROM pg_catalog.pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema')")).rows[0].n,0,'Do not touch a database with existing tables');
  const good: ColumnMetadata[] = [
    {name:'travel_status',typeOid:25,notNull:true,defaultValue:"'idle'::text"},
    {name:'live_location_url',typeOid:25,notNull:false,defaultValue:null},
    {name:'travel_updated_at',typeOid:1184,notNull:false,defaultValue:null},
  ];
  await check('exact missing state recognized',()=>assert.equal(classifyTravelColumns([]),'missing'));
  await check('correct applied state recognized',()=>assert.equal(classifyTravelColumns(good),'present'));
  await check('partial schema not overwritten',()=>assert.throws(()=>classifyTravelColumns(good.slice(1)),/Partial/));
  await check('existing incompatible type not overwritten',()=>assert.throws(()=>classifyTravelColumns(good.map((c,i)=>i?c:{...c,typeOid:23})),/differs/));
  await check('existing incompatible default not overwritten',()=>assert.throws(()=>classifyTravelColumns(good.map((c,i)=>i?c:{...c,defaultValue:"'arrived'::text"})),/differs/));
  await check('invalid backup rejected before any connection',async()=>{
    await assert.rejects(applyOrderTravelMigration({connect:()=>{throw new Error('must not connect');}} as unknown as pg.Pool,{sha256:'',bytes:0,verifiedAt:''}),/backup/);
  });
  for (const table of requiredTables()) {
    const columns = table.columns.filter(column=>table.name!=='orders'||!(TRAVEL_COLUMNS as readonly string[]).includes(column.name));
    await pool.query(`CREATE TABLE ${q(table.name)} (${columns.map(column=>`${q(column.name)} ${column.getSQLType()}`).join(',')})`);
  }
  await pool.query("INSERT INTO orders(id,title,master_id,client_id,status,date,price,address,comment,created_at) VALUES (101,'Fixture job',3,7,'completed','2026-09-20','1 500','Fixture address','preserve comment','2026-09-20T10:00:00Z'); CREATE TABLE migration_sentinel(value text); INSERT INTO migration_sentinel VALUES ('keep');");
  const oldFields='id,title,master_id,client_id,status,date,price,address,comment,created_at';
  const before=(await pool.query(`SELECT ${oldFields} FROM orders ORDER BY id`)).rows;
  await check('original gate rejects missing fields',async()=>{await assert.rejects(verifyReadCompatibility(pool),/orders/);});
  const dir=mkdtempSync(join(tmpdir(),'govza-travel-backup-'));chmodSync(dir,0o700);
  const backup=await createVerifiedBackup(uri.toString(),dir);
  await check('only named migration applied with verified backup',async()=>{
    const result=await applyOrderTravelMigration(pool,backup);assert.equal(result.schemaChanged,true);assert.deepEqual(result.addedColumns,[...TRAVEL_COLUMNS]);
  });
  await check('all preexisting order fields unchanged',async()=>assert.deepEqual((await pool.query(`SELECT ${oldFields} FROM orders ORDER BY id`)).rows,before));
  await check('old order receives idle and no invented location or time',async()=>assert.deepEqual((await pool.query('SELECT travel_status,live_location_url,travel_updated_at FROM orders WHERE id=101')).rows,[{travel_status:'idle',live_location_url:null,travel_updated_at:null}]));
  await check('unrelated table preserved',async()=>assert.equal((await pool.query('SELECT value FROM migration_sentinel')).rows[0].value,'keep'));
  await check('all 34 tables pass unchanged strict read gate',async()=>assert.equal((await verifyReadCompatibility(pool)).tables,34));
  await pool.query("INSERT INTO orders(id,title,master_id,client_id,status,date,price,travel_status,live_location_url,travel_updated_at) VALUES (102,'New fixture',4,8,'in_progress','2026-09-26','500','en_route','https://maps.app.goo.gl/fixture','2026-09-26T10:00:00Z')");
  const activeBefore=(await pool.query('SELECT * FROM orders WHERE id=102')).rows;
  await check('repeat run is a no-op',async()=>assert.equal((await applyOrderTravelMigration(pool,backup)).schemaChanged,false));
  await check('repeat run preserves current travel data',async()=>assert.deepEqual((await pool.query('SELECT * FROM orders WHERE id=102')).rows,activeBefore));
  await check('migration has no destructive or arbitrary row-update statements',()=>{
    const text=readFileSync('script/migrations/20260926-order-travel.ts','utf8');
    assert.ok(!/\b(DROP|TRUNCATE|DELETE|UPDATE)\b/.test(text));
    assert.equal((text.match(/ADD COLUMN/g)||[]).length,3);
  });
} finally { await pool.end(); }
console.log(`${passed} named migration checks passed.`);
