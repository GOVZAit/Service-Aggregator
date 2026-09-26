import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import express from 'express';
const source=readFileSync('server/index.ts','utf8');
assert.ok(source.includes('app.set("trust proxy", "loopback")'));
assert.ok(source.includes('host: process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0"'));
const app=express();app.set('trust proxy','loopback');
const trust=app.get('trust proxy fn');
for(const ip of ['127.0.0.1','::1','::ffff:127.0.0.1'])assert.equal(trust(ip),true);
for(const ip of ['203.0.113.10','192.168.1.10','10.1.2.3'])assert.equal(trust(ip),false);
for(const [ip,secure] of [['203.0.113.10',false],['127.0.0.1',true]] as const){
  const req=Object.create(express.request);
  req.app=app;req.connection={remoteAddress:ip,encrypted:false};req.headers={'x-forwarded-proto':'https'};
  assert.equal(req.secure,secure);
}
console.log('Transport policy: loopback proxy and production bind checks passed.');
