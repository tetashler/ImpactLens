import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {handleAssumptionRequest} from '../../server/assumption-review/service.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {parsePublicExplore} from '../../question-simulation/public-session.ts';
import {validateDynamicPlan} from '../../dynamic-scenarios/plan.ts';

const request=(body:unknown,origin?:string)=>new Request('http://localhost/api/scenario-simulate',{
 method:'POST',headers:{'Content-Type':'application/json',...(origin?{Origin:origin}:{})},body:JSON.stringify(body),
});
function fixture(assumptions:{id:string;text:string}[]=[{id:'pay',text:'Monthly pay remains unchanged.'},{id:'hours',text:'Daily work hours remain unchanged.'}]){
 const f=worldFixtures()[0];f.draft.assumptions=assumptions;
 const mock=mockDynamicProvider(f),root=mkdtempSync(join(process.cwd(),'tmp/assumption-approval/api-'));
 const dynamic={enabled:true,key:'mock-only',groundingKey:'',fetcher:mock.fetcher};
 const social={storeDirectory:join(root,'accepted'),directory:join(root,'sessions'),skipSocialInitialization:true};
 const call=(body:unknown,origin?:string)=>handleAssumptionRequest(request(body,origin),dynamic,social);
 const prepare=async()=>{
  const response=await call({version:3,operation:'prepare',attemptId:'assumption-api-'+crypto.randomUUID(),request:f.request});
  assert.equal(response.status,200,await response.clone().text());const body=await response.json();assert.equal(body.kind,'assumption-review');return body;
 };
 const start=(draft:any,decisions:unknown)=>call({version:3,operation:'start',draftId:draft.draftId,token:draft.token,contextKey:draft.contextKey,decisions});
 return {f,mock,root,social,call,prepare,start};
}
const choices=(draft:any,decision:'allow'|'do-not-allow')=>draft.assumptions.map((a:{id:string})=>({assumptionId:a.id,decision}));

test('ordinary preparation returns an unanswered draft without stakeholder actions or accepted-run storage',async()=>{
 const f=fixture(),draft=await f.prepare();
 assert.deepEqual(f.mock.counts(),{calls:2,plans:2});assert.equal(draft.assumptions.length,2);
 assert.ok(draft.assumptions.every((a:Record<string,unknown>)=>!Object.hasOwn(a,'decision')));
 assert.match(draft.token,/^[a-f0-9]{64}$/);assert.match(draft.contextKey,/^[a-f0-9]{64}$/);
 assert.ok(Date.parse(draft.expiresAt)>Date.now());assert.equal(draft.question,f.f.request.question);
 assert.equal(readdirSync(f.social.storeDirectory).filter(name=>name.endsWith('.json')).length,0);
});

test('missing, duplicate, unknown and forged decisions cannot dispatch, and a corrected complete review can still start',async()=>{
 const f=fixture(),draft=await f.prepare(),complete=choices(draft,'allow');
 const invalid=[complete.slice(0,1),[complete[0],complete[0]],[complete[0],{assumptionId:'unknown-assumption',decision:'allow'}],[{...complete[0],text:'Forged replacement'},complete[1]]];
 for(const decisions of invalid){const response=await f.start(draft,decisions);assert.ok(response.status>=400,response.status.toString());assert.deepEqual(f.mock.counts(),{calls:2,plans:2});}
 const accepted=await f.start(draft,complete);assert.equal(accepted.status,200,await accepted.clone().text());assert.deepEqual(f.mock.counts(),{calls:10,plans:2});
});

test('mixed decisions execute the reviewed canonical plan once, preserve original text and survive public parsing',async()=>{
 const f=fixture(),draft=await f.prepare(),decisions=choices(draft,'allow');decisions[0].decision='do-not-allow';
 const response=await f.start(draft,decisions);assert.equal(response.status,200,await response.clone().text());
 const body=await response.json(),accepted=parsePublicExplore(body);assert.equal(accepted.kind,'summary-execution');assert.equal(accepted.initialActions.length,8);
 assert.deepEqual(f.mock.counts(),{calls:10,plans:2});assert.equal(accepted.assumptionReview?.items.length,2);
 assert.deepEqual(accepted.assumptionReview?.items.map(a=>({assumptionId:a.assumptionId,decision:a.decision})),decisions);
 assert.equal(accepted.assumptionReview?.items[0].text,draft.assumptions[0].text);
 assert.ok(!accepted.assumptions.includes(draft.assumptions[0].text));assert.ok(accepted.assumptions.includes(draft.assumptions[1].text));
 assert.ok(!JSON.stringify(accepted).includes(draft.token),'pending capability must not enter accepted public metadata');
 const archives=readdirSync(f.social.storeDirectory).filter(name=>name.endsWith('.json'));assert.equal(archives.length,1);
 const archive=JSON.parse(readFileSync(join(f.social.storeDirectory,archives[0]),'utf8'));
 const effective=await validateDynamicPlan(archive.execution.plan);assert.equal(effective.planId,accepted.planId);
 assert.equal(effective.assumptionReview?.sourcePlanId,accepted.assumptionReview?.sourcePlanId);
 assert.notEqual(effective.planId,effective.assumptionReview?.sourcePlanId);
 const duplicate=await f.start(draft,decisions);assert.ok([200,202,409,410].includes(duplicate.status));assert.deepEqual(f.mock.counts(),{calls:10,plans:2});
 assert.equal(readdirSync(f.social.storeDirectory).filter(name=>name.endsWith('.json')).length,1);
});

