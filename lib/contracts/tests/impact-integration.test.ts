import test from 'node:test';
import assert from 'node:assert/strict';
import { illustrativeLine } from '../../../prototype/mrt/examples/illustrative-line.ts';
import { parseCitizenProfile, parseCitizenSimulation } from '../citizen-simulation.ts';
import { runImpactFromLocalData } from '../../server/population-impact-service.ts';
import { illustrativeDemand } from '../../../prototype/agents/impact/example.ts';
import * as contract from '../../impact/api-contract.ts';
import type { ImpactRequest } from '../../impact/api-contract.ts';
import * as service from '../../server/impact-api-service.ts';
import * as lifecycle from '../../impact/lifecycle.ts';
import * as route from '../../../app/api/impact/route.ts';
import * as profiles from '../../../app/api/impact/profile/route.ts';
import { parseCitizenViewPair } from '../../citizens/data.ts';
import { citizenViewPairFixture } from '../../citizens/fixtures.ts';

const request=():ImpactRequest=>({serviceDate:'2026-10-27',intervention:structuredClone(illustrativeLine),assumptionSetId:'illustrative-cck-demand',participationRate:0.8,population:{size:2000,seed:'phase4c-demo'},thresholdMinutes:30,renderLimit:30});
let initial: Promise<any> | undefined;
const result=()=>initial??=service.calculateImpact(request());
const http=(body:unknown)=>new Request('http://localhost/api/impact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});

test('request validation accepts actual editor intervention and rejects unbounded settings',()=>{
  assert.equal(contract.parseImpactRequest(request()).intervention.id,'HYP_NORTH_LINK');
  for(const patch of [{population:{size:5001,seed:'x'}},{population:{size:0,seed:'x'}},{population:{size:2000,seed:''}},{renderLimit:151},{renderLimit:-1},{thresholdMinutes:Infinity},{thresholdMinutes:-1},{participationRate:2},{assumptionSetId:'observed-commuting'},{serviceDate:'2026-02-30'},{rawGtfs:[]}]) {
    assert.throws(()=>contract.parseImpactRequest({...request(),...patch}));
  }
  const tooMany=request();tooMany.intervention.stations=Array(41).fill(tooMany.intervention.stations[0]);
  assert.throws(()=>contract.parseImpactRequest(tooMany));
});

test('canonical request identity ignores object-key order but detects every meaningful setting',async()=>{
  const first=request();const second={...first,intervention:{...first.intervention,assumptions:{...first.intervention.assumptions}}};
  assert.equal(await contract.fingerprintImpactRequest(first),await contract.fingerprintImpactRequest(second));
  for(const change of [ (p:any)=>p.intervention.segments[0].runSeconds++, (p:any)=>p.intervention.stations.reverse(), (p:any)=>p.intervention.stations[1].lat+=0.001, (p:any)=>p.serviceDate='2026-10-31', (p:any)=>p.participationRate=0.7, (p:any)=>p.population.seed='different', (p:any)=>p.population.size=1000, (p:any)=>p.thresholdMinutes=20 ]) {
    const p:any=structuredClone(first);change(p);
    assert.notEqual(await contract.fingerprintImpactRequest(first),await contract.fingerprintImpactRequest(p));
  }
});

test('real Phase 4C engine produces compact full-weight results with no fabricated coordinates',async()=>{
  const response=await result();const parsed=await contract.parseImpactResponse(JSON.parse(JSON.stringify(response)),request());
  assert.doesNotThrow(()=>parseCitizenSimulation(parsed.payload));
  assert.equal(parsed.payload.metadata.population.agentCount,2000);
  assert.ok(Math.abs(parsed.metrics[0].coverage.representedPopulation-192150)<1e-6);
  assert.equal(parsed.metrics[0].coverage.assignedPopulation,parsed.metrics[0].coverage.comparablePopulation);
  // Raw CSV byte hashes intentionally influence synthetic IDs and seeded assignments.
  // Compare the real API adapter with the independent CLI/service loading path on these same bytes.
  const direct=runImpactFromLocalData({size:2000,seed:'phase4c-demo',planningAreas:['Choa Chu Kang']},illustrativeLine,{assumptions:illustrativeDemand,thresholdMinutes:30,renderLimit:30});
  assert.deepEqual(parsed.metrics,direct.metrics);
  assert.equal(parsed.payload.citizens.length,30);
  assert.deepEqual(parsed.payload.animations,[]);
  assert.equal(parsed.diagnostics.uniqueOdPairs,3);
  assert.equal(parsed.diagnostics.routingCalls,1);
  assert.deepEqual(Object.keys(parsed).sort(),['diagnostics','distributionalDifferences','identity','metrics','payload','version']);
});

test('same current proposal reproduces numbers and reducing display sample preserves all metrics',async()=>{
  const first=await result(),second=await service.calculateImpact(request());
  assert.deepEqual(first,second);
  const smaller={...request(),renderLimit:5};const third=await service.calculateImpact(smaller);
  assert.equal(third.payload.citizens.length,5);
  assert.deepEqual(third.metrics,first.metrics);
  assert.equal(third.identity.runId,first.identity.runId);
  assert.notEqual(third.identity.requestId,first.identity.requestId);
});

test('edited segment produces a new run and different savings for affected assumed journeys',async()=>{
  const previous=await result(),edited=request();edited.intervention.segments[0].runSeconds=600;
  const next=await service.calculateImpact(edited);
  assert.notEqual(next.identity.requestId,previous.identity.requestId);
  assert.notEqual(next.identity.runId,previous.identity.runId);
  assert.ok(next.metrics[0].weightedMeanMinutesSaved!==null);
  assert.ok(next.metrics[0].weightedMeanMinutesSaved<previous.metrics[0].weightedMeanMinutesSaved);
  await assert.rejects(()=>contract.parseImpactResponse(next,request()));
});

test('response validation rejects altered scalar outcomes, denominators and cross-scenario identity',async()=>{
  const original=await result();
  for(const mutate of [ (p:any)=>p.identity.requestId='0'.repeat(64), (p:any)=>p.payload.metadata.simulationDate='2026-10-31', (p:any)=>p.metrics[0].coverage.comparablePopulation++, (p:any)=>p.metrics[0].benefiting.denominatorPopulation++, (p:any)=>p.metrics[0].accessibility.scenario.value=0, (p:any)=>p.distributionalDifferences[0].meanMinutesSavedDifferenceFromOverall=999, (p:any)=>p.rawGraph={} ]) {
    const changed=structuredClone(original);mutate(changed);
    await assert.rejects(()=>contract.parseImpactResponse(changed,request()));
  }
});

test('run-bound profile lookup includes full-population IDs outside the display subset',async()=>{
  const response=await service.calculateImpact(request());
  const shown=new Set(response.payload.citizens.map((c:any)=>c.agentId));
  const prefix=response.payload.citizens[0].agentId.replace(/\d+$/,'');
  const other=Array.from({length:2000},(_,i)=>prefix+(i+1)).find(id=>!shown.has(id))!;
  const selected=service.getImpactProfile(response.identity.runId,response.identity.requestId,other);
  assert.equal(selected.profile.citizen.agentId,other);
  assert.equal(selected.profile.animation,null);
  assert.doesNotThrow(()=>parseCitizenProfile(selected.profile));
  assert.doesNotThrow(()=>contract.parseImpactProfileResponse(selected,response));
  assert.throws(()=>service.getImpactProfile(response.identity.runId,'0'.repeat(64),other));
  assert.throws(()=>service.getImpactProfile(response.identity.runId,response.identity.requestId,'syn-0000000000000000-1'));
});

test('profile HTTP rejects unknown, mismatched and expired run contexts safely',async()=>{
  const response=await service.calculateImpact(request());const agentId=response.payload.citizens[0].agentId;
  const url=(runId:string,requestId:string,id:string)=>new Request(`http://localhost/api/impact/profile?runId=${runId}&requestId=${requestId}&agentId=${id}`);
  assert.equal((await profiles.GET(url(response.identity.runId,response.identity.requestId,agentId))).status,200);
  assert.equal((await profiles.GET(url(response.identity.runId,'0'.repeat(64),agentId))).status,409);
  assert.equal((await profiles.GET(url('impact-'+'0'.repeat(24),'1'.repeat(64),agentId))).status,410);
  assert.equal((await profiles.GET(url(response.identity.runId,response.identity.requestId,'syn-0000000000000000-1'))).status,404);
  assert.equal((await profiles.GET(url(response.identity.runId,response.identity.requestId,'real-person'))).status,400);
});

test('profile cache evicts old runs and expires them without retaining unbounded populations',async()=>{
  let now=0;const cache=new service.ImpactRunCache(2,100,()=>now);
  const response=await result();
  for(let n=0;n<3;n++)cache.put({...response,identity:{...response.identity,requestId:String(n).repeat(64)}},()=>null);
  assert.equal(cache.size,2);
  assert.throws(()=>cache.get(response.identity.runId,'0'.repeat(64)));
  now=101;
  assert.throws(()=>cache.get(response.identity.runId,'2'.repeat(64)));
  assert.equal(cache.size,0);
});

test('invalid JSON, oversized bodies and invalid proposals produce controlled HTTP errors',async()=>{
  for(const body of [null,{}, {...request(),population:{size:999999,seed:'x'}}])assert.equal((await route.POST(http(body))).status,400);
  const bad=request();bad.intervention.segments[0].runSeconds=-1;
  assert.equal((await route.POST(http(bad))).status,400);
  assert.equal((await route.POST(new Request('http://localhost/api/impact',{method:'POST',headers:{'Content-Type':'application/json'},body:'{'}))).status,400);
  assert.equal((await route.POST(new Request('http://localhost/api/impact',{method:'POST',headers:{'Content-Type':'application/json'},body:' '.repeat(17000)}))).status,413);
});

test('no participation remains unknown with null savings rather than zero impact',async()=>{
  const req={...request(),participationRate:0,renderLimit:5};const response=await service.calculateImpact(req);
  const overall=response.metrics[0];
  assert.ok(Math.abs(overall.coverage.unassignedPopulation-192150)<1e-6);
  assert.equal(overall.coverage.comparablePopulation,0);
  assert.equal(overall.weightedMeanMinutesSaved,null);
  assert.equal(overall.benefiting.value,null);
  const profile=service.getImpactProfile(response.identity.runId,response.identity.requestId,response.payload.citizens[0].agentId).profile;
  assert.equal(profile.journey?.assignment,'unassigned');assert.equal(profile.journey?.comparison,null);
});

test('revision gate cancels old requests and rejects late responses after edits or reruns',()=>{
  const gate=new lifecycle.ImpactRevisionGate();const first=gate.begin('proposal-a');
  assert.equal(gate.accepts(first,'proposal-a'),true);
  gate.invalidate();assert.equal(first.controller.signal.aborted,true);assert.equal(gate.accepts(first,'proposal-a'),false);
  const second=gate.begin('proposal-b');assert.equal(gate.accepts(second,'proposal-a'),false);
  const third=gate.begin('proposal-b');assert.equal(second.controller.signal.aborted,true);
  assert.equal(gate.accepts(second,'proposal-b'),false);assert.equal(gate.accepts(third,'proposal-b'),true);
});

test('presentation selects comparison side without modifying quantitative data or making a view pair',async()=>{
  const response=await result();const journey=response.payload.journeys.find((j:any)=>j.comparison?.minutesSaved>0);
  const original=JSON.stringify(response);
  assert.equal(lifecycle.journeySide(journey,'baseline').minutes,journey.comparison.baselineMinutes);
  assert.equal(lifecycle.journeySide(journey,'scenario').minutes,journey.comparison.scenarioMinutes);
  assert.deepEqual(lifecycle.journeySide({id:'unassigned',agentId:'syn-0123456789abcdef-1',assignment:'unassigned',assumptionIds:[],comparison:null},'scenario'),{status:'unassigned',minutes:null});
  assert.equal(JSON.stringify(response),original);assert.deepEqual(response.payload.animations,[]);
});

test('imported visual view pairs reject mixed proposal, service date, scenario and coverage context',()=>{
  for(const change of [ (p:any)=>p.scenario.metadata.scenarioId='other-scenario', (p:any)=>p.scenario.metadata.intervention.id='OTHER_LINE', (p:any)=>p.scenario.metadata.simulationDate='2026-10-31', (p:any)=>p.scenario.metadata.coverage.planningAreas.push('choa-chu-kang') ]) {
    const pair=structuredClone(citizenViewPairFixture);change(pair);assert.throws(()=>parseCitizenViewPair(pair));
  }
});
