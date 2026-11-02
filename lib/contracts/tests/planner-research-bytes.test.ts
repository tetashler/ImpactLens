import test from 'node:test';
import assert from 'node:assert/strict';
import {createGroundingBundle,groundingContentId} from '../../grounding/contract.ts';
import {createEntityPlanner,createRelationshipPlanner} from '../../server/inference/planner.ts';
import {worldFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {registerDraft} from '../../dynamic-scenarios/registration.ts';

for(const cjk of [false,true])test(`both planner transports bound sixteen ${cjk?'CJK':'ASCII'} research sources without changing the retained pack`,async()=>{
 const at='2026-11-02T00:00:00.000Z';
 const sources=Array.from({length:16},(_,i)=>{const text=cjk?'資料'.repeat(400):'Background '.repeat(80).slice(0,800);return {id:'source-'+i,title:cjk?'資料'.repeat(120):'T'.repeat(240),url:`https://reports.org/${i}`,publisher:'reports.org',publishedAt:null,retrievedAt:at,passages:[{id:groundingContentId('p',text),text}]};});
 const grounding=createGroundingBundle({status:'retrieved',query:'Background research',retrievedAt:at,sources,limitations:['Unverified excerpts.'],usage:{searches:4,credits:4},research:{version:1,budgetCredits:30,reservedCredits:4,stopReason:'coverage',queries:Array.from({length:4},(_,i)=>({query:'facet '+i,topic:'background',status:'retrieved',credits:1,sourceIds:sources.slice(i*4,i*4+4).map(s=>s.id)}))}});
 const original=JSON.stringify(grounding),fixture=worldFixtures()[0];let requests=0;
 const provider=mockDynamicProvider(fixture,(body)=>{
  requests++;const text=body.messages[1].content;assert.ok(Buffer.byteLength(text,'utf8')<=24000);
  const input=JSON.parse(text),retained=Array.isArray(input.retrievalCandidates)?input.retrievalCandidates:input.retrievalCandidates.sources;
  assert.equal(retained.length,16);assert.match(JSON.stringify(input),/truncat|omitted/i);
  for(let i=0;i<16;i++){assert.equal(retained[i].id,sources[i].id);assert.equal(retained[i].passages[0].id,sources[i].passages[0].id);assert.ok(sources[i].passages[0].text.includes(retained[i].passages[0].text));assert.ok(Buffer.byteLength(retained[i].passages[0].text,'utf8')<=192);assert.equal(retained[i].retrievedAt,at);}
 });
 const entities=(await createEntityPlanner({key:'mock',fetcher:provider.fetcher},grounding).generate(fixture.request)).value;
 await createRelationshipPlanner({key:'mock',fetcher:provider.fetcher},registerDraft(entities).draft,grounding).generate(fixture.request);
 assert.equal(requests,2);assert.equal(JSON.stringify(grounding),original);
});