test('rejecting every additional assumption leaves only original user conditions and still executes',async()=>{
 const f=fixture(),draft=await f.prepare(),response=await f.start(draft,choices(draft,'do-not-allow'));
 assert.equal(response.status,200,await response.clone().text());const body=parsePublicExplore(await response.json());
 assert.equal(body.initialActions.length,8);assert.ok(body.assumptionReview?.items.every(a=>a.decision==='do-not-allow'));
 for(const item of draft.assumptions)assert.ok(!body.assumptions.includes(item.text));assert.deepEqual(f.mock.counts(),{calls:10,plans:2});
});

test('no additional assumptions still returns a draft and requires explicit empty Continue',async()=>{
 const f=fixture([]),draft=await f.prepare();assert.deepEqual(draft.assumptions,[]);assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
 const response=await f.start(draft,[]);assert.equal(response.status,200,await response.clone().text());const body=parsePublicExplore(await response.json());
 assert.deepEqual(body.assumptionReview?.items,[]);assert.equal(body.initialActions.length,8);assert.deepEqual(f.mock.counts(),{calls:10,plans:2});
});

test('wrong capability/context and discarded drafts never start stakeholder generation',async()=>{
 const f=fixture(),draft=await f.prepare(),decisions=choices(draft,'allow');
 const base={version:3,operation:'start',draftId:draft.draftId,token:draft.token,contextKey:draft.contextKey,decisions};
 for(const body of [{...base,token:'0'.repeat(64)},{...base,contextKey:'0'.repeat(64)}]){assert.ok((await f.call(body)).status>=400);assert.deepEqual(f.mock.counts(),{calls:2,plans:2});}
 const discarded=await f.call({version:3,operation:'discard',draftId:draft.draftId,token:draft.token});assert.ok(discarded.ok);
 assert.ok((await f.start(draft,decisions)).status>=400);assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
});

test('legacy public execution and cross-origin preparation cannot bypass the review gate',async()=>{
 const f=fixture();
 for(const version of [1,2]){
  const response=await f.call({version,attemptId:'legacy-'+crypto.randomUUID(),request:f.f.request});assert.equal(response.status,409);
 }
 const response=await f.call({version:3,operation:'prepare',attemptId:'origin-'+crypto.randomUUID(),request:f.f.request},'https://unrelated.example');
 assert.equal(response.status,403);assert.deepEqual(f.mock.counts(),{calls:0,plans:0});
});

test('racing Start requests and passive status cannot spend twice',async()=>{
 const f=fixture(),draft=await f.prepare(),decisions=choices(draft,'allow');
 const [first,second]=await Promise.all([f.start(draft,decisions),f.start(draft,decisions)]);
 assert.equal(first.status,200,await first.clone().text());assert.ok([200,202,409].includes(second.status));
 assert.deepEqual(f.mock.counts(),{calls:10,plans:2});
 const status=await f.call({version:3,operation:'status',draftId:draft.draftId,token:draft.token});
 assert.equal(status.status,200);assert.equal((await status.json()).kind,'summary-execution');assert.deepEqual(f.mock.counts(),{calls:10,plans:2});
});

test('expired review requires a new explicit preparation and cannot dispatch late actions',async t=>{
 const f=fixture(),draft=await f.prepare(),future=Date.parse(draft.expiresAt)+1;
 t.mock.method(Date,'now',()=>future);
 const response=await f.start(draft,choices(draft,'allow'));assert.equal(response.status,410);
 assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
});

test('concurrent duplicate Prepare claims dispatch planning only once and do not disclose the capability twice',async()=>{
 const f=fixture(),body={version:3,operation:'prepare',attemptId:'prepare-race-'+crypto.randomUUID(),request:f.f.request};
 const responses=await Promise.all([f.call(body),f.call(body)]),accepted=responses.find(r=>r.status===200),rejected=responses.find(r=>r.status!==200);
 assert.ok(accepted);assert.ok(rejected);assert.equal(rejected.status,409);assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
 const draft=await accepted.json(),error=await rejected.text();assert.ok(!error.includes(draft.token));
 await f.call({version:3,operation:'discard',draftId:draft.draftId,token:draft.token});
});

test('an already-cancelled Start never reaches the provider and cannot unlock a replacement execution',async()=>{
 const f=fixture(),draft=await f.prepare(),abort=new AbortController();abort.abort();
 const original=request({version:3,operation:'start',draftId:draft.draftId,token:draft.token,contextKey:draft.contextKey,decisions:choices(draft,'allow')});
 const response=await handleAssumptionRequest(new Request(original,{signal:abort.signal}),{enabled:true,key:'mock-only',groundingKey:'',fetcher:f.mock.fetcher},f.social);
 assert.ok(response.status>=400);assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
 // Body cancellation may reject before consuming the draft. Neither cancellation nor a passive status may invoke work.
 const status=await f.call({version:3,operation:'status',draftId:draft.draftId,token:draft.token});assert.equal(status.status,200);assert.deepEqual(f.mock.counts(),{calls:2,plans:2});
 await f.call({version:3,operation:'discard',draftId:draft.draftId,token:draft.token});
});

test('pending-review capacity rejects before another planning request and can be released by discard',async()=>{
 const f=fixture(),drafts:any[]=[];let blocked=false;
 try{
  for(let i=0;i<17;i++){
   const before=f.mock.counts(),response=await f.call({version:3,operation:'prepare',attemptId:'capacity-'+crypto.randomUUID(),request:f.f.request});
   if(response.status===429){blocked=true;assert.deepEqual(f.mock.counts(),before);break;}
   assert.equal(response.status,200,await response.clone().text());drafts.push(await response.json());
  }
  assert.ok(blocked,'at most sixteen active reviews may be retained');
  assert.deepEqual(f.mock.counts(),{calls:drafts.length*2,plans:drafts.length*2});
 }finally{for(const draft of drafts)await f.call({version:3,operation:'discard',draftId:draft.draftId,token:draft.token});}
});
