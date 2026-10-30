import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {buildTopicMemoryFixtures,topicMemoryPolicyArm} from '../../../scripts/testing/phase4d2-memory-fixture.ts';
import {publicSociety,summaryGraph} from '../../server/society/summary.ts';import {aggregateFacts} from '../../server/society/facts.ts';
import {buildDecisionContext} from '../../society/hybrid.ts';

test('topic scoring, selected memories and private-context canaries stay outside summary graph/report fact payloads',()=>{
 for(const f of buildTopicMemoryFixtures()){
  const arm=topicMemoryPolicyArm(f,'episodic-topic-v2'),world:any=structuredClone(arm.world),actor=world.agents.find((a:any)=>a.id===f.actorId);
  actor.episodic[0].privateExcerpt='RAW_TOPIC_EPISODE_CANARY';world.hybrid.pending={...arm.context,privateExcerpt:'RAW_TOPIC_CONTEXT_CANARY'};
  const summary=publicSociety(world),graph=summaryGraph({version:1,scenarioIdentity:'topic-privacy',executionIdentity:world.genesis.input.runId,nodes:[],edges:[],limitations:[]},summary),encoded=JSON.stringify({summary,graph,facts:aggregateFacts(world,world.events)});
  assert.doesNotMatch(encoded,/RAW_TOPIC_|privateExcerpt|topicSelection|selectedEventIds/);
  for(const item of world.items.filter((i:any)=>i.text.length>=24))assert.ok(!encoded.includes(item.text));
  let diagnostic:any;buildDecisionContext(arm.world,f.actorId,f.platform,m=>diagnostic=m);
  assert.doesNotMatch(JSON.stringify(diagnostic),/Payroll|take-home|RAW_TOPIC_|\"text\"|\"goal\"/);
  assert.ok(!('episodic' in summary.agents[0])&&!('hybrid' in summary)&&!('events' in summary));
 }
});
