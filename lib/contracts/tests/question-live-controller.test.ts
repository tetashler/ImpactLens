import test from 'node:test';
import assert from 'node:assert/strict';
import {createQuestionSimulation} from '../../question-simulation/client.ts';
import {createDeepseekTransport,MODEL} from '../../server/inference/deepseek.ts';
import {LIVE_LIMITS} from '../../server/inference/service.ts';
import {handleStakeholderRequest} from '../../server/stakeholder-simulation/service.ts';
import type {TurnContext} from '../../stakeholder-simulation/contract.ts';

const geometry={version:1 as const,scenarioId:'live-question-controller',features:[]};
const asean='What if Singapore leaves ASEAN?',tax='What happens if Singapore increases tax on imported goods?';
const status=(enabled=true,configured=true)=>({version:1,model:MODEL,gateway:'OpenRouter',provider:'digitalocean',fallback:false,connection:configured?'configured':'not-configured',enabled,servingIdentityVerified:false,limits:LIVE_LIMITS});
function network(options:{enabled?:boolean;configured?:boolean;failAfter?:number;hold?:boolean;wrongAttempt?:boolean}={}){
  const requests:{version:number;attemptId:string;input:unknown}[]=[],calls:TurnContext[]=[],pending:{resolve:()=>void}[]=[];
  const fetcher:typeof fetch=async(url,init)=>{
    if(url==='/api/inference/status')return Response.json(status(options.enabled??true,options.configured??true));
    assert.equal(url,'/api/stakeholder-simulate');const body=JSON.parse(String(init?.body));requests.push(body);assert.equal(body.version,2);
    const transport=createDeepseekTransport({key:'test-only-placeholder',fetcher:async(_url,request)=>{
      const sent=JSON.parse(String(request?.body));assert.deepEqual(sent.provider,{only:['digitalocean'],allow_fallbacks:false,require_parameters:true});const c=JSON.parse(sent.messages[1].content) as TurnContext;calls.push(c);
      if(options.failAfter!==undefined&&calls.length>options.failAfter)return Response.json({error:'deliberate upstream failure'},{status:500});
      const other=[...c.previousEvents].reverse().find(e=>e.roleId!==c.role.id),own=[...c.previousEvents].reverse().find(e=>e.roleId===c.role.id);
      const action={type:other?'response':'argument',addressedRoleId:other?.roleId??null,statement:`Mock-transport fictional perspective from ${c.role.id}; actual outcomes remain unknown.`,previousEventIds:other?[other.id]:[],evidenceFindingIds:[],assumptionIds:c.input.assumptions.map(a=>a.id),reasoningSummary:'Controlled HTTP fixture, not paid inference.',uncertainties:['Tax rates, capacity and actual reactions remain unknown.'],position:own?.position??'information-seeking',topics:['uncertainty']};
      return Response.json({id:`mock-controller-${calls.length}`,model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify(action)}}],usage:{prompt_tokens:100,completion_tokens:50,total_tokens:150,cost:0.0001}});
    }});
    const response=await handleStakeholderRequest(new Request('http://localhost/api/stakeholder-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),{live:{enabled:true,key:'test-only-placeholder',transport}});
    if(options.hold)await new Promise<void>(resolve=>pending.push({resolve}));
    if(options.wrongAttempt){const value=await response.json();return Response.json({...value,attemptId:'wrong-attempt'});}
    return response;
  };return {fetcher,requests,calls,pending};
}
async function waitFor(check:()=>boolean){for(let n=0;n<1000;n++){if(check())return;await new Promise(resolve=>setTimeout(resolve,2));}throw Error('Expected execution boundary not reached');}

