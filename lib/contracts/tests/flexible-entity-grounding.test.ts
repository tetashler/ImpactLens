import test from 'node:test';
import assert from 'node:assert/strict';
import {plannerFixture} from './helpers/planner-fixture.ts';
import {createGroundingBundle,groundingContentId} from '../../grounding/contract.ts';
import {parseGeneratedDraft,createDynamicPlanner} from '../../server/inference/planner.ts';
import {MODEL} from '../../server/inference/deepseek.ts';
import {createDynamicPlan,validateDynamicPlan} from '../../dynamic-scenarios/plan.ts';
import {createDynamicInput} from '../../dynamic-scenarios/execution.ts';
import {runStakeholderSimulation,deterministicTurn} from '../../stakeholder-simulation/engine.ts';
import {projectPrimaryWorldGraph} from '../../world-graph/projection.ts';
import {projectDynamicGraph,projectDynamicReport} from '../../dynamic-scenarios/projection.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {validateDynamicResponse} from '../../dynamic-scenarios/response.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {spawnSync} from 'node:child_process';

function fixture(name='Civic Work Standards Council',quote='CWSC discusses working arrangements.'){
 const f=plannerFixture(),source=f.grounding.sources[0],passageId=groundingContentId('p',quote);
 f.grounding=createGroundingBundle({...f.grounding,sources:[{...source,passages:[{id:passageId,text:quote}]}]});
 f.draft.ontology!.entities[0]={...f.draft.ontology!.entities[0],name,support:{sourceId:source.id,passageId,quote}};
 return f;
}
async function execute(f=fixture()){
 const plan=await createDynamicPlan(f.request,f.draft,f.grounding),input=await createDynamicInput(plan);
 const run=await runStakeholderSimulation(input,{attemptId:'flexible-offline',provider:'openrouter',model:'deepseek/deepseek-v4-flash-0731',generateTurn:async c=>deterministicTurn(c)});
 assert.equal(run.status,'completed');return {plan,run,world:await projectPrimaryWorldGraph(run),report:await projectDynamicReport(run),audit:await projectDynamicGraph(run)};
}
for(const [label,name,quote]of [
 ['full name','Public institution','Public institution discusses working arrangements.'],
 ['case-only name','PUBLIC INSTITUTION','Public institution discusses working arrangements.'],
 ['acronym-only candidate','Civic Work Standards Council','CWSC discusses working arrangements.'],
 ['shortened-name candidate','Civic Work Standards Council','The Council discusses working arrangements.'],
 ['punctuation variant candidate','Civic Institution, Singapore','Civic Institution Singapore discusses working arrangements.'],
 ['unrelated literal candidate','Civic Work Standards Council','The weather remains unsettled.'],
] as const)test(`entity acceptance separate from attribution: ${label}`,async()=>{
 const f=fixture(name,quote);assert.doesNotThrow(()=>parseGeneratedDraft(f.draft,f.request,f.grounding));
 const {plan,run,world,report,audit}=await execute(f),entity=world.graph.nodes.find(n=>n.properties.entityId===f.draft.ontology!.entities[0].id)!;
 const literal=label==='full name'||label==='case-only name',record=world.inspections[entity.id];
 assert.equal(run.events.length,8);assert.equal(entity.provenance.kind,'synthetic-exploratory');assert.equal(record.sources.length,literal?1:0);
 assert.equal((record as any).sourceAttribution?.status,literal?'source-reported':'unverified-candidate');
 assert.deepEqual((plan as any).attributionPolicy,literal?undefined:{version:1,mode:'retain-unverified-candidates'});
 assert.deepEqual(plan.draft.ontology!.entities[0],f.draft.ontology!.entities[0],'Raw candidate is frozen and hashed without aliases or rewriting');
 assert.equal(report.ontology!.entities[0].support?.quote??null,literal?quote:null,'Effective report must not call candidate quotes evidence');
 assert.equal((report as any).attribution?.withheldEntityAssociations,literal?0:1);
 assert.deepEqual(report.verifiedFindings,[]);assert.ok(run.events.every(e=>e.sourceIds.length===0));
 const auditEntity=audit.nodes.find(n=>n.properties.entityId===f.draft.ontology!.entities[0].id&&n.properties.recordType==='world-entity')!;
 assert.equal(audit.edges.some(e=>e.source===auditEntity.id&&e.relationshipLabel==='QUOTES_EXCERPT'),literal);
 assert.equal((await validateDynamicPlan(plan)).planId,plan.planId);assert.ok(Object.isFrozen(plan.draft.ontology!.entities[0]));
});

test('support:null accepts an entity and fictional agents need no existence citation',async()=>{
 const f=fixture();f.draft.ontology!.entities[0].support=null;const {world,report}=await execute(f);
 const entity=world.graph.nodes.find(n=>n.properties.recordType==='world-entity')!;assert.equal(world.inspections[entity.id].sources.length,0);assert.equal((world.inspections[entity.id] as any).sourceAttribution.status,'none');
 assert.equal(world.graph.nodes.filter(n=>n.properties.recordType==='fictional-agent').length,4);assert.equal((report as any).attribution.withheldEntityAssociations,0);
});

