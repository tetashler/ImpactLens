import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const names=['admission-timeout-smoke','citizen-hybrid','conversation-menu-v5','conversation-menu-v6-small','conversation-menu-v7-small','geographic-selection-v7','hybrid-map-v2','storage-handoff-success'];
const row=(schema:string)=>({attempt:1,service:'openrouter',purpose:'relationship',schema,costUsd:.001,reservedUsd:.02,reservedTokens:2000,inputTokens:10,outputTokens:10,state:'returned'});
const state=(requests:unknown[]=[])=>({attempts:[{id:1}],requests,halted:false});

for(const name of names)test(`${name} recognizes both relationship schemas with one shared relationship counter`,async()=>{
 const g=await import(`../../../scripts/testing/${name}-live-guard.mjs`);
 const v2=g.STAGES.dynamic_relationships_v2,v3=g.STAGES.dynamic_relationships_v3;
 assert.ok(v3,'dynamic_relationships_v3 must be admitted');
 assert.equal(v3,v2);
 assert.equal(v3.purpose,'relationship');assert.equal(v3.calls,1);assert.equal(g.LIMITS.relationship,1);
 for(const schema of ['dynamic_relationships_v2','dynamic_relationships_v3'])assert.equal(g.totals(state([row(schema)])).relationship,1);
 assert.equal(g.totals(state([row('dynamic_relationships_v2'),row('dynamic_relationships_v3')])).relationship,2);
});

test('switching relationship schema cannot obtain a second conservative reservation',async()=>{
 const g=await import('../../../scripts/testing/storage-handoff-success-live-guard.mjs');
 for(const first of ['dynamic_relationships_v2','dynamic_relationships_v3']){
  const d=state();
  assert.equal(g.nextOpenrouterAdmissionAllowed(d,{schema:first,rawBytes:100,maxOutputTokens:6000}),true);
  d.requests.push(row(first));
  for(const next of ['dynamic_relationships_v2','dynamic_relationships_v3'])assert.equal(g.nextOpenrouterAdmissionAllowed(d,{schema:next,rawBytes:100,maxOutputTokens:6000}),false,`${first} must exhaust ${next}`);
 }
});

test('offline phase4e2 fixture adds alignment only to the v3 relationship response',()=>{
 mkdirSync(resolve('tmp'),{recursive:true});
 const directory=mkdtempSync(resolve('tmp/relationship-schema-fixture-'));
 const preload=pathToFileURL(resolve('scripts/testing/phase4e2-provider-preload.mjs')).href;
 const fixtures=pathToFileURL(resolve('lib/world-graph/fixtures.ts')).href;
 const source=`import assert from 'node:assert/strict';await import(${JSON.stringify(preload)});const {worldFixtures}=await import(${JSON.stringify(fixtures)});const question=worldFixtures()[0].request.question;const outputs=[];for(const name of ['dynamic_relationships_v2','dynamic_relationships_v3']){const response=await fetch('https://openrouter.ai/api/v1/chat/completions',{method:'POST',body:JSON.stringify({model:'deepseek/deepseek-v4-flash-0731',provider:{only:['digitalocean'],allow_fallbacks:false,require_parameters:true},reasoning:{effort:'none',exclude:true},stream:false,response_format:{json_schema:{name}},messages:[{role:'system',content:'Offline fixture test'},{role:'user',content:JSON.stringify({question})}]})});outputs.push(JSON.parse((await response.json()).choices[0].message.content));}assert.deepEqual(Object.keys(outputs[0]),['relationships']);assert.equal(outputs[1].scenarioAlignment,'aligned');assert.deepEqual(outputs[1].relationships,outputs[0].relationships);`;
 try{
  const result=spawnSync(process.execPath,['--input-type=module','-e',source],{cwd:directory,encoding:'utf8',timeout:30000,env:{...process.env,IMPACTLENS_PHASE4E2_MOCK:'true',IMPACTLENS_PHASE4D_LIVE_GUARD:'false',OPENROUTER_API_KEY:'sk-or-v1-'+'0'.repeat(64),TAVILY_API_KEY:'tvly-'+'0'.repeat(32),SOCIAL_SWARM_SIZE:'50',SOCIAL_MAX_DECISIONS:'350',SOCIAL_PROVIDER_MAX_CALLS:'350'}});
  assert.equal(result.status,0,result.stderr);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
