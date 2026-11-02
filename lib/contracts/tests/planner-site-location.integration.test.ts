import test from 'node:test';
import assert from 'node:assert/strict';
import {createDynamicPlanner,createEntityPlanner,createRelationshipPlanner} from '../../server/inference/planner.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {registerDraft} from '../../dynamic-scenarios/registration.ts';
import {createDynamicPlan,validateDynamicPlan} from '../../dynamic-scenarios/plan.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';

const point={kind:'point' as const,id:'whampoa-site',label:'Proposed polyclinic',role:'site' as const,coordinate:{lat:1.325243,lon:103.856099},provenance:'user-drawn' as const};
function fixture(){
 const f=worldFixtures()[0];
 f.request.question='What if a new polyclinic was built at the plotted location?';
 f.request.geometry.features=[structuredClone(point)];
 f.draft.description='A hypothetical new polyclinic at the plotted site.';
 f.draft.trigger='The proposed clinic is discussed.';
 f.draft.assumptions=[{id:'site-location',text:'The plotted site is in the Novena planning area.'}];
 return f;
}

test('both staged planning requests receive the same resolved Whampoa-area site without changing the user geometry',async()=>{
 const f=fixture(),original=structuredClone(f.request),contexts:any[]=[];
 const provider=mockDynamicProvider(f,body=>contexts.push(JSON.parse(body.messages[1].content)));
 const entity=(await createEntityPlanner({key:'offline-only',fetcher:provider.fetcher}).generate(f.request)).value;
 await createRelationshipPlanner({key:'offline-only',fetcher:provider.fetcher},registerDraft(entity).draft).generate(f.request);
 assert.equal(contexts.length,2);
 for(const context of contexts){
  assert.ok(context.plottedSiteContext,'The AI must receive named server-resolved locations, not just raw coordinates.');
  const encoded=JSON.stringify(context.plottedSiteContext);
  assert.match(encoded,/NOVENA/);assert.match(encoded,/BALESTIER/);
  assert.ok(encoded.includes(String(point.coordinate.lat))&&encoded.includes(String(point.coordinate.lon)));
  assert.ok(encoded.includes(point.id));assert.match(encoded,/2019/);
 }
 assert.deepEqual(contexts[0].plottedSiteContext,contexts[1].plottedSiteContext);
 assert.deepEqual(f.request,original);
 assert.equal(provider.counts().calls,2);
});

test('legacy direct planning also receives authoritative plotted-site context and no unrelated neighbourhood example',async()=>{
 const f=fixture();let input:any,system='';
 const provider=mockDynamicProvider(f,body=>{input=JSON.parse(body.messages[1].content);system=body.messages[0].content;});
 const result=await createDynamicPlanner({key:'offline-only',fetcher:provider.fetcher}).generate(f.request);
 assert.ok(input.plottedSiteContext);assert.match(JSON.stringify(input.plottedSiteContext),/NOVENA/);
 assert.doesNotMatch(system,/Singapore is the jurisdiction for Sengkang/);
 assert.equal(result.record.status,'accepted');assert.equal(provider.counts().calls,1);
});

for(const stage of ['entity','legacy','relationship'] as const)test(`${stage} planning cannot accept a fabricated Sengkang site assumption and does not retry`,async()=>{
 const f=fixture();f.draft.assumptions=[{id:'site-location',text:'The plotted location is in the Sengkang planning area.'}];
 const provider=mockDynamicProvider(f);
 const entityDraft=structuredClone(f.draft);entityDraft.ontology.relationships=[];entityDraft.entities=[];entityDraft.agents.forEach(agent=>agent.entityIds=[]);
 const planner=stage==='entity'?createEntityPlanner({key:'offline-only',fetcher:provider.fetcher}):stage==='legacy'?createDynamicPlanner({key:'offline-only',fetcher:provider.fetcher}):createRelationshipPlanner({key:'offline-only',fetcher:provider.fetcher},registerDraft(entityDraft).draft);
 await assert.rejects(planner.generate(f.request),(error:any)=>error.code==='AI_PLAN_INVALID');
 assert.equal(provider.counts().calls,1,'A failed location check must not create an extra paid request.');
 assert.equal(planner.records.length,1);assert.equal(planner.records[0].status,'failed');
});

test('new generation safeguards do not rewrite or invalidate immutable archived plans',async()=>{
 const f=fixture();f.draft.assumptions=[{id:'site-location',text:'The plotted location is in the Sengkang planning area.'}];
 const archived=await createDynamicPlan(f.request,f.draft),original=JSON.stringify(archived);
 assert.deepEqual(await validateDynamicPlan(archived),archived);
 assert.equal(JSON.stringify(archived),original);
 assert.equal(archived.request.geometry.features[0].kind,'point');
 assert.match(archived.draft.assumptions[0].text,/Sengkang/);
});
