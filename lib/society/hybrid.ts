/** Pure context, validation and replay. Provider calls live exclusively in the server adapter. */
import {canonical,ensure,freezeSnapshot,object,text} from '../experiments/validation.ts';
import {act,createSociety,stepSociety} from './engine.ts';
import {threadPath} from './exposure.ts';
import {DECISION_LIMITS as L,type DecisionContext,type SocialDecision,type SocialDecisionRecord} from './decision-contract.ts';
import type {SocietyInput,SocietyWorld,Platform} from './contract.ts';
import type {InferenceCallRecord} from '../server/inference/deepseek.ts';
export const SOCIAL_RULES=['SOCIAL_SHAPE','SOCIAL_TARGET','SOCIAL_MEMORY','SOCIAL_PLATFORM','SOCIAL_TEXT','SOCIAL_STANCE','SOCIAL_STALE','SOCIAL_BUDGET'] as const;
export class SocialDecisionError extends Error {readonly rule:typeof SOCIAL_RULES[number];constructor(rule:typeof SOCIAL_RULES[number]){super(rule);this.rule=rule;}}
function check(v:unknown,r:typeof SOCIAL_RULES[number]):asserts v {if(!v)throw new SocialDecisionError(r);}
const setHybrid=(w:SocietyWorld,hybrid:NonNullable<SocietyWorld['hybrid']>):SocietyWorld=>Object.freeze({...w,events:Object.freeze([...w.events]) as unknown as SocietyWorld['events'],hybrid:Object.freeze({...hybrid,records:Object.freeze([...hybrid.records]) as unknown as SocialDecisionRecord[]})});
export function controlledIds(w:SocietyWorld){return w.genesis.input.hybrid?Object.values(w.genesis.bindings).slice(0,w.genesis.input.hybrid.selectedAgents):[];}
export function hybridBudget(w:SocietyWorld){const c=w.genesis.input.hybrid,rs=w.hybrid?.records??[];const tokens=rs.reduce((n,r)=>n+r.reservedTokens,0),cost=rs.reduce((n,r)=>n+(r.usage?.costUsd??r.reservedCostUsd),0);return {calls:rs.length,tokens,costUsd:cost,exhausted:!c||rs.length>=c.maxCalls||tokens+L.contextBytes+10000+L.outputTokens>c.reservedTokens||cost+L.unknownCostUsd>c.costUsd};}
export function buildDecisionContext(w:SocietyWorld,actorId:string,platform:Platform):DecisionContext{
 const a=w.agents.find(a=>a.id===actorId)!;
 const eligible=a.memory.filter(m=>m.kind==='exposure'||m.kind==='authored');
 const latest=eligible.findLast(m=>m.kind==='exposure'),cross=eligible.findLast(m=>m.kind==='exposure'&&m.platform!==platform);
 const terms=new Set((a.goal+' '+(w.items.find(i=>i.id===latest?.itemId)?.text??'')).toLowerCase().match(/[a-z]{4,}/g)??[]);
 const ranked=eligible.map((m,index)=>({m,index,score:(w.items.find(i=>i.id===m.itemId)?.text.toLowerCase().match(/[a-z]{4,}/g)??[]).filter(t=>terms.has(t)).length+index/Math.max(1,eligible.length)})).sort((x,y)=>y.score-x.score||y.index-x.index);
 const chosen=new Set([latest,cross].filter(m=>m!==undefined));for(const {m}of ranked){if(chosen.size>=L.memories)break;chosen.add(m);}
 const selected=eligible.filter(m=>chosen.has(m));
 const ids=[...new Set([...selected].reverse().flatMap(m=>m.exposedIds))];
 const boundedIds:string[]=[];for(const id of ids){const path=threadPath(w,id);if(!path.every(p=>a.seen.includes(p)))continue;const extra=path.filter(p=>!boundedIds.includes(p));if(boundedIds.length+extra.length<=L.items)boundedIds.push(...extra);}
 const items=boundedIds.map(id=>w.items.find(i=>i.id===id)).map(i=>({id:i!.id,actorId:i!.actorId,platform:i!.platform,parentId:i!.parentId,text:i!.text,media:i!.media==='synthetic-card'?'Fictional visual card about the scenario; no real photograph.':'Text discussion'}));
 const retained=new Set(items.map(i=>i.id));
 const memories=selected.map(m=>({eventId:m.eventId,itemIds:m.exposedIds.filter(id=>retained.has(id)),platform:m.platform,kind:m.kind,text:(w.items.find(i=>i.id===m.itemId)?.text??'').slice(0,320)})).filter(m=>m.itemIds.length);
 const result:DecisionContext={version:1,id:`decision-${w.genesis.input.runId}-${w.hybrid!.records.length}`,runId:w.genesis.input.runId,tick:w.tick,actor:{id:a.id,label:a.label,goal:a.goal,position:a.opinion,resistance:a.resistance,priorities:a.role?.goals.slice(0,3)??[a.goal],demographic:a.resident?{ageBand:a.resident.ageGroup,sex:a.resident.sex,planningArea:a.resident.planningAreaName,subzone:a.resident.subzoneName,sourceYear:2020,status:'Aggregate-constrained fictional assignment, not an observed person.'}:null},platform,question:w.genesis.input.question,blockedTargets:w.events.filter(e=>e.actorId===a.id&&retained.has(e.targetId??'')&&['like','upvote','downvote'].includes(e.type)).map(e=>({action:e.type,targetId:e.targetId!})),recentDecisions:(w.hybrid?.records??[]).filter(r=>r.context.actor.id===a.id&&r.decision).slice(-2).map(r=>({tick:r.context.tick,platform:r.decision!.platform,action:r.decision!.action,targetId:r.decision!.targetId,motivation:r.decision!.motivation})),connections:w.ties.filter(t=>t.source===a.id).slice(0,6).map(t=>({id:t.target,handle:w.agents.find(a=>a.id===t.target)!.handle})),items,memories,actions:['read','post','comment','reply','like',...(platform==='reddit'?['upvote','downvote']:[]),'follow','unfollow','share','inactive'],assumptions:w.genesis.assumptions.slice(0,6),...(w.genesis.input.briefing?{sharedBriefing:w.genesis.input.briefing}:{})};
 check(new TextEncoder().encode(canonical(result)).length<=L.contextBytes,'SOCIAL_SHAPE');return freezeSnapshot(result);
}
/** Advances rules once, then records a real encounter before offering one selected agent a decision. */
export function prepareHybridStep(original:SocietyWorld):SocietyWorld{
 if(!original.hybrid||original.hybrid.pending)return original;
 let w=stepSociety(original);if(w===original||w.tick%2||hybridBudget(w).exhausted)return w;
 const ids=controlledIds(w);if(!ids.length)return w;const index=(w.hybrid!.records.length)%ids.length,actorId=ids[index],prior=w.hybrid!.records.filter(r=>r.context.actor.id===actorId).length;
 const platform:Platform=(prior+index)%2?'reddit':'instagram';
 // Use the same bounded access policy as the feed, never a global post registry.
 const a=w.agents.find(a=>a.id===actorId)!;
 const candidates=visible(w,actorId,platform);const replyRoot=candidates.find(root=>w.items.some(i=>i.actorId!==actorId&&!a.seen.includes(i.id)&&threadPath(w,i.id)[0]===root.id&&w.events.find(e=>e.id===i.id)?.source==='social-model'));const target=replyRoot??candidates.find(i=>!a.seen.includes(i.id))??candidates[0];
 if(!target)return w;
 w=act(w,{actorId,type:'read',platform,targetId:target.id});
 return setHybrid(w,{records:w.hybrid!.records,pending:buildDecisionContext(w,actorId,platform)});
}
import {visibleFeed as visible} from './engine.ts';
export function parseSocialDecision(value:unknown,c:DecisionContext):SocialDecision{
 let d:Record<string,unknown>;try{d=object(value,['action','platform','targetId','text','memoryIds','stance','motivation']);}catch{throw new SocialDecisionError('SOCIAL_SHAPE');}
 check(typeof d.action==='string'&&c.actions.includes(d.action),'SOCIAL_SHAPE');
 check(d.platform==='reddit'||d.platform==='instagram','SOCIAL_PLATFORM');check(d.action==='share'||d.platform===c.platform,'SOCIAL_PLATFORM');
 check(Array.isArray(d.memoryIds)&&d.memoryIds.length<=L.memories&&new Set(d.memoryIds).size===d.memoryIds.length&&d.memoryIds.every(id=>c.memories.some(m=>m.eventId===id)),'SOCIAL_MEMORY');
 check(!c.blockedTargets?.some(t=>t.action===d.action&&t.targetId===d.targetId),'SOCIAL_TARGET');
 const target=c.items.find(i=>i.id===d.targetId),person=c.connections.find(p=>p.id===d.targetId);
 if(['post','inactive'].includes(d.action))check(d.targetId===null,'SOCIAL_TARGET');
 else if(['follow','unfollow'].includes(d.action))check(person&&d.targetId!==c.actor.id,'SOCIAL_TARGET');
 else {check(target,'SOCIAL_TARGET');check(d.action==='share'?target.platform!==d.platform:target.platform===d.platform,'SOCIAL_PLATFORM');check(d.memoryIds.some(id=>c.memories.some(m=>m.eventId===id&&m.itemIds.includes(target.id))),'SOCIAL_MEMORY');if(d.action==='comment')check(!target.parentId,'SOCIAL_TARGET');if(d.action==='reply')check(target.parentId,'SOCIAL_TARGET');}
 if(['post','comment','reply'].includes(d.action))check(typeof d.text==='string'&&d.text.trim().length>0&&d.text.length<=1000&&!/[<>\u0000-\u0008]|https?:\/\//i.test(d.text),'SOCIAL_TEXT');else check(d.text===null,'SOCIAL_TEXT');
 check(typeof d.motivation==='string'&&d.motivation.trim().length>0&&d.motivation.length<=240&&!/[<>\u0000-\u0008]/.test(d.motivation),'SOCIAL_TEXT');
 if(d.stance!==null){let stance;try{stance=object(d.stance,['target','exposureId']);}catch{throw new SocialDecisionError('SOCIAL_STANCE');}check(typeof stance.target==='number'&&Number.isFinite(stance.target)&&stance.target>=-1&&stance.target<=1,'SOCIAL_STANCE');check(d.memoryIds.includes(stance.exposureId)&&c.memories.some(m=>m.eventId===stance.exposureId&&m.kind==='exposure'&&m.itemIds.some(id=>c.items.some(i=>i.id===id&&i.actorId!==c.actor.id))),'SOCIAL_STANCE');}
 return freezeSnapshot(d as unknown as SocialDecision);
}
export function decisionSchema(c:DecisionContext){const properties={action:{type:'string',enum:c.actions},platform:{type:'string',enum:['reddit','instagram']},targetId:{type:['string','null'],enum:[null,...c.items.map(i=>i.id),...c.connections.map(p=>p.id)]},text:{type:['string','null'],maxLength:1000},memoryIds:{type:'array',maxItems:L.memories,uniqueItems:true,items:{type:'string',enum:c.memories.map(m=>m.eventId)}},stance:{anyOf:[{type:'null'},{type:'object',additionalProperties:false,required:['target','exposureId'],properties:{target:{type:'number',minimum:-1,maximum:1},exposureId:{type:'string',enum:c.memories.filter(m=>m.kind==='exposure').map(m=>m.eventId)}}}]},motivation:{type:'string',minLength:1,maxLength:240}};return {type:'object',additionalProperties:false,required:Object.keys(properties),properties};}
export function finishDecision(w:SocietyWorld,outcome:{decision:unknown|null;usage:InferenceCallRecord|null;error:string|null}):SocietyWorld{
 const c=w.hybrid?.pending;check(c,'SOCIAL_STALE');check(canonical(buildDecisionContext(w,c.actor.id,c.platform))===canonical(c),'SOCIAL_STALE');check(!hybridBudget(w).exhausted,'SOCIAL_BUDGET');
 const decision=outcome.decision===null?null:parseSocialDecision(outcome.decision,c),before=w.events.length;
 let next=w;
 if(decision){if(decision.stance){const m=w.agents.find(a=>a.id===c.actor.id)!.memory.find(m=>m.eventId===decision.stance!.exposureId)!;next=act(next,{actorId:c.actor.id,type:'opinion',platform:m.platform,targetId:m.itemId,stanceTarget:decision.stance.target});}next=act(next,{actorId:c.actor.id,type:decision.action,platform:decision.platform,...(decision.targetId?{targetId:decision.targetId}:{}),...(decision.text?{text:decision.text}:{})});}
 else next=act(next,{actorId:c.actor.id,type:'inactive',platform:c.platform});
 const record:SocialDecisionRecord=freezeSnapshot({version:1,id:c.id,context:c,status:decision?'accepted':'failed',decision,usage:outcome.usage,error:decision?null:(outcome.error&&/^[A-Z][A-Z0-9_]{1,60}$/.test(outcome.error)?outcome.error:'SOCIAL_FAILURE'),reservedTokens:new TextEncoder().encode(canonical(c)).length+new TextEncoder().encode(canonical(decisionSchema(c))).length+3000+L.outputTokens,reservedCostUsd:L.unknownCostUsd});
 const events=next.events.map((e,i)=>i<before?e:freezeSnapshot({...e,source:decision?'social-model' as const:'social-decision-failed' as const,decisionId:c.id,memoryIds:decision?.memoryIds??[],motivation:decision?.motivation??'The model opportunity failed; no replacement conversation was generated.'}));
 return setHybrid({...next,events},{records:[...w.hybrid!.records,record],pending:null});
}
export function replayHybrid(input:SocietyInput,tick:number,records:SocialDecisionRecord[],pending:DecisionContext|null){let w=createSociety(input),index=0;for(let i=0;i<tick;i++){w=prepareHybridStep(w);if(w.hybrid?.pending){const record=records[index];if(record){check(record.status!=='reserved'&&canonical(record.context)===canonical(w.hybrid.pending),'SOCIAL_STALE');w=finishDecision(w,{decision:record.decision,usage:record.usage,error:record.error});check(canonical(w.hybrid!.records.at(-1))===canonical(record),'SOCIAL_STALE');index++;}else check(i===tick-1&&pending!==null,'SOCIAL_STALE');}}check(index===records.length,'SOCIAL_STALE');check(canonical(w.hybrid?.pending??null)===canonical(pending),'SOCIAL_STALE');return w;}