const invalidCases:[string,(f:ReturnType<typeof fixture>)=>void,string,string][]=[
 ['missing support',f=>delete (f.draft.ontology!.entities[0] as any).support,'plan.required_field','draft.ontology.entities[0].support'],
 ['unknown source',f=>f.draft.ontology!.entities[0].support!.sourceId='absent','ontology.source_reference_unknown','draft.ontology.entities[0].support.sourceId'],
 ['unknown passage',f=>f.draft.ontology!.entities[0].support!.passageId='absent','ontology.source_passage_unknown','draft.ontology.entities[0].support.passageId'],
 ['fabricated quote',f=>f.draft.ontology!.entities[0].support!.quote='This fabricated statement was never retrieved.','ontology.source_quote_not_found','draft.ontology.entities[0].support.quote'],
 ['empty quote',f=>f.draft.ontology!.entities[0].support!.quote='','plan.invalid_text','draft.ontology.entities[0].support.quote'],
 ['oversized quote',f=>f.draft.ontology!.entities[0].support!.quote='x'.repeat(801),'plan.invalid_text','draft.ontology.entities[0].support.quote'],
 ['unknown entity type',f=>f.draft.ontology!.entities[0].typeId='absent','ontology.entity_type_unknown','draft.ontology.entities[0].typeId'],
 ['unknown endpoint',f=>f.draft.ontology!.relationships[0].target='absent','ontology.relationship_endpoint_unknown','draft.ontology.relationships[0].target'],
 ['verification flag',f=>(f.draft.ontology!.entities[0] as any).verified=true,'plan.unexpected_property','draft.ontology.entities[0]'],
];
for(const [name,mutate,rule,path]of invalidCases)test(`strict integrity survives flexible attribution: ${name}`,()=>{
 const f=fixture();mutate(f);assert.throws(()=>parseGeneratedDraft(f.draft,f.request,f.grounding),(e:any)=>e.diagnostic.rule===rule&&e.diagnostic.path===path);
});

test('source snapshot tampering and unsafe URLs are still rejected',async()=>{
 for(const mutate of [(f:ReturnType<typeof fixture>)=>f.grounding.sources[0].passages[0].text+='tampered',(f:ReturnType<typeof fixture>)=>f.grounding.sources[0].url='http://localhost/private']){
  const f=fixture();mutate(f);await assert.rejects(createDynamicPlan(f.request,f.draft,f.grounding));
 }
});

test('identity binds the original candidate association and reading does not mutate archives',async()=>{
 const f=fixture(),p=await createDynamicPlan(f.request,f.draft,f.grounding),original=JSON.stringify(p);
 const detached=structuredClone(f.draft);detached.ontology!.entities[0].support=null;assert.notEqual((await createDynamicPlan(f.request,detached,f.grounding)).planId,p.planId);
 await validateDynamicPlan(p);assert.equal(JSON.stringify(p),original);
 const forged=structuredClone(p);forged.draft.ontology!.entities[0].support=null;await assert.rejects(validateDynamicPlan(forged));
 const missingPolicy=structuredClone(p) as any;delete missingPolicy.attributionPolicy;await assert.rejects(validateDynamicPlan(missingPolicy));
 const forgedPolicy=structuredClone(p) as any;forgedPolicy.attributionPolicy={version:1,mode:'verified'};await assert.rejects(validateDynamicPlan(forgedPolicy));
 const old=plannerFixture();assert.equal((await createDynamicPlan(old.request,old.draft,old.grounding)).planId,'dynamic-plan-d3ba81cf571e43bdee17700c883912397ba243db5aa2fe0762349b167e0c7351');
 const {dynamicFixtures}=await import('../../dynamic-scenarios/fixtures.ts'),legacy=dynamicFixtures()[0];assert.equal((await createDynamicPlan(legacy.request,legacy.draft)).planId,'dynamic-plan-3d7bf0b6255c6c6d72e7e40c295a421cad4f3a32a8df6e7be84dd742d5bc47a9');
});

test('the former full-name rejection fixture now remains an explicit unverified candidate',async()=>{
 const f=plannerFixture();f.draft.ontology!.entities[0].support!.quote='working arrangements';
 const {world}=await execute(f),entity=world.graph.nodes.find(n=>n.properties.recordType==='world-entity')!;
 assert.equal(world.inspections[entity.id].sources.length,0);assert.equal(world.inspections[entity.id].sourceAttribution?.reason,'entity-mention-not-established');
});

