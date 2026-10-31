import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const contract=await import('../../../scripts/testing/phase4e2-live-contract.mjs').catch(()=>null);
function fixture(calls=100,tick=128,status='budget-limited'){
 const absolute=480+tick*15,day=1+Math.floor(absolute/1440),hour=Math.floor(absolute%1440/60),minute=absolute%60;
 const clock={version:1,policy:'multi-day-swarm-v1',profileId:'multi-day-50-320-v1',timeZone:'Asia/Singapore',tickMinutes:15,anchor:'Day 1 08:00',day,hour,minute,elapsedMinutes:tick*15,daily:Array.from({length:day},(_,i)=>({day:i+1,opportunities:i===day-1?calls:0,acceptedDecisions:i===day-1?calls:0}))};
 const job={version:1,id:'job',profileId:clock.profileId,status,tick,totalSteps:320,capacity:350,admittedCalls:350,remainingCalls:350-calls,acceptedDecisions:calls,reason:status==='budget-limited'?'PROVIDER_BUDGET':null,revision:tick+calls};
 const society={clock,phase:status==='completed'?'completed':'partial',tick,totalSteps:320,usage:{calls,accepted:calls,failed:0},swarm:{profileId:clock.profileId,executionPolicy:'multi-day-swarm-v1',activeAgents:50,llmCapableAgents:35,maxCalls:350,acceptedAgents:3,opportunities:calls,acceptedDecisions:calls},counts:{},platforms:[],groups:[]};
 return {runId:'run-fixture',initialActions:8,roles:4,job,society,graph:{nodes:[],edges:0}};
}

test('live preflight validates the actual process token, cost and bounded epoch grant',()=>{
 assert.ok(contract);const now=1_000_000_000_000,env={STAKEHOLDER_LIVE_ENABLED:'true',SOCIAL_LLM_ENABLED:'true',SOCIAL_SWARM_SIZE:'50',SOCIAL_MAX_DECISIONS:'350',SOCIAL_PROVIDER_MAX_CALLS:'350',SOCIAL_PROVIDER_TOKEN_LIMIT:'16000000',SOCIAL_PROVIDER_COST_USD:'1',SOCIAL_PROVIDER_DEADLINE_MS:String(now+5_400_000)};
 const grant=contract.liveProviderAdmission(env,now);assert.deepEqual(grant,{maxCalls:350,reservedTokens:16_000_000,costUsd:1,deadlineMs:now+5_400_000});
 for(const patch of [{SOCIAL_PROVIDER_COST_USD:'8'},{SOCIAL_PROVIDER_TOKEN_LIMIT:'32000000'},{SOCIAL_PROVIDER_DEADLINE_MS:String(now-1)},{SOCIAL_PROVIDER_DEADLINE_MS:String(now+5_400_001)},{SOCIAL_LLM_ENABLED:'false'}])assert.throws(()=>contract.liveProviderAdmission({...env,...patch},now));
 assert.deepEqual(contract.frozenLiveProviderAdmission(grant,{createdAtMs:now,providerAdmission:grant}),grant);assert.throws(()=>contract.frozenLiveProviderAdmission({...grant,costUsd:8},{createdAtMs:now,providerAdmission:grant}));
});

test('live acceptance distinguishes a below350 budget partial from a completed clock and rejects unfinished or contradictory chronology',()=>{
 assert.ok(contract);const partial=fixture();assert.equal(contract.liveAcceptedTerminal(partial.job,partial.society),'budget-limited');
 const complete=fixture(280,320,'completed');assert.equal(contract.liveAcceptedTerminal(complete.job,complete.society),'completed');
 for(const status of ['running','paused','failed','capacity-limited'])assert.throws(()=>contract.liveAcceptedTerminal({...partial.job,status},partial.society));
 assert.throws(()=>contract.liveAcceptedTerminal(complete.job,{...complete.society,clock:{...complete.society.clock,day:3}}));
});

async function browserAcceptance(value:ReturnType<typeof fixture>){
 const source=readFileSync(new URL('../../../scripts/testing/phase4e2-live-browser.mjs',import.meta.url),'utf8'),run=runInNewContext('('+source+')');
 const context:any={window:{__phase4e2LiveConfig:{operation:'inspect'},__impactlensPhase4e1Live:true,__phase4e2LiveAudit:{latest:value,privacyFailed:false,network:[],responses:[],errors:[],explores:1,access:null,progress:null}},document:{querySelectorAll:()=>[]},fetch:async()=>({})};
 const page:any={url:()=> 'http://127.0.0.1:3201/',evaluate:async(fn:Function,...args:unknown[])=>{context.args=args;return runInNewContext('('+fn.toString()+')(...args)',context);},getByRole:()=>({click:async()=>{throw Error('ACCEPTANCE_REACHED_UI');}})};
 page.context=()=>({browser:()=>({contexts:()=>[{pages:()=>[page]}]})});return run(page);
}
test('browser inspection permits honest budget-limited usage below350 before reaching desktop checks',async()=>{await assert.rejects(browserAcceptance(fixture()),/ACCEPTANCE_REACHED_UI/);});
test('browser inspection rejects a completed320 clock with incorrect fictional day metadata',async()=>{const value=fixture(280,320,'completed');value.society.clock.day=3;await assert.rejects(browserAcceptance(value),/LIVE_CALENDAR/);});
