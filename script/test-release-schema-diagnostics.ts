import assert from 'node:assert/strict';
import type pg from 'pg';
import { readFileSync } from 'node:fs';
import { requiredTables } from './release-database';
import { schemaGaps } from './release-schema-diagnostics';
const calls:string[]=[];
const fake={connect:async()=>({query:async(sql:string,values?:string[])=>{
  calls.push(sql);
  if(sql.includes('information_schema.columns')){
    const table=requiredTables().find(t=>t.name===values?.[1])!;
    return {rows:table.columns.filter(c=>!(table.name==='orders'&&c.name==='created_at')).map(c=>({column_name:c.name}))};
  }
  if(sql.includes('to_regclass'))return {rows:[{exists:true}]};
  return {rows:[]};
},release:()=>undefined})} as unknown as pg.Pool;
assert.deepEqual(await schemaGaps(fake),[{table:'orders',tableExists:true,missingColumns:['created_at']}]);
assert.ok(calls.every(sql=>/^(BEGIN READ ONLY|SET LOCAL|SELECT column_name FROM information_schema|SELECT to_regclass|ROLLBACK)/.test(sql)));
const script=readFileSync('script/check-release-db.ts','utf8');
assert.ok(script.indexOf('await createVerifiedBackup(')<script.indexOf('await verifyReadCompatibility('));
assert.ok(script.includes('process.exitCode = 1'));
console.log('Schema diagnostics: read-only metadata, failed-gate retention and backup-first order verified.');