test('proposed relationship without support remains unverified and valid',async()=>{
 const {world}=await execute(),e=world.graph.edges.find(e=>world.inspections[e.id]?.kind==='proposed-relationship')!;assert.equal(e.provenance.kind,'synthetic-exploratory');
});
for(const literal of [true,false])test(`relationship evidence is independent from entity evidence: literal=${literal}`,async()=>{
 const f=fixture('Civic Council','Civic Council consults Worker Group.');const o=f.draft.ontology!;
 o.entities.push({...o.entities[0],id:'worker-group',name:'Worker Group',support:null});
 o.relationships[0]={...o.relationships[0],source:o.entities[0].id,target:'worker-group',statement:literal?o.entities[0].support!.quote:'Civic Council could regulate staffing.',support:o.entities[0].support};
 const {world,report}=await execute(f),edge=world.graph.edges.find(e=>e.id.endsWith(':relation:discussion-a'))!;
 assert.equal(edge.provenance.kind,literal?'source-backed':'synthetic-exploratory');assert.equal(world.inspections[edge.id].sources.length,literal?1:0);
 assert.equal((report as any).attribution.withheldRelationshipAssociations,literal?0:1);assert.equal(report.ontology!.relationships[0].support!==null,literal);
});

test('fabricated relationship quote remains a source-integrity error',()=>{
 const f=fixture();f.draft.ontology!.relationships[0].support={...f.draft.ontology!.entities[0].support!,quote:'Invented relationship claim.'};
 assert.throws(()=>parseGeneratedDraft(f.draft,f.request,f.grounding),(e:any)=>e.diagnostic.rule==='ontology.source_quote_not_found'&&e.diagnostic.path==='draft.ontology.relationships[0].support.quote');
});

test('mismatched literal candidate completes the real route with mocked planning and eight independent action calls',async()=>{
 const f=fixture(),mock=mockDynamicProvider(f),wire={version:1 as const,attemptId:`flexible-${crypto.randomUUID()}`,request:f.request};
 const response=await handleDynamicRequest(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(wire)}),{enabled:true,key:'mock-only',groundingKey:'mock-only',groundingFetcher:async()=>Response.json({results:f.grounding.sources.map(s=>({title:s.title,url:s.url,content:s.passages[0].text}))}),fetcher:mock.fetcher});
 const body=await validateDynamicResponse(await response.json(),wire);assert.equal(response.status,200);assert.equal(body.kind,'dynamic-execution');if(body.kind!=='dynamic-execution')assert.fail('Expected full execution');
 assert.equal(body.run.status,'completed');assert.equal(body.run.events.length,8);assert.deepEqual(mock.counts(),{calls:10,plans:2});assert.ok(body.run.events.slice(4).every(e=>e.previousEventIds.length>0));
 const world=await projectPrimaryWorldGraph(body.run),entity=world.graph.nodes.find(n=>n.properties.recordType==='world-entity')!;
 assert.equal(world.inspections[entity.id].sources.length,0);assert.equal((world.inspections[entity.id] as any).sourceAttribution.status,'unverified-candidate');
});

test('actual Report entity article withholds candidate quotation and exposes a safe count',async()=>{
 const {plan,run}=await execute(fixture('Civic Work Standards Council','withheld-report-marker'));
 const component=new URL('../../../components/dynamic-scenario-view.tsx',import.meta.url).href;
 const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import ts from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const x of ['.tsx','.ts']){const u=new URL(s+x,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});const {default:View}=await import(${JSON.stringify(component)});process.stdout.write(renderToStaticMarkup(createElement(View,JSON.parse(readFileSync(0,'utf8')))));`;
 const rendered=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify({response:{plan,run,planning:{record:null},accounting:null},failure:null,report:true}),encoding:'utf8',timeout:15000});assert.equal(rendered.status,0,rendered.stderr);
 const article=rendered.stdout.match(/<article[^>]*><h3>Civic Work Standards Council<\/h3>[\s\S]*?<\/article>/)?.[0];assert.ok(article);assert.doesNotMatch(article,/withheld-report-marker|Quoted provenance|dynamic-grounding-passage/);assert.match(article,/Unverified source candidate/);assert.match(rendered.stdout,/Source associations withheld from evidence/);
 assert.match(rendered.stdout,/withheld-report-marker/,'The independent retrieval bundle remains inspectable');
});

test('planner instructions consistently describe optional and nonconfirming source associations',async()=>{
 const f=fixture();let instruction='';const p=createDynamicPlanner({key:'mock-only',fetcher:async(_u,i)=>{instruction=JSON.parse(String(i?.body)).messages[0].content;return Response.json({model:MODEL,provider:'DigitalOcean',usage:{},choices:[{finish_reason:'stop',message:{content:JSON.stringify(f.draft)}}]});}},f.grounding);
 await p.generate(f.request);assert.match(instruction,/Evidence is optional/);assert.match(instruction,/support:null/);assert.match(instruction,/Fictional agents need no citation/);assert.doesNotMatch(instruction,/an entity quote must include its full name/);
});
