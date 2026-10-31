import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync,mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {join,resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {getCitizenDataset,getCitizenGenerationInputs,persistCitizenDataset,loadCitizenDataset} from '../../server/citizen-grounding/data.ts';
import {loadOfficialTables,OFFICIAL_PINS,citizenManifestSourcesV1} from '../../citizen-grounding/official.ts';
import {buildPopulation} from '../../server/population/store.ts';
import {buildCitizenDataset} from '../../citizen-grounding/generator.ts';
import {canonical} from '../../experiments/validation.ts';
const hash=(b:Uint8Array)=>createHash('sha256').update(b).digest('hex');
test('four actual official snapshots match independent source pins and retain original schema/unknowns',()=>{const t=loadOfficialTables();assert.equal(t.sources.length,4);for(const source of t.sources){assert.equal(hash(readFileSync(source.path)),OFFICIAL_PINS[source.id as keyof typeof OFFICIAL_PINS]);assert.equal(source.referenceYear,2020);assert.equal(source.columns[0],'Number');assert.ok([32,48].includes(source.rows));}assert.ok(t.commuting.some(r=>r.count===null));assert.ok(t.occupations.some(r=>r.count===null));assert.ok(t.commuting.some(r=>r.region==='north-east-region'&&r.category==='total'));});
test('actual national citizen sidecar has stable base identity, coherent assignments and reproducible hash',()=>{const population=buildPopulation({size:10000,seed:'impactlens-society-v1'}),d=getCitizenDataset();assert.equal(d.records.length,10000);assert.equal(d.populationId,population.id);assert.deepEqual(d.records.map(r=>r.id),population.population.citizens.map(c=>c.id));assert.equal(d.records.reduce((n,r)=>n+r.weight,0),population.population.citizens.reduce((n,r)=>n+r.weight,0));assert.ok(d.records.some(r=>r.labourForceStatus==='employed'&&r.workplaceArea&&r.schedule));assert.ok(d.records.some(r=>r.travelMode==='rail'));assert.ok(d.records.some(r=>r.travelMode==='rail-bus'));assert.ok(d.records.some(r=>r.labourForceStatus==='unemployed'));assert.ok(d.records.some(r=>r.preferredAccessStationId));assert.ok(d.manifest.calibration.every(c=>c.withinTolerance!==false));const again=buildCitizenDataset(population,getCitizenGenerationInputs());assert.equal(d.id,again.id);assert.deepEqual(d,again);});
test('snapshot persistence is immutable, bound to base population and refuses tampering/invalid paths',()=>{const d=getCitizenDataset(),directory=mkdtempSync(join(process.cwd(),'tmp','citizen-data-test-'));try{assert.equal(persistCitizenDataset(d,directory),d.id);assert.equal(persistCitizenDataset(d,directory),d.id);assert.deepEqual(loadCitizenDataset(d.id,directory),d);const path=join(directory,d.id+'.json'),before=readFileSync(path);writeFileSync(path,'{}');assert.throws(()=>persistCitizenDataset(d,directory),/CITIZEN/);assert.deepEqual(readFileSync(path),Buffer.from('{}'));assert.throws(()=>loadCitizenDataset(d.id,directory));assert.throws(()=>loadCitizenDataset('../outside',directory));assert.ok(before.length>0);}finally{assert.ok(resolve(directory).startsWith(resolve(process.cwd(),'tmp')+requireSeparator()));rmSync(directory,{recursive:true,force:true});}});
function requireSeparator(){return process.platform==='win32'?'\\':'/';}

test('relocated official sources use employment storage while citizen v1 retains its accepted provenance identity',()=>{
 const tables=loadOfficialTables();
 for(const source of tables.sources)assert.equal(source.path,'data/employment/singstat-census2020-'+source.id+'/original.csv');
 const d=getCitizenDataset();
 assert.equal(hash(Buffer.from(canonical(d.manifest.sources))),'b7d1611a2992172ae1e8ab03978b72268f1c7ff06781accb158512dab3352a12');
 assert.equal(d.id,'citizens-127577cd81ceb3342fd1103b9acb0b182683d795039737e548f15067f793f62c');
});

test('retired metadata locations cannot enable an old-directory filesystem fallback',()=>{
 assert.throws(()=>loadOfficialTables((id,kind)=>{
  const directory=join('data/employment/singstat-census2020-'+id);
  if(kind==='csv')return readFileSync(join(directory,'original.csv'));
  const meta=JSON.parse(readFileSync(join(directory,'source-metadata.json'),'utf8'));
  meta.path='docs/datasets/singstat-census2020-'+id+'/original.csv';
  return JSON.stringify(meta);
 }),/CITIZEN_OFFICIAL_METADATA/);
});

test('relocation preserves the existing synthetic snapshot, manifest bytes and calibration without rewriting them',()=>{
 const id='citizens-127577cd81ceb3342fd1103b9acb0b182683d795039737e548f15067f793f62c',snapshotPath=join('data/synthetic',id+'.json'),manifestPath=join('data/synthetic',id+'.manifest.json');
 const beforeSnapshot=existsSync(snapshotPath)?readFileSync(snapshotPath):null,beforeManifest=existsSync(manifestPath)?readFileSync(manifestPath):null;
 const current=getCitizenDataset(),snapshot=Buffer.from(JSON.stringify(current)),manifest=Buffer.from(JSON.stringify(current.manifest,null,2));
 assert.equal(current.id,id);assert.equal(hash(snapshot),'6931c331515133f14511e20b2821ef1eac3983e63c4fee1564ecd5242675e65b');
 assert.equal(hash(manifest),'890f1197561912daef6a8a8bf033d0e6530a105553278102cbd1907da6fadbd8');
 assert.equal(current.manifest.calibration.length,1403);assert.equal(current.manifest.calibration.filter(c=>c.withinTolerance===true).length,1369);assert.equal(current.manifest.calibration.filter(c=>c.withinTolerance===null).length,34);
 if(beforeSnapshot)assert.deepEqual(readFileSync(snapshotPath),beforeSnapshot);else assert.equal(existsSync(snapshotPath),false);
 if(beforeManifest)assert.deepEqual(readFileSync(manifestPath),beforeManifest);else assert.equal(existsSync(manifestPath),false);
});
test('official metadata cannot substitute a different official publication identity',()=>{assert.throws(()=>loadOfficialTables((id,kind)=>{const path=join('data/employment/singstat-census2020-'+id,kind==='metadata'?'source-metadata.json':'original.csv');if(kind==='csv')return readFileSync(path);const meta=JSON.parse(readFileSync(path,'utf8'));meta.publicationUrl='https://data.gov.sg/datasets/d_5b38192e9c6f8d2c5f38c70939c76e71/view';return JSON.stringify(meta);}),/CITIZEN_OFFICIAL_METADATA/);});
test('snapshot restoration requires the companion manifest to match its immutable embedded provenance',()=>{const directory=mkdtempSync(join(process.cwd(),'tmp','citizen-data-test-'));try{const d=getCitizenDataset();persistCitizenDataset(d,directory);writeFileSync(join(directory,d.id+'.manifest.json'),'{}');assert.throws(()=>loadCitizenDataset(d.id,directory),/CITIZEN_MANIFEST/);}finally{assert.ok(resolve(directory).startsWith(resolve(process.cwd(),'tmp')+requireSeparator()));rmSync(directory,{recursive:true,force:true});}});
test('official reader dependency receives exactly the eight allowlisted inputs and preserves accepted source identity',()=>{const reads:string[]=[],t=loadOfficialTables((id,kind)=>{reads.push(id+':'+kind);return readFileSync(join('data/employment/singstat-census2020-'+id,kind==='metadata'?'source-metadata.json':'original.csv'));});assert.deepEqual(reads,['ct17565:metadata','ct17565:csv','ct17586:metadata','ct17586:csv','ct17594:metadata','ct17594:csv','ct17582:metadata','ct17582:csv']);assert.equal(hash(Buffer.from(canonical(citizenManifestSourcesV1(t.sources)))),'b7d1611a2992172ae1e8ab03978b72268f1c7ff06781accb158512dab3352a12');assert.deepEqual(t,loadOfficialTables());});
test('official metadata cannot turn a trusted reader into arbitrary path discovery',()=>{const reads:string[]=[];assert.throws(()=>loadOfficialTables((id,kind)=>{reads.push(id+':'+kind);assert.equal(kind,'metadata');const m=JSON.parse(readFileSync(join('data/employment/singstat-census2020-'+id,'source-metadata.json'),'utf8'));m.path='data/derived/agents/accepted-private/unapproved.json';return JSON.stringify(m);}),/CITIZEN_OFFICIAL_METADATA/);assert.deepEqual(reads,['ct17565:metadata']);});
