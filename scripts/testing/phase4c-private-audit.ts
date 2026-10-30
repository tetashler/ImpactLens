/** Privileged read-only audit. Prints/writes only counts, metadata and fixed diagnostics, never conversations. */
import {readFileSync,writeFileSync,statSync} from 'node:fs';
import {join} from 'node:path';import {createHash} from 'node:crypto';
import {replayHybrid,parseSocialDecision} from '../../lib/society/hybrid.ts';
import {saveSociety,restoreSociety,act} from '../../lib/society/engine.ts';
import {canAccessItem} from '../../lib/society/communication.ts';
import {publicSociety} from '../../lib/server/society/summary.ts';
import {verifyStakeholderRun} from '../../lib/stakeholder-simulation/identities.ts';
import {canonical,ensure} from '../../lib/experiments/validation.ts';
const [runId,label]=process.argv.slice(2);ensure(/^run-[A-Za-z0-9._:-]{1,150}$/.test(runId)&&/^run[12]$/.test(label));
const store=JSON.parse(readFileSync(join('data/derived/agents/accepted-private',createHash('sha256').update(runId).digest('hex')+'.json'),'utf8'));
await verifyStakeholderRun(store.execution.run);
const journal=join('data/derived/agents/social-sessions',store.sessionId+'.jsonl');ensure(statSync(journal).size<66*1024*1024);
const row=JSON.parse(readFileSync(journal,'utf8').trimEnd().split('\n').at(-1)!);
const began=performance.now(),world=replayHybrid(row.input,row.tick,row.hybrid.records,row.hybrid.pending);
ensure(canonical(restoreSociety(saveSociety(world)))===canonical(world),'REPLAY_MISMATCH');
const replayMs=performance.now()-began,summary=publicSociety(world);ensure(canonical(summary)===canonical(store.publicRun.society),'SUMMARY_MISMATCH');
const strings=(v:unknown):string[]=>typeof v==='string'?[v]:v&&typeof v==='object'?Object.values(v).flatMap(strings):[];
const internalTexts=[...store.execution.run.events.map((e:any)=>e.statement),...world.items.map(i=>i.text),...world.hybrid!.records.flatMap(r=>r.decision?.text?[r.decision.text]:[])].filter(s=>typeof s==='string'&&s.length>=40);
const publicStrings=strings(store.publicRun),leaks=internalTexts.filter(text=>publicStrings.some(p=>p.includes(text))).length;ensure(leaks===0,'PUBLIC_CONTENT_LEAK');
const decisions=world.hybrid!.records.map((r,index)=>{
 const pending=replayHybrid(row.input,r.context.tick,world.hybrid!.records.slice(0,index),r.context);
 ensure(r.context.items.every(i=>canAccessItem(pending,r.context.actor.id,pending.items.find(p=>p.id===i.id)!)),'HIDDEN_CONTEXT');
 if(r.decision)parseSocialDecision(r.decision,r.context);
 const target=r.context.items.find(i=>i.id===r.decision?.targetId),words=(s:string)=>(s.toLowerCase().match(/[a-z]{4,}/g)??[]),tokens=new Set(words(r.decision?.text??''));
 return {index,status:r.status,error:r.error,action:r.decision?.action??null,platform:r.context.platform,visibleItems:r.context.items.length,memories:r.context.memories.length,earlierCrossPlatformMemories:r.context.memories.filter(m=>m.platform!==r.context.platform).length,referencedMemories:r.decision?.memoryIds.length??0,seedVisible:r.context.items.some(i=>pending.events.some(e=>e.id===i.id&&e.sourceEventId)),privateContextItems:r.context.items.filter(i=>i.groupId).length,targetWordOverlap:target?[...new Set(words(target.text))].filter(t=>tokens.has(t)).length:null,stanceProposed:!!r.decision?.stance,validation:r.usage?.socialValidationRule??null};
});
const groupChecks=(world.groups??[]).map(g=>{
 ensure(world.agents.some(a=>a.id===g.creatorId)&&g.members.every(m=>world.agents.some(a=>a.id===m.agentId))&&world.events.some(e=>e.id===g.createdEventId&&e.type==='group-create'),'GROUP_IDENTITY');
 let privateReads=0;for(const [index,e]of world.events.entries()){if(e.groupId!==g.id||e.type!=='read')continue;privateReads++;const member=g.members.find(m=>m.agentId===e.actorId&&m.joinedSequence<=index&&(m.leftSequence===null||index<m.leftSequence));const target=world.events.findIndex(t=>t.id===e.targetId);ensure(member&&target>=member.joinedSequence,'GROUP_HISTORY');}
 const message=world.items.find(i=>i.groupId===g.id),outsider=world.agents.find(a=>!g.members.some(m=>m.agentId===a.id&&m.leftSequence===null));let nonmemberRejected:boolean|null=null;if(message&&outsider){try{act(world,{actorId:outsider.id,type:'read',platform:g.platform,targetId:message.id});nonmemberRejected=false;}catch{nonmemberRejected=true;}ensure(nonmemberRejected,'GROUP_PERMISSION');}
 return {id:g.id,platform:g.platform,creationEvent:g.createdEventId,memberRecords:g.members.length,messages:world.items.filter(i=>i.groupId===g.id).length,privateReads,nonmemberRejected};
});
const result={label,runId,planId:store.execution.plan.planId,sessionId:store.sessionId,status:store.execution.run.status,question:store.publicRun.question,initialActions:store.execution.run.events.length,initialRounds:store.execution.inference.roundsCompleted,roles:store.publicRun.roles,planning:store.execution.planning.records,initialInference:store.execution.inference.records,grounding:{status:store.execution.plan.grounding?.status,usage:store.execution.plan.grounding?.usage,sources:store.publicRun.sources},entityTypes:[...new Set(store.publicRun.graph.nodes.map((n:any)=>n.entityType))],worldEntities:store.execution.plan.draft.ontology?.entities.map((e:any)=>({id:e.id,name:e.name,typeId:e.typeId})),graph:{nodes:store.publicRun.graph.nodes.length,edges:store.publicRun.graph.edges.length},summary:{phase:summary.phase,tick:summary.tick,minutes:summary.minutes,counts:summary.counts,usage:summary.usage,platforms:summary.platforms,groups:summary.groups},decisions,groupChecks,privacy:{internalTextsCompared:internalTexts.length,publicLiteralLeaks:leaks,publicContainsWorld:'world' in store.publicRun||'hybrid' in store.publicRun},replay:{exact:true,ms:replayMs},semanticLimit:'Word overlap is a coarse diagnostic, not proof of comprehension. No private dialogue is copied.'};
writeFileSync('tmp/phase4c-live/'+label+'-audit.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({runId,initialActions:result.initialActions,social:summary.usage,phase:summary.phase,counts:summary.counts,platforms:summary.platforms.map(p=>p.name),groups:groupChecks.length,privacy:result.privacy,replay:result.replay,decisionDiagnostics:decisions}));
