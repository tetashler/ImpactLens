import test from 'node:test';import assert from 'node:assert/strict';
import {buildMemoryStressFixture} from '../../../scripts/testing/phase4d1-memory-fixture.ts';
import {publicSociety,summaryGraph} from '../../server/society/summary.ts';import {aggregateFacts} from '../../server/society/facts.ts';
import {buildDecisionContext} from '../../society/hybrid.ts';

test('episodic, issue and decision-context extensions cannot cross the summary/graph/fact allowlists',()=>{
 const f=buildMemoryStressFixture(),internal:any=structuredClone(f.world),actor=internal.agents.find((a:any)=>a.id===f.actorId);
 const secrets=['RAW_PHASE4D1_EPISODE_CANARY','RAW_PHASE4D1_ISSUE_CANARY','RAW_PHASE4D1_CONTEXT_CANARY'];
 actor.episodic[0].privateExcerpt=secrets[0];actor.issues=[{id:'issue:'+f.earlierItemId,kind:'question',topicId:'unlisted',sourceEventId:f.earlierItemId,createdTick:1,status:'open',changedEventId:null,privateExcerpt:secrets[1]}];
 internal.hybrid.pending={...buildDecisionContext(f.world,f.actorId,f.platform),privateExcerpt:secrets[2]};
 const summary=publicSociety(internal),graph=summaryGraph({version:1,scenarioIdentity:'memory-privacy',executionIdentity:f.world.genesis.input.runId,nodes:[],edges:[],limitations:[]},summary),facts=aggregateFacts(internal,internal.events);
 const publicJson=JSON.stringify({summary,graph,facts});for(const secret of secrets){assert.ok(JSON.stringify(internal).includes(secret));assert.ok(!publicJson.includes(secret));}
 assert.ok(!('hybrid' in summary)&&!('episodic' in summary.agents[0]));
 for(const item of internal.items.filter((i:any)=>i.text.length>=30))assert.ok(!publicJson.includes(item.text));
});