test('app-selected live mode fails honestly when disabled or unconfigured, without scripted fallback',async()=>{
  for(const settings of[{enabled:false},{configured:false}]){const net=network(settings),controller=createQuestionSimulation({execution:'live',fetcher:net.fetcher});controller.invalidate({question:asean,geometry,geometryRevision:0});await controller.start();assert.equal(controller.getSnapshot().phase,'error');assert.match(controller.getSnapshot().error??'',/Live AI simulation is not configured/);assert.equal(controller.getSnapshot().run,null);assert.equal(net.requests.length,0);assert.ok(controller.getSnapshot().record);controller.dispose();}
});
test('one question runs v2 import-tax through real sequential transport and retains a distinct immutable source',async()=>{
  const net=network(),controller=createQuestionSimulation({execution:'live',fetcher:net.fetcher});controller.invalidate({question:tax,geometry,geometryRevision:0});await controller.start();const s=controller.getSnapshot();assert.equal(s.phase,'completed');assert.equal(net.requests.length,1);assert.equal(net.calls.length,8);assert.equal(s.run?.execution.mode,'llm-assisted');assert.equal(s.live?.domain,'import-tax');assert.ok(s.run?.inputSnapshot.stakeholderRoles.some(r=>r.id==='foreign-supplier'));assert.equal(s.record?.execution.status,'not-executed');assert.equal(s.live?.source.sourceExperimentId,s.record?.experimentId);assert.equal(s.live?.response.inference.successfulCalls,8);assert.equal(s.run?.events.length,8);assert.ok(s.run?.events[4].previousEventIds.length);assert.equal(s.linked,null);assert.ok(Object.isFrozen(s.history[0]));controller.dispose();
});
test('partial live runs retain accepted events, diagnostics and archive rather than fabricate completion',async()=>{
  const net=network({failAfter:2}),controller=createQuestionSimulation({execution:'live',fetcher:net.fetcher});controller.invalidate({question:asean,geometry,geometryRevision:0});await controller.start();const s=controller.getSnapshot();assert.equal(s.phase,'partial');assert.equal(s.run?.status,'partial');assert.equal(s.run?.events.length,2);assert.equal(s.live?.response.inference.failedCalls,1);assert.equal(s.history[0].run?.runId,s.run?.runId);controller.dispose();
});
test('question and geometry A-B-A, cancellation and archive selection reject late v2 responses',async()=>{
  const net=network({hold:true}),controller=createQuestionSimulation({execution:'live',fetcher:net.fetcher});controller.invalidate({question:tax,geometry,geometryRevision:0});const old=controller.start();await waitFor(()=>net.pending.length===1);controller.invalidate({question:asean,geometry,geometryRevision:1});controller.invalidate({question:tax,geometry,geometryRevision:2});const current=controller.start();await waitFor(()=>net.pending.length===2);net.pending[1].resolve();await current;const accepted=controller.getSnapshot().run?.runId;net.pending[0].resolve();await old;assert.equal(controller.getSnapshot().run?.runId,accepted);assert.equal(controller.getSnapshot().history.length,1);assert.equal(controller.getSnapshot().live?.source.geometryContext?.revision,2);
  const next=controller.start();await waitFor(()=>net.pending.length===3);controller.inspectArchive(controller.getSnapshot().history[0].id);await next;net.pending[2].resolve();await new Promise(resolve=>setTimeout(resolve,5));assert.equal(controller.getSnapshot().run,null);assert.ok(controller.getSnapshot().selectedArchiveId);controller.dispose();
});
test('wrong v2 attempt fails safely and retry uses a fresh attempt without changing mode',async()=>{
  const net=network({wrongAttempt:true}),controller=createQuestionSimulation({execution:'live',fetcher:net.fetcher});controller.invalidate({question:tax,geometry,geometryRevision:0});await controller.start();assert.equal(controller.getSnapshot().phase,'error');assert.equal(controller.getSnapshot().run,null);await controller.start();assert.notEqual(net.requests[0].attemptId,net.requests[1].attemptId);assert.ok(net.requests.every(r=>r.version===2));controller.dispose();
});
test('MRT live dialogue requires confirmed geometry and unsupported local/tax questions never pick presets',async()=>{
  const net=network(),controller=createQuestionSimulation({execution:'live',fetcher:net.fetcher});for(const question of['What if a new polyclinic opened in Sengkang?','What if Singapore raises property tax?','What if Singapore changes housing grants?']){controller.invalidate({question,geometry,geometryRevision:0});await controller.start();assert.equal(controller.getSnapshot().phase,'unsupported');}controller.invalidate({question:'What if Singapore builds a new MRT line?',geometry,geometryRevision:0});await controller.start();assert.equal(controller.getSnapshot().phase,'needs-map-review');assert.equal(net.requests.length,0);controller.dispose();
});
test('failed status refresh clears earlier configured display and raw prefixed errors cannot escape',async()=>{
  let fail=false;const controller=createQuestionSimulation({execution:'live',fetcher:async()=>{if(fail)throw new Error('status offline');return Response.json(status());}});
  await controller.refreshInferenceStatus();assert.equal(controller.getSnapshot().inferenceStatus?.connection,'configured');fail=true;await controller.refreshInferenceStatus();assert.equal(controller.getSnapshot().inferenceStatus,null);controller.dispose();
  const leaking=createQuestionSimulation({execution:'live',fetcher:async url=>{if(url==='/api/inference/status')return Response.json(status());throw new Error('Live inference PRIVATE_UPSTREAM_DETAIL');}});leaking.invalidate({question:tax,geometry,geometryRevision:0});await leaking.start();assert.equal(leaking.getSnapshot().phase,'error');assert.doesNotMatch(leaking.getSnapshot().error??'',/PRIVATE_UPSTREAM_DETAIL/);leaking.dispose();
});
test('manual status refresh shares pending preparation instead of cancelling an otherwise valid live start',async()=>{
  const net=network();let release!:(r:Response)=>void,started=false,statusCalls=0;const controller=createQuestionSimulation({execution:'live',fetcher:async(url,init)=>{if(url==='/api/inference/status'){statusCalls++;started=true;return new Promise(resolve=>release=resolve);}return net.fetcher(url,init);}});controller.invalidate({question:tax,geometry,geometryRevision:0});const start=controller.start();await waitFor(()=>started);const refresh=controller.refreshInferenceStatus();release(Response.json(status()));await Promise.all([start,refresh]);assert.equal(statusCalls,1);assert.equal(controller.getSnapshot().phase,'completed');controller.dispose();
});
