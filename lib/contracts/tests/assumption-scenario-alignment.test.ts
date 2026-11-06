import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {handleAssumptionRequest} from '../../server/assumption-review/service.ts';
import {validateDynamicResponse} from '../../dynamic-scenarios/response.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {createQuestionSimulation} from '../../question-simulation/client.ts';

const question='What if a new polyclinic was built at the marked point?';
function setup(alignment:'aligned'|'mismatch'|'uncertain'|'missing'){
 const f=worldFixtures()[0];f.request.question=question;
 f.request.geometry.features=[{kind:'point',id:'clinic-site',label:'Proposed clinic',role:'site',coordinate:{lat:1.325243,lon:103.856099},provenance:'user-drawn'}];
 f.draft.description='A Singapore professional-services employer considers a four-day workweek policy.';
 f.draft.assumptions=[
  {id:'employer',text:'The employer is a Singapore professional-services firm, not a government agency; any four-day schedule would be employer policy without statutory mandate.'},
  {id:'leadership',text:'Senior leadership has already signalled support for a compressed workweek trial, pending internal design.'},
  {id:'pay',text:'Unchanged monthly pay for participants is an explicit constraint being considered, not a measured outcome.'}
 ];
 if(alignment==='aligned'){
  f.draft.description='A hypothetical new polyclinic at the marked point.';f.draft.trigger='The proposed clinic is considered at the user-drawn site.';
  f.draft.assumptions=[{id:'proposal',text:'The proposal is considered as a standalone clinic project.'}];
 }
 const contexts:any[]=[],stages:string[]=[];
 const mock=mockDynamicProvider(f,(body,reply)=>{
  const name=body.response_format.json_schema.name;stages.push(name);contexts.push(JSON.parse(body.messages[1].content));
  if(name==='dynamic_relationships_v3'){
   const output=JSON.parse(reply.choices[0].message.content);
   if(alignment==='missing')delete output.scenarioAlignment;else output.scenarioAlignment=alignment;
   reply.choices[0].message.content=JSON.stringify(output);
  }
 });
 const root=mkdtempSync(join(process.cwd(),'tmp/assumption-approval/alignment-'));
 const social={storeDirectory:join(root,'accepted'),directory:join(root,'sessions'),skipSocialInitialization:true,swarm:false as const};
 const deps={enabled:true,key:'offline-only',groundingKey:'',fetcher:mock.fetcher};
 const attemptId='alignment-'+crypto.randomUUID();
 const call=()=>handleAssumptionRequest(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:3,operation:'prepare',attemptId,request:f.request})}),deps,social);
 const fetcher:typeof fetch=(url,init)=>handleAssumptionRequest(new Request(new URL(String(url),'http://localhost'),init),deps,social);
 return {f,mock,social,attemptId,call,contexts,stages,fetcher};
}

for(const verdict of ['mismatch','uncertain','missing'] as const)test(`a ${verdict} scenario check stops the unrelated workweek plan before polyclinic approval or simulation`,async()=>{
 const f=setup(verdict),response=await f.call(),body=await response.json();
 assert.equal(body.kind,'planning-failed','An unrelated interpretation must never be offered for approval.');
 assert.ok(response.status>=400);assert.equal(body.error.code,'AI_PLAN_SCENARIO_MISMATCH');
 assert.equal(body.error.validation.rule,'plan.scenario_alignment_failed');
 assert.deepEqual(f.stages,['dynamic_entities_v3','dynamic_relationships_v3']);
 assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
 assert.equal(body.planning.records[0].status,'accepted');assert.equal(body.planning.records[1].status,'failed');
 assert.doesNotMatch(JSON.stringify(body),/professional-services|signalled support|monthly pay|draftId|contextKey/);
 await validateDynamicResponse(body,{version:1,attemptId:f.attemptId,request:f.f.request});
 assert.equal(readdirSync(f.social.storeDirectory).filter(name=>name.endsWith('.json')).length,0);
 assert.ok((await f.call()).status>=400);assert.deepEqual(f.mock.counts(),{calls:2,plans:2},'No automatic retry or duplicate preparation may dispatch.');
});

test('an aligned clinic plan reaches human review with the original point and complete candidate premises in both planning stages',async()=>{
 const f=setup('aligned'),response=await f.call(),body=await response.json();
 assert.equal(response.status,200);assert.equal(body.kind,'assumption-review');assert.equal(body.question,question);
 assert.match(body.description,/polyclinic/);assert.deepEqual(body.assumptions.map((a:any)=>a.text),f.f.draft.assumptions.map(a=>a.text));
 assert.deepEqual(f.stages,['dynamic_entities_v3','dynamic_relationships_v3']);assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
 assert.equal(f.contexts[1].question,question);assert.equal(f.contexts[1].description,f.f.draft.description);
 assert.equal(f.contexts[1].trigger,f.f.draft.trigger);assert.deepEqual(f.contexts[1].assumptions.map((a:any)=>a.text),f.f.draft.assumptions.map(a=>a.text));
 assert.deepEqual(f.contexts[0].plottedSiteContext,f.contexts[1].plottedSiteContext);
});

test('the browser displays the alignment failure without offering approval or starting simulation',async()=>{
 const f=setup('mismatch'),controller=createQuestionSimulation({execution:'dynamic',publicOnly:true,fetcher:f.fetcher});
 try{
  const {question,geometry,geometryRevision}=f.f.request;controller.invalidate({question,geometry,geometryRevision});await controller.start('dynamic');
  const state=controller.getSnapshot();assert.equal(state.phase,'error');assert.equal(state.assumptionReview,null);assert.equal(state.publicRun,null);
  assert.match(state.error??'',/matches your question/);assert.match(state.error??'',/No simulation was started/);
  assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
 }finally{controller.dispose();}
});

test('an explicit clinic staffing and workweek question is allowed when its candidate passes alignment',async()=>{
 const f=setup('aligned');f.f.request.question='What if the new polyclinic at the marked point adopted a four-day staff workweek with unchanged monthly pay?';
 f.f.draft.description='The proposed clinic considers the requested staff workweek policy.';
 f.f.draft.assumptions=[{id:'trial',text:'The proposed staffing arrangement is considered as a limited trial.'}];
 const response=await f.call(),body=await response.json();assert.equal(response.status,200);assert.equal(body.kind,'assumption-review');
 assert.equal(body.question,f.f.request.question);assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
});
