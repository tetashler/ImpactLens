import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';
import {calculateControlledMrtComparison,controlledMrtResponse} from '../../server/controlled-mrt.ts';
import {transportCitizen,transportDataset,transportReference} from './citizen-transport-fixture.ts';
import {baselineFixture,proposalFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';
import {calculateCitizenImpact,getPrivateCitizenImpact} from '../../server/citizen-grounding/api.ts';

const request=()=>({version:1 as const,serviceDate:'2026-10-27',intervention:proposalFixture(),optionB:{waitingTimeSeconds:60},sensitivity:{lowWaitingTimeSeconds:0,highWaitingTimeSeconds:120}});
const deps=()=>({dataset:()=>transportDataset(),baseline:()=>baselineFixture(),demand:()=>transportReference,access:()=>({sourceHash:'e'.repeat(64),points:{}})});
const post=(body:unknown=request(),headers:Record<string,string>={},url='http://localhost/api/experiments/mrt-comparison')=>new Request(url,{method:'POST',headers:{'content-type':'application/json',...headers},body:JSON.stringify(body)});

test('controlled comparison pins private inputs once and calculates full weighted cohort beyond display samples',async()=>{
 const data=transportDataset([...Array.from({length:34},(_,i)=>transportCitizen('bus-'+i,{weight:3,travelMode:'bus'})),transportCitizen('rail',{weight:2}),transportCitizen('unknown',{weight:5,workplaceProxy:null})]),graph=baselineFixture(),before=structuredClone({data,graph}),calls={dataset:0,baseline:0,demand:0,access:0};
 const result=await calculateControlledMrtComparison(request(),{dataset:()=>{calls.dataset++;return data;},baseline:()=>{calls.baseline++;return graph;},demand:()=>{calls.demand++;return transportReference;},access:()=>{calls.access++;return {sourceHash:'e'.repeat(64),points:{}};}});
 assert.deepEqual(calls,{dataset:1,baseline:1,demand:1,access:1});assert.deepEqual({data,graph},before);
 assert.deepEqual(result.commonCohort,{agents:1,weight:2,excludedAgents:35,excludedWeight:107});
 assert.deepEqual(result.options.map(o=>o.common.meanTravelMinutes),[1.5,1,2,3]);assert.ok(result.options.every(o=>o.common.meanBaselineMinutes===5));
 assert.deepEqual(result.comparisons,[{level:'low',differenceMinutesBMinusA:-0.5,preferred:'B'},{level:'base',differenceMinutesBMinusA:0.5,preferred:'A'},{level:'high',differenceMinutesBMinusA:1.5,preferred:'A'}]);assert.equal(result.preferenceChanges,true);
 assert.equal(result.options[0].summary.coverage['not-applicable'].weight,102);assert.equal(result.options[0].summary.coverage.unknown.weight,5);
 const encoded=JSON.stringify(result);for(const privateField of ['PRIVATE_JOB_SENTINEL','PRIVATE_SCHEDULE_SENTINEL','UNKNOWN_PRIVATE_CODE','homeProxy','workplaceProxy','stationMappings','citizenId','fieldProvenance'])assert.ok(!encoded.includes(privateField),privateField);
 assert.ok(Object.isFrozen(result.options[0].summary));
});

test('zero cohort stays unknown while identical waits share immutable run identities and ties',async()=>{
 const q=request();q.optionB.waitingTimeSeconds=30;q.sensitivity={lowWaitingTimeSeconds:30,highWaitingTimeSeconds:30};
 const tied=await calculateControlledMrtComparison(q,deps());assert.equal(new Set(tied.options.map(o=>o.runId)).size,1);assert.ok(tied.comparisons.every(c=>c.preferred==='tie'&&c.differenceMinutesBMinusA===0));assert.equal(tied.preferenceChanges,false);
 const empty=await calculateControlledMrtComparison(q,{...deps(),dataset:()=>transportDataset([transportCitizen('unknown',{workplaceProxy:null})])});
 assert.deepEqual(empty.commonCohort,{agents:0,weight:0,excludedAgents:1,excludedWeight:10});assert.ok(empty.options.every(o=>Object.values(o.common).every(v=>v===null)));assert.ok(empty.comparisons.every(c=>c.preferred==='unknown'&&c.differenceMinutesBMinusA===null));assert.equal(empty.preferenceChanges,null);
});

test('full coverage preserves newly reachable and unreachable people outside the common ranking cohort',async()=>{
 const graph=baselineFixture();graph.stations.set('Z',{id:'Z',name:'Disconnected fixture',lat:1.5,lon:103.9,parentIds:[],stopIds:[],sourceRows:[],evidence:[],lines:['Z']});graph.aliases.set('Z','Z');graph.states.set('Z|Z',{id:'Z|Z',stationId:'Z',line:'Z'});
 const data=transportDataset([transportCitizen('rail',{weight:2}),transportCitizen('newly',{weight:7,homeProxy:{lat:1.39,lon:103.77,basis:'Hypothetical station proxy',sourceId:'fixture'}}),transportCitizen('unreachable',{weight:11,workplaceProxy:{lat:1.5,lon:103.9,basis:'Disconnected proxy',sourceId:'fixture'}})]);
 const result=await calculateControlledMrtComparison(request(),{...deps(),dataset:()=>data,baseline:()=>graph});
 assert.deepEqual(result.commonCohort,{agents:1,weight:2,excludedAgents:2,excludedWeight:18});assert.ok(result.options.every(o=>o.summary.coverage['newly-reachable'].weight===7&&o.summary.coverage.unreachable.weight===11));assert.deepEqual(result.options.map(o=>o.common.meanTravelMinutes),[1.5,1,2,3]);
 const q=request();q.optionB.waitingTimeSeconds=30;q.sensitivity={lowWaitingTimeSeconds:30,highWaitingTimeSeconds:60};const ties=await calculateControlledMrtComparison(q,deps());assert.deepEqual(ties.comparisons.map(c=>c.preferred),['tie','tie','A']);assert.equal(ties.preferenceChanges,true);
});

test('controlled calculations do not evict the normal two-entry private impact cache',async()=>{
 const input=request(),normal=await calculateCitizenImpact({serviceDate:input.serviceDate,intervention:input.intervention},deps());
 await calculateControlledMrtComparison(input,deps());assert.equal(getPrivateCitizenImpact(normal.run.id),normal);
});

test('snapshot hashes bind actual source context content and isolate trusted caller mutation',async()=>{
 const initial=await calculateControlledMrtComparison(request(),deps()),reference=structuredClone(transportReference),data=transportDataset(),graph=baselineFixture();
 const isolated=await calculateControlledMrtComparison(request(),{dataset:()=>data,baseline:()=>graph,demand:()=>{data.records[0].workplaceProxy=null;graph.costs.initialWaitSeconds=999;return reference;},access:()=>{reference.limitations.push('later caller mutation');return {sourceHash:'e'.repeat(64),points:{}};}});
 assert.deepEqual(isolated,initial);
 const changed=await calculateControlledMrtComparison(request(),{...deps(),demand:()=>({...transportReference,limitations:['Different content, same claimed hash']})});assert.notEqual(changed.snapshot.id,initial.snapshot.id);assert.notEqual(changed.snapshot.sourceSnapshotHash,initial.snapshot.sourceSnapshotHash);
});

test('default transport snapshot reads each source once for all four wait variants',async()=>{
 const paths=['data/transport/origin_destination_train_202609.csv','data/transport/LTAMRTStationExitGEOJSON.geojson','data/transport/mrt-network/stops.txt'],reads=new Map(paths.map(path=>[path,0])),original=fs.readFileSync;
 try{fs.readFileSync=((path:unknown,...args:unknown[])=>{const name=String(path).replaceAll('\\','/');for(const source of paths)if(name.endsWith(source))reads.set(source,reads.get(source)!+1);return Reflect.apply(original,fs,[path,...args]);}) as typeof original;syncBuiltinESMExports();
  const result=await calculateControlledMrtComparison(request(),{dataset:()=>transportDataset(),baseline:()=>baselineFixture()});assert.equal(result.options.length,4);assert.deepEqual([...reads.values()],[1,1,1]);
 }finally{fs.readFileSync=original;syncBuiltinESMExports();}
});

test('bounded endpoint rejects unsupported origins and bodies before private reads and safely returns one response',async()=>{
 let reads=0;const d={...deps(),dataset:()=>{reads++;return transportDataset();}};
 for(const [req,status]of [[post(request(),{origin:'https://attacker.example'}),403],[post(request(),{'sec-fetch-site':'cross-site'}),403],[post(request(),{'content-type':'text/plain'}),415],[post(request(),{'content-length':'20481'}),413],[post(request(),{'content-length':'wrong'}),400],[post({...request(),secret:'PRIVATE'}),400],[post(request(),{},'http://localhost/api/experiments/mrt-comparison?x=1'),400],[post({padding:'x'.repeat(21000)}),413]] as const){assert.equal((await controlledMrtResponse(req,d)).status,status);assert.equal(reads,0);}
 const good=await controlledMrtResponse(post(request(),{origin:'http://localhost'}),d);assert.equal(good.status,200);assert.equal(good.headers.get('Cache-Control'),'no-store');assert.equal((await good.json()).options.length,4);
 const failure=await controlledMrtResponse(post(),{...d,dataset:()=>{throw Error('PRIVATE_STORAGE_DETAIL');}});assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('PRIVATE_STORAGE_DETAIL'));
 const method=await controlledMrtResponse(new Request('http://localhost/api/experiments/mrt-comparison'),d);assert.equal(method.status,405);
});

test('process calculation guard prevents overlapping batches and releases after failure',async()=>{
 let release!:()=>void;const pending=controlledMrtResponse(post(),{...deps(),dataset:()=>new Promise(resolve=>{release=()=>resolve(transportDataset());})});
 for(let i=0;i<20&&!release;i++)await new Promise(resolve=>setImmediate(resolve));assert.ok(release);
 const busy=await controlledMrtResponse(post(),deps());assert.equal(busy.status,429);release();assert.equal((await pending).status,200);
 assert.equal((await controlledMrtResponse(post(),{...deps(),baseline:()=>{throw Error('private failure');}})).status,503);
 assert.equal((await controlledMrtResponse(post(),deps())).status,200);
});
