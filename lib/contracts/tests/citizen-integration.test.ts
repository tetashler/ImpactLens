import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {getCitizenDataset} from '../../server/citizen-grounding/data.ts';
import {calculateCitizenImpact} from '../../server/citizen-grounding/api.ts';
import {citizenInitializer} from '../../server/citizen-grounding/session.ts';
import {getBaseline} from '../../server/mrt-service.ts';
import {illustrativeLine} from '../../../prototype/mrt/examples/illustrative-line.ts';
import {calculateCitizenCommutes} from '../../citizen-grounding/commute.ts';
import {mockPersonalityRoster} from '../../citizen-grounding/personality.ts';
import {createCitizenGrounding} from '../../citizen-grounding/social.ts';
import {socialOperation,readSocialSession,checkpointSocialSession} from '../../server/society/service.ts';
import {publicSociety} from '../../server/society/summary.ts';
import {createSociety} from '../../society/engine.ts';
import {controlledIds,replayHybrid} from '../../society/hybrid.ts';
import {multiDaySwarmPolicy} from '../../society/swarm.ts';
import {canonical} from '../../experiments/validation.ts';
import {phase4eSource,phase4eCommunication,phase4eFetcher,evictFixtureSession} from '../../../scripts/testing/phase4e-fixture.ts';

test('trusted citizen initializer connects the same population to society, provider serialization and exact recovery',async()=>{
 const dataset=getCitizenDataset(),commutes=calculateCitizenCommutes(dataset,getBaseline('2026-10-27'),illustrativeLine);
 const directory=mkdtempSync(join(tmpdir(),'citizen-society-')),source=await phase4eSource('citizen-integration');
 const contexts:any[]=[];
 const mock=phase4eFetcher((c:any)=>{
  contexts.push(c);const choice=c.choices.find((o:any)=>o.action==='post'||o.action==='message')??c.choices.find((o:any)=>o.action==='inactive');
  return {choiceId:choice.id,text:['post','message'].includes(choice.action)?'The commute route needs a practical review before the proposed service begins.':null,motivation:'Synthetic capability fixture using actual supplied facts.',recallIds:[],stanceId:'keep',discussion:{topicIds:[],argument:'unspecified'},issueChoiceId:null,issueEvidence:null,factIds:choice.action==='inactive'?[]:['fact-employment']};
 });
 const dependencies={directory,enabled:true,key:'offline-only',communication:phase4eCommunication(),swarm:multiDaySwarmPolicy(50,4,320),fetcher:mock.fetcher,admission:{maxCalls:4},citizenGrounding:async(preview:any)=>{
  const active=preview.agents.map((a:any)=>a.id),capable=controlledIds(preview),roster=await mockPersonalityRoster({runId:source.runId,capableIds:capable,backgroundIds:active.filter((id:string)=>!capable.includes(id)),seed:'citizen-integration'});
  return createCitizenGrounding(dataset,commutes,roster,active,capable);
 }};
 let state=await socialOperation({operation:'start',run:source},dependencies);
 const contradictory=structuredClone(state.world.genesis.input);contradictory.acceptedActions[0].statement='I work as a nurse in Novena.';const quoted=createSociety(contradictory);const seed=quoted.events.find(e=>e.sourceEventId===contradictory.acceptedActions[0].id)!;assert.match(seed.text!,/scenario-role quotation/);assert.match(seed.text!,/not this citizen/);assert.equal(quoted.genesis.input.acceptedActions[0].statement,'I work as a nurse in Novena.');
 assert.equal(state.world.genesis.version,6);assert.equal(state.world.genesis.input.intelligence?.context,'conversation-menu-v4');
 for(let i=0;mock.calls.length<4&&i<500;i++)state=await socialOperation({operation:'step',sessionId:state.sessionId,revision:state.revision},dependencies);
 const publicView=publicSociety(state.world);assert.ok(publicView.limitations.some(l=>l.startsWith('citizen-public-view-v1:')));assert.ok(Buffer.byteLength(JSON.stringify(publicView))<=262144);const originalStatus=state.world.status;publicView.phase='partial';assert.equal(state.world.status,originalStatus);
 assert.equal(mock.calls.length,4);assert.equal(state.world.hybrid!.records.filter(r=>r.status==='accepted').length,4);
 assert.ok(contexts.every(c=>c.grounding.citizenId===c.actor.id&&JSON.stringify(c.grounding).length<4096));
 assert.ok(contexts.every(c=>!Object.hasOwn(c.grounding,'profiles')));
 const replay=replayHybrid(state.world.genesis.input,state.world.tick,state.world.hybrid!.records,state.world.hybrid!.pending);
 assert.equal(canonical(replay),canonical(state.world));
 await checkpointSocialSession(state.sessionId,dependencies);const before=readFileSync(join(directory,state.sessionId+'.jsonl'));
 evictFixtureSession(directory,state.sessionId);const restored=await readSocialSession(state.sessionId,{...dependencies,citizenGrounding:undefined});
 assert.equal(canonical(restored.world),canonical(state.world));assert.deepEqual(readFileSync(join(directory,state.sessionId+'.jsonl')),before);assert.equal(mock.calls.length,4);
 // Actual API calculation -> private cache -> trusted initializer preserves identity;
 // no browser profile or additional provider request is involved.
 const impact=await calculateCitizenImpact({serviceDate:'2026-10-27',intervention:illustrativeLine});
 const grounded=await citizenInitializer(impact.publicResult.runId,mockPersonalityRoster)(state.world);
 assert.equal(grounded.scenarioFingerprint,impact.run.scenarioFingerprint);assert.equal(grounded.datasetId,dataset.id);
 assert.deepEqual(grounded.profiles.map(p=>p.citizen.id),state.world.agents.map(a=>a.id));assert.equal(grounded.personalities.runId,source.runId);assert.equal(mock.calls.length,4);
 assert.throws(()=>citizenInitializer('unknown-private-impact',async()=>{throw Error('UNEXPECTED_INITIALIZATION');}));
});
test('browser start JSON cannot supply a citizen bundle or personality/provider allowance',async()=>{
 const source=await phase4eSource('citizen-untrusted-start');let dispatches=0;
 await assert.rejects(()=>socialOperation({operation:'start',run:source,citizenGrounding:{profiles:[]},providerGrant:999},{directory:mkdtempSync(join(tmpdir(),'citizen-untrusted-')),enabled:true,key:'offline',fetcher:async()=>{dispatches++;throw Error('UNEXPECTED_DISPATCH');}}));
 assert.equal(dispatches,0);
});
