import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFileSync, mkdtempSync, mkdirSync, copyFileSync, appendFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve, sep } from 'node:path';
import * as api from '../../../lib/eldercare/api-contract.ts';
import * as service from '../../../lib/server/eldercare-service.ts';
import { GET } from '../../../app/api/eldercare/facilities/route.ts';
import { POST } from '../../../app/api/eldercare/simulate/route.ts';

const request=()=>api.createDefaultEldercareRequest('request-1');
const http=(body:unknown,contentType='application/json')=>new Request('http://localhost/api/eldercare/simulate',{method:'POST',headers:{'Content-Type':contentType},body:JSON.stringify(body)});

test('facilities endpoint returns only corroborated AACs, historical evidence and named coordinates',async()=>{
  const r=await GET(new Request('http://localhost/api/eldercare/facilities'));
  assert.equal(r.status,200);assert.equal(r.headers.get('cache-control'),'no-store');
  const p=api.parseFacilitiesResponse(await r.json());
  assert.equal(p.summary.historicalPoints,133);assert.equal(p.summary.corroboratedAac,4);assert.equal(p.summary.unknownServicePoints,129);assert.equal(p.summary.aacCareIncluded,0);
  const f=p.facilities.find(f=>f.id==='kml_6')!;assert.equal(f.position.lon,103.826839535636);assert.equal(f.position.lat,1.28170700809748);
  assert.equal(f.recordUpdated,'20160728192327');assert.equal(f.capacity,null);assert.equal(f.openedOn,null);assert.equal(f.operationStatus,'listed-unconfirmed');assert.ok(f.corroboration);
  assert.equal(p.source.catalogueUpdated,'2024-06-06');assert.ok(JSON.stringify(p).length<20000);
});
test('versioned request bounds reject unsupported scope, service and unbounded values',()=>{
  assert.doesNotThrow(()=>api.parseEldercareApiRequest(request()));
  for(const patch of [{version:2},{preset:'singapore'},{population:{size:5001,seed:'x'}},{population:{size:1,seed:'x'}},{population:{size:2000,seed:''}},{origins:[]},{renderLimit:10},{dataRoot:'C:/private'},{clientRequestId:'x'.repeat(65)}])assert.throws(()=>api.parseEldercareApiRequest({...request(),...patch}));
  for(const options of [{minimumAge:62},{thresholdsMetres:[]},{thresholdsMetres:Array.from({length:9},(_,i)=>i)},{thresholdsMetres:[5001]},{thresholdsMetres:[NaN]},{straightLineWalkingMetresPerSecond:0.01},{referenceDate:'2026-02-30'}])assert.throws(()=>api.parseEldercareApiRequest({...request(),options:{...request().options,...options}}));
  const p=request();p.intervention.serviceType='aac-care' as never;assert.throws(()=>api.parseEldercareApiRequest(p));
  p.intervention.serviceType='aac';p.intervention.position={lat:103.8,lon:1.3};assert.throws(()=>api.parseEldercareApiRequest(p));
});
test('fingerprint ignores key order and client attempt token, preserves calculation settings',async()=>{
  const p=request(),first=await api.fingerprintEldercareRequest(p);
  assert.equal(await api.fingerprintEldercareRequest({...p,clientRequestId:'request-2'}),first);
  assert.equal(await api.fingerprintEldercareRequest(Object.fromEntries(Object.entries(p).reverse())),first);
  for(const mutate of [(r:typeof p)=>r.intervention.position.lon+=0.001,(r:typeof p)=>r.options.thresholdsMetres=[400],(r:typeof p)=>r.population.seed='other',(r:typeof p)=>r.population.size=1000,(r:typeof p)=>r.options.existingAvailability='exclude-unconfirmed']){const next=structuredClone(p);mutate(next);assert.notEqual(await api.fingerprintEldercareRequest(next),first);}
});
test('simulation endpoint invokes real engine and agrees exactly with CLI on matching source bytes',async()=>{
  const r=await POST(http(request()));assert.equal(r.status,200);
  const p=await api.parseEldercareApiResponse(await r.json(),request());
  const cli=spawnSync(process.execPath,['prototype/eldercare/cli.ts','--json'],{encoding:'utf8'});assert.equal(cli.status,0,cli.stderr);
  assert.deepEqual(p.result,JSON.parse(cli.stdout));
  assert.ok(Math.abs(p.result.metrics[0].population-44520)<1e-6);assert.ok(Math.abs(p.result.metrics[0].unlocatedPopulation-38290)<1e-6);
  assert.equal(p.result.comparisons.length,2);assert.equal(p.result.provenance.population.referenceYear,2020);
  assert.equal(p.identity.clientRequestId,'request-1');assert.equal(p.identity.scenarioId,p.result.scenarioId);
});
test('repeat requests reproduce calculations; edits change scenario and stale envelopes are rejected',async()=>{
  const a=await service.calculateEldercare(request()),b=await service.calculateEldercare({...request(),clientRequestId:'request-2'});
  assert.deepEqual(a.result,b.result);assert.equal(a.identity.requestFingerprint,b.identity.requestFingerprint);
  await assert.rejects(()=>api.parseEldercareApiResponse(a,{...request(),clientRequestId:'request-2'}));
  const moved=request();moved.intervention.position.lon+=0.003;
  const next=await service.calculateEldercare(moved);assert.notEqual(next.identity.scenarioId,a.identity.scenarioId);assert.notDeepEqual(next.result.comparisons,a.result.comparisons);
  await assert.rejects(()=>api.parseEldercareApiResponse(next,request()));
});
test('threshold and capacity changes preserve engine semantics and identity',async()=>{
  const original=await service.calculateEldercare(request()),threshold=request();threshold.options.thresholdsMetres=[400];
  const next=await service.calculateEldercare(threshold);assert.notEqual(original.identity.scenarioId,next.identity.scenarioId);assert.ok(Math.abs(next.result.metrics[0].thresholds[0].newlyWithinPopulation-3890)<1e-6);
  const cap=request();cap.intervention.capacity={users:100,basis:'illustrative-assumption',rationale:'Explicit API fixture.'};
  const capacity=await service.calculateEldercare(cap);assert.notEqual(capacity.identity.scenarioId,original.identity.scenarioId);assert.deepEqual(capacity.result.metrics,original.result.metrics);assert.equal(capacity.result.capacity.serviceAllocation,'not-modelled');assert.equal(capacity.result.capacity.existingTotal,null);
});
test('media, malformed JSON, nested input and streamed bytes return controlled HTTP errors',async()=>{
  assert.equal((await POST(http(request(),'text/plain'))).status,415);
  assert.equal((await POST(new Request('http://localhost/api/eldercare/simulate',{method:'POST',body:'{}'}))).status,415);
  assert.equal((await POST(http(request(),'application/jsonp'))).status,415);
  for(const body of ['{',JSON.stringify({a:{b:{c:{d:{e:{f:{g:{h:{i:{j:{k:{l:{m:1}}}}}}}}}}}}}),JSON.stringify({version:1})])assert.equal((await POST(new Request('http://localhost/api/eldercare/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body}))).status,400);
  const large=new Request('http://localhost/api/eldercare/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:' '.repeat(16385)});
  assert.equal((await POST(large)).status,413);
  assert.equal((await POST(new Request('http://localhost/api/eldercare/simulate',{method:'POST',headers:{'Content-Type':'application/json','Content-Length':'16385'},body:'{}'}))).status,413);
  const failure=service.eldercareError(new Error('C:/Users/private .env.local secret'));assert.equal(failure.status,500);assert.doesNotMatch(await failure.text(),/Users|secret|\.env|stack/);
});
test('unknown HTTP fields and query parameters do not enable filesystem or origin access',async()=>{
  for(const body of [null,{}, {...request(),filename:'C:/private'}, {...request(),origins:[{lat:1.3,lon:103.8}]}, {...request(),population:{size:999999,seed:'x'}}])assert.equal((await POST(http(body))).status,400);
  assert.equal((await GET(new Request('http://localhost/api/eldercare/facilities?all=true'))).status,400);
});
test('hypothetical IDs colliding with any source record are invalid requests',async()=>{
  for(const id of ['kml_6','kml_1']){
    const p=request();p.intervention.id=id;const response=await POST(http(p));
    assert.equal(response.status,400);assert.equal((await response.json()).error.code,'INVALID_REQUEST');
  }
});
test('responses and source caches are detached, and raw files remain unchanged',async()=>{
  const file='data/facilities/EldercareServices.geojson',hash=()=>createHash('sha256').update(readFileSync(file)).digest('hex'),before=hash();
  const c=service.getEldercareFacilities();c.facilities[0].name='changed';assert.notEqual(service.getEldercareFacilities().facilities[0].name,'changed');
  const r=await service.calculateEldercare(request());r.result.metrics[0].population=0;assert.notEqual((await service.calculateEldercare(request())).result.metrics[0].population,0);
  assert.equal(hash(),before);assert.doesNotMatch(JSON.stringify(service.getEldercareFacilities()),/ONEMAP_API_KEY|GEMINI_API_KEY|LTA_DATAMALL_API_KEY|rawCensus|rawGtfs/);
});
test('browser API contract imports without server modules',()=>{
  const url=new URL('../../../lib/eldercare/api-contract.ts',import.meta.url).href;
  const code=`import {registerHooks,builtinModules} from 'node:module';registerHooks({resolve(s,c,next){if(s.startsWith('node:')||builtinModules.includes(s))throw new Error('Node import');return next(s,c);}});const c=await import(${JSON.stringify(url)});await c.fingerprintEldercareRequest(c.createDefaultEldercareRequest('browser'));`;
  const p=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8'});assert.equal(p.status,0,p.stderr);
});
test('streamed byte limit counts UTF-8 bytes and cancels oversized readers',async()=>{
  let cancelled=false;
  const stream=new ReadableStream<Uint8Array>({start(controller){controller.enqueue(new Uint8Array(8192));controller.enqueue(new Uint8Array(8193));},cancel(){cancelled=true;}});
  const req=new Request('http://localhost/api/eldercare/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:stream,duplex:'half'} as RequestInit & {duplex:'half'});
  assert.equal((await POST(req)).status,413);assert.equal(cancelled,true);
  const unicode=new Request('http://localhost/api/eldercare/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify('中'.repeat(6000))});
  assert.equal((await POST(unicode)).status,413);
  const badUtf8=new Request('http://localhost/api/eldercare/simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:new Uint8Array([0xff])});
  assert.equal((await POST(badUtf8)).status,400);
});
test('maximum supported population/threshold settings stay within response budget',async()=>{
  const p=request();p.population.size=5000;p.options.thresholdsMetres=[0,100,400,500,1000,2000,3000,5000];p.options.straightLineWalkingMetresPerSecond=0.1;
  const r=await POST(http(p));assert.equal(r.status,200);const body=await r.text();
  assert.ok(new TextEncoder().encode(body).byteLength<=api.ELDERCARE_API_LIMITS.responseBytes);
  const response=await api.parseEldercareApiResponse(JSON.parse(body),p);assert.equal(response.result.options.thresholdsMetres.length,8);
});
test('API envelope rejects altered request identity and cross-scenario echoes',async()=>{
  const original=await service.calculateEldercare(request());
  for(const mutate of [
    (p:typeof original)=>{p.identity.requestFingerprint='0'.repeat(64);},
    (p:typeof original)=>{p.identity.scenarioId='eldercare-'+'0'.repeat(24);},
    (p:typeof original)=>{p.request.intervention.position.lat+=0.001;},
    (p:typeof original)=>{p.result.provenance.populationSeed='changed';},
    (p:typeof original)=>{p.limitations=[];},
  ]) {const p=structuredClone(original);mutate(p);await assert.rejects(()=>api.parseEldercareApiResponse(p,request()));}
});
test('source cache reloads changed bytes and preserves geographic metrics without touching originals',async()=>{
  const originalRoot=process.cwd(),tempBase=resolve(tmpdir()),tempRoot=mkdtempSync(join(tempBase,'impactlens-eldercare-api-'));
  const paths=['data/facilities/EldercareServices.geojson','data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv','data/transport/mrt-network/stops.txt','data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson'];
  const originalHash=createHash('sha256').update(readFileSync(paths[1])).digest('hex');
  try{
    for(const p of paths){const target=join(tempRoot,p);mkdirSync(dirname(target),{recursive:true});copyFileSync(join(originalRoot,p),target);}
    process.chdir(tempRoot);
    const before=await service.calculateEldercare(request());
    appendFileSync(paths[1],'\n');
    const after=await service.calculateEldercare(request());
    assert.notEqual(after.result.provenance.population.rawSha256,before.result.provenance.population.rawSha256);
    assert.notEqual(after.identity.scenarioId,before.identity.scenarioId);assert.deepEqual(after.result.metrics,before.result.metrics);
  }finally{
    process.chdir(originalRoot);
    // Delete only the unique task-owned directory under the resolved temporary root.
    assert.ok(resolve(tempRoot).startsWith(tempBase+sep+'impactlens-eldercare-api-'));
    rmSync(tempRoot,{recursive:true,force:true});
  }
  assert.equal(createHash('sha256').update(readFileSync(paths[1])).digest('hex'),originalHash);
});
