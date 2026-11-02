import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,readFileSync} from 'node:fs';
import {join,relative,dirname} from 'node:path';
import {sanitizeBuildTraces} from '../../../scripts/sanitize-build-traces.ts';
import config from '../../../next.config.ts';
import {createRequire} from 'node:module';
test('official aggregate employment snapshots and provenance remain explicitly included for computed loader paths',()=>{
 const patterns=config.outputFileTracingIncludes?.['/*']??[],match=createRequire(import.meta.url)('next/dist/compiled/picomatch');
 for(const id of ['ct17565','ct17582','ct17586','ct17594'])for(const name of ['original.csv','source-metadata.json'])assert.ok(patterns.some(pattern=>match(pattern.replace(/^\.\//,''))('data/employment/singstat-census2020-'+id+'/'+name)));
});
test('build traces exclude exact project-private roots while preserving official assets and similarly named external paths',()=>{
 const root=mkdtempSync(join(process.cwd(),'tmp/assumption-approval/traces-')),trace=join(root,'.next/server/app/api/scenario-simulate/route.js.nft.json');mkdirSync(dirname(trace),{recursive:true});
 const paths=['data/derived/agents/accepted-private/run.json','data/synthetic/citizens.json','tmp/ledger.json','data/employment/original.csv','node_modules/tmp/index.js','data/synthetic-public/catalogue.json'];
 writeFileSync(trace,JSON.stringify({version:1,files:paths.map(p=>relative(dirname(trace),join(root,p)))}));
 assert.deepEqual(sanitizeBuildTraces(root),{manifests:1,removed:3});
 const retained=JSON.parse(readFileSync(trace,'utf8')).files;assert.equal(retained.length,3);assert.ok(retained.some((p:string)=>p.includes('employment')));assert.ok(retained.some((p:string)=>p.includes('node_modules')));assert.ok(retained.some((p:string)=>p.includes('synthetic-public')));
 assert.deepEqual(sanitizeBuildTraces(root),{manifests:1,removed:0});
});
