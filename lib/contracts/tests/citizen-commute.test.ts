import {test} from 'node:test';
import assert from 'node:assert/strict';
import {calculateCitizenCommutes,validateCitizenCommuteRun} from '../../citizen-grounding/commute.ts';
import {validateCitizenCommuteFact} from '../../citizen-grounding/commute-contract.ts';
import type {CitizenDataset,CitizenRecord} from '../../citizen-grounding/contract.ts';
import {baselineFixture,proposalFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';
import {shortestPath} from '../../../prototype/mrt/routing.ts';
import {addHypotheticalLine} from '../../../prototype/mrt/scenario.ts';
import {getBaseline} from '../../server/mrt-service.ts';
import {illustrativeLine} from '../../../prototype/mrt/examples/illustrative-line.ts';
import {loadTransportDemandReference,loadStationAccessPoints} from '../../server/citizen-grounding/transport-data.ts';

function resident(id='citizen-1',overrides:Partial<CitizenRecord>={}):CitizenRecord{return {id,weight:10,ageGroup:'30_34',sex:'female',planningArea:'area-a',planningAreaName:'Area A',subzone:'zone-a',subzoneName:'Zone A',exactAge:32,labourForceStatus:'employed',employmentRelationship:'employee',nature:'full-time',occupationCode:'fixture:professional',jobTitle:'Fictional analyst',workplaceArea:'area-b',workplaceAreaName:'Area B',homeProxy:{lat:1.38,lon:103.74,basis:'Synthetic fixture home proxy, not an address',sourceId:'fixture-geography'},workplaceProxy:{lat:1.4,lon:103.8,basis:'Synthetic fixture workplace proxy, not a worksite',sourceId:'fixture-geography'},schedule:{timeZone:'Asia/Singapore',arrangement:'on-site',days:[0,1,2,3,4],startMinute:540,endMinute:1080,breakMinutes:60,overnight:false,weeklyMinutes:2400,templateId:'fixture-weekday',assumptionIds:['fixture-schedule']},travelMode:'rail',eligibleAccessStationIds:[],preferredAccessStationId:null,circumstances:[],fieldProvenance:{},...overrides};}
function dataset(records=[resident()]):CitizenDataset{return {version:1,policy:'citizen-circumstances-v1',id:'citizens-'+ 'a'.repeat(64),populationId:'population-'+'b'.repeat(64),seed:'fixture',baseSourceHash:'c'.repeat(64),records,manifest:{version:1,policy:'citizen-circumstances-v1',populationId:'population-'+'b'.repeat(64),baseSourceHash:'c'.repeat(64),generatorVersion:'fixture',seed:'fixture',recordCount:records.length,representedPopulation:records.reduce((n,r)=>n+r.weight,0),sources:[],assumptions:[],conditionalDistributions:[],occupationMapping:'Fixture categories only',scheduleTemplates:[],travelModeRules:[],missingDataPolicy:'retain-unknown',calibration:[],limitations:['Synthetic capability fixture only']}};}

test('citizen commute reuses exact baseline route costs and preserves population/citizen identity',()=>{
 const base=baselineFixture(),input=dataset(),before=structuredClone(input),graphBefore=structuredClone(base);
 const run=calculateCitizenCommutes(input,base,proposalFixture(),{candidateLimit:1,maxAccessMetres:0});
 assert.equal(run.facts[0].citizenId,input.records[0].id);assert.equal(run.populationId,input.populationId);assert.equal(run.citizenDatasetId,input.id);
 assert.equal(run.facts[0].baseline.totalSeconds,shortestPath(base,'NS4','X')!.totalSeconds);
 assert.equal(run.facts[0].intervention.totalSeconds,shortestPath(addHypotheticalLine(base,proposalFixture()).graph,'NS4','X')!.totalSeconds);
 assert.equal(run.facts[0].minutesSaved,(run.facts[0].baseline.totalSeconds!-run.facts[0].intervention.totalSeconds!)/60);
 assert.equal(run.facts[0].status,'improved');assert.deepEqual(input,before);assert.deepEqual(base,graphBefore);validateCitizenCommuteRun(run,input);
 assert.ok(run.facts[0].assumptions.every(a=>/^citizen-commute-v1:/.test(a)));assert.ok(run.assumptions.some(a=>a.includes('haversine')));
 assert.throws(()=>{run.facts[0].minutesSaved=500;},TypeError);
});
test('same geographic endpoint costs zero without fabricating an initial boarding wait',()=>{
 const r=resident();r.workplaceProxy={...r.homeProxy!};const run=calculateCitizenCommutes(dataset([r]),baselineFixture(),proposalFixture(),{maxAccessMetres:0});
 assert.equal(run.facts[0].baseline.totalSeconds,0);assert.equal(run.facts[0].intervention.totalSeconds,0);assert.equal(run.facts[0].minutesSaved,0);assert.equal(run.facts[0].status,'unchanged');
});
test('new-station access is reconsidered for identical geographic endpoints and unknown savings remain null',()=>{
 const r=resident('near-new',{homeProxy:{lat:1.39,lon:103.77,basis:'Synthetic new-station neighbourhood proxy',sourceId:'fixture-geography'}});
 const run=calculateCitizenCommutes(dataset([r]),baselineFixture(),proposalFixture(),{candidateLimit:1,maxAccessMetres:100});
 assert.equal(run.facts[0].baseline.status,'unreachable');assert.equal(run.facts[0].intervention.status,'reachable');assert.equal(run.facts[0].intervention.originStationId,'HYP_M');assert.equal(run.facts[0].status,'newly-reachable');assert.equal(run.facts[0].minutesSaved,null);
});
test('station exits are used as declared access proxies while absent exits retain the station-point fallback',()=>{
 const r=resident('exit-user',{homeProxy:{lat:1.3801,lon:103.7401,basis:'Fixture',sourceId:'fixture'}});
 const run=calculateCitizenCommutes(dataset([r]),baselineFixture(),proposalFixture(),{candidateLimit:1,maxAccessMetres:50,stationAccessPoints:{sourceHash:'d'.repeat(64),points:{NS4:[{...r.homeProxy!,basis:'Supplied station exit proxy',sourceId:'exit-1'}]}}});
 assert.equal(run.facts[0].baseline.accessSeconds,0);assert.equal(run.facts[0].baseline.originStationId,'NS4');assert.ok(run.facts[0].sourceIds.includes('station-exits:'+'d'.repeat(64)));assert.ok(run.assumptions.some(s=>/fallback/i.test(s)));
});
test('bus/car/other and no-work-trip never acquire rail savings; unsupported rail-bus remains unknown',()=>{
 const records=[resident('bus',{travelMode:'bus'}),resident('car',{travelMode:'car-taxi'}),resident('other',{travelMode:'other'}),resident('none',{labourForceStatus:'outside-labour-force',travelMode:'no-work-trip'}),resident('hybrid',{travelMode:'rail-bus'}),resident('unknown',{travelMode:'unknown'})];
 const run=calculateCitizenCommutes(dataset(records),baselineFixture(),proposalFixture());
 assert.deepEqual(run.facts.map(f=>f.status),['not-applicable','not-applicable','not-applicable','not-applicable','unknown','unknown']);assert.ok(run.facts.every(f=>f.minutesSaved===null));assert.equal(run.summary.comparableWeight,0);assert.equal(run.summary.meanMinutesSaved,null);
});
test('missing workplace or proxy remains explicitly unknown',()=>{
 const run=calculateCitizenCommutes(dataset([resident('no-workplace',{workplaceArea:null,workplaceProxy:null}),resident('no-home',{homeProxy:null})]),baselineFixture(),proposalFixture());
 assert.ok(run.facts.every(f=>f.status==='unknown'&&f.unknownReason&&f.baseline.totalSeconds===null));
});
test('known disconnected rail journeys remain unreachable without invented finite savings',()=>{
 const graph=baselineFixture();graph.stations.set('Z',{id:'Z',name:'Isolated',lat:1.43,lon:103.83,parentIds:[],stopIds:[],sourceRows:[],evidence:[],lines:['Z']});graph.aliases.set('Z','Z');graph.states.set('Z|Z',{id:'Z|Z',stationId:'Z',line:'Z'});
 const run=calculateCitizenCommutes(dataset([resident('isolated',{workplaceProxy:{lat:1.43,lon:103.83,basis:'Fixture',sourceId:'fixture'}})]),graph,proposalFixture(),{candidateLimit:1,maxAccessMetres:0});
 assert.equal(run.facts[0].status,'unreachable');assert.equal(run.facts[0].minutesSaved,null);assert.equal(run.facts[0].baseline.totalSeconds,null);
});
test('new candidate ranking cannot drop a baseline alternative and fabricate worsening',()=>{
 const run=calculateCitizenCommutes(dataset(),baselineFixture(),proposalFixture(),{candidateLimit:1,maxAccessMetres:20000});
 assert.ok(run.facts[0].intervention.totalSeconds!<=run.facts[0].baseline.totalSeconds!);assert.equal(run.summary.coverage.worse.weight,0);
});
test('route trees and station candidates are reused across duplicate endpoint assignments',()=>{
 const records=Array.from({length:100},(_,i)=>resident('citizen-'+i));const run=calculateCitizenCommutes(dataset(records),baselineFixture(),proposalFixture(),{candidateLimit:1,maxAccessMetres:0});
 assert.equal(run.diagnostics.baselineTrees,1);assert.equal(run.diagnostics.interventionTrees,1);assert.equal(run.summary.representedPopulation,1000);assert.equal(run.summary.comparableWeight,1000);assert.equal(run.summary.benefitingShare,1);
});
test('weighted outcome conservation and comparable denominator retain unknown and non-rail residents',()=>{
 const records=[resident('rail',{weight:2}),resident('bus',{weight:3,travelMode:'bus'}),resident('unknown',{weight:5,workplaceProxy:null})];const run=calculateCitizenCommutes(dataset(records),baselineFixture(),proposalFixture(),{candidateLimit:1,maxAccessMetres:0});
 assert.equal(run.summary.representedPopulation,10);assert.equal(run.summary.comparableWeight,2);assert.equal(run.summary.coverage['not-applicable'].weight,3);assert.equal(run.summary.coverage.unknown.weight,5);assert.equal(Object.values(run.summary.coverage).reduce((n,c)=>n+c.weight,0),10);
});
test('recipe identity is deterministic and changes for scenario, assumptions or private citizen facts',()=>{
 const base=baselineFixture(),proposal=proposalFixture(),a=calculateCitizenCommutes(dataset(),base,proposal),b=calculateCitizenCommutes(dataset(),base,proposal);assert.deepEqual(a,b);
 assert.notEqual(a.id,calculateCitizenCommutes(dataset(),base,proposal,{walkingMetresPerSecond:1}).id);
 const changed=dataset([resident('citizen-1',{workplaceProxy:{lat:1.41,lon:103.81,basis:'Different fictional workplace',sourceId:'fixture'}})]);assert.notEqual(a.id,calculateCitizenCommutes(changed,base,proposal).id);
});
test('malformed options, negative weights, duplicate identities, nonfinite proxies and inconsistent fact packs fail closed',()=>{
 for(const options of [{candidateLimit:0},{candidateLimit:6},{walkingMetresPerSecond:0},{detourFactor:0.5},{maxAccessMetres:-1},{extra:true}])assert.throws(()=>calculateCitizenCommutes(dataset(),baselineFixture(),proposalFixture(),options as any));
 for(const records of [[resident('dup'),resident('dup')],[resident('negative',{weight:-1})],[resident('nan',{homeProxy:{lat:NaN,lon:103.8,basis:'Fixture',sourceId:'fixture'}})]])assert.throws(()=>calculateCitizenCommutes(dataset(records),baselineFixture(),proposalFixture()));
 const input=dataset(),bad=structuredClone(calculateCitizenCommutes(input,baselineFixture(),proposalFixture()));bad.facts[0].minutesSaved=999;assert.throws(()=>validateCitizenCommuteRun(bad,input));bad.facts[0].citizenId='outsider';assert.throws(()=>validateCitizenCommuteRun(bad,input));
});
test('selected fact validation is browser-safe in structure and rejects cross-agent, false mode and arithmetic claims',()=>{
 const input=dataset(),run=calculateCitizenCommutes(input,baselineFixture(),proposalFixture()),f=run.facts[0];validateCitizenCommuteFact(f,input.records[0],input.id,input.populationId,run.scenarioFingerprint);
 const altered=structuredClone(f);altered.baseline.totalSeconds=999;assert.throws(()=>validateCitizenCommuteFact(altered,input.records[0],input.id,input.populationId,run.scenarioFingerprint));
 assert.throws(()=>validateCitizenCommuteFact(f,resident('other-agent'),input.id,input.populationId,run.scenarioFingerprint));
 const nonrail=resident('citizen-1',{travelMode:'bus'}),wrong=structuredClone(f);wrong.mode='bus';assert.throws(()=>validateCitizenCommuteFact(wrong,nonrail,input.id,input.populationId,run.scenarioFingerprint));
});
test('selected commute schedule labels cannot contradict the frozen citizen schedule',()=>{
 const data=dataset(),run=calculateCitizenCommutes(data,baselineFixture(),proposalFixture()),fact=structuredClone(run.facts[0]);fact.scheduleSummary='Invented alternative shift';assert.throws(()=>validateCitizenCommuteFact(fact,data.records[0],data.id,data.populationId,run.scenarioFingerprint));
});
test('actual graph and actual exit proxies support a deterministic hypothetical-line citizen comparison',()=>{
 const graph=getBaseline('2026-10-27'),o=graph.stations.get('NS4')!,d=graph.stations.get('NE16')!,c=resident('actual-graph-fixture',{homeProxy:{lat:o.lat,lon:o.lon,basis:'Synthetic station-point home proxy',sourceId:'actual-graph-fixture'},workplaceProxy:{lat:d.lat,lon:d.lon,basis:'Synthetic station-point workplace proxy',sourceId:'actual-graph-fixture'}});
 const run=calculateCitizenCommutes(dataset([c]),graph,illustrativeLine,{candidateLimit:1,demandReference:loadTransportDemandReference(graph),stationAccessPoints:loadStationAccessPoints(graph)});
 assert.equal(run.facts[0].baseline.originStationId,'NS4');assert.equal(run.facts[0].baseline.destinationStationId,'NE16');assert.equal(run.facts[0].baseline.railSeconds,shortestPath(graph,'NS4','NE16')!.totalSeconds);assert.ok(run.facts[0].minutesSaved!>0);assert.equal(run.demandReference!.records,887478);assert.equal(run.diagnostics.baselineTrees,1);
});
