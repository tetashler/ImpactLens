import {StakeholderRequestGate} from '../stakeholder-simulation/client.ts';
import {parseDynamicRequest,type DynamicRequest} from '../dynamic-scenarios/plan.ts';
import {validateDynamicResponse,type DynamicFailure} from '../dynamic-scenarios/response.ts';
import type {PublicExplore} from '../society/public-contract.ts';
import {object,ensure,freezeSnapshot,digest} from '../experiments/validation.ts';
import {parseKnowledgeGraph} from '../knowledge-graph/contract.ts';
function discussion(value:unknown){
 const fields=['version','authoredItems','uniqueAuthors','modelAuthoredDecisions','classifiedDecisions','unclassifiedItems','arguments','topicCoverage','stakeholderCategories','followups','peerReplies','maxDepth','actualPositionChanges','openIssues','resolvedIssues','withdrawnIssues','timeline'];
 const d=object(value,fields);ensure(d.version===1);for(const key of fields.filter(k=>!['version','arguments','topicCoverage','stakeholderCategories','timeline'].includes(k)))ensure(Number.isSafeInteger(d[key])&&(d[key] as number)>=0&&(d[key] as number)<=8192);
 const counts=object(d.arguments,['concern','condition','support','question','disagreement']);for(const n of Object.values(counts))ensure(Number.isSafeInteger(n)&&(n as number)>=0&&(n as number)<=16);
 ensure((d.classifiedDecisions as number)<=(d.modelAuthoredDecisions as number)&&(d.unclassifiedItems as number)+(d.classifiedDecisions as number)===d.authoredItems);
 ensure(Array.isArray(d.topicCoverage)&&d.topicCoverage.length<=12);for(const topic of d.topicCoverage){const t=object(topic,['label','decisions']);ensure(typeof t.label==='string'&&t.label.length<=80&&Number.isSafeInteger(t.decisions)&&(t.decisions as number)>=0&&(t.decisions as number)<=16);}
 ensure(Array.isArray(d.stakeholderCategories)&&d.stakeholderCategories.length<=100&&d.stakeholderCategories.every(t=>typeof t==='string'&&t.length<=120));
 ensure(Array.isArray(d.timeline)&&d.timeline.length===3);for(const period of d.timeline){const t=object(period,['period','authoredItems','classifiedDecisions','followups','positionChanges']);ensure(['early','middle','late'].includes(t.period as string));for(const [k,n]of Object.entries(t))if(k!=='period')ensure(Number.isSafeInteger(n)&&(n as number)>=0&&(n as number)<=8192);}
}
export function parsePublicExplore(value:unknown):PublicExplore{
 const v=object(value,['version','kind','attemptId','requestIdentity','runId','planId','question','status','request','graph','inspections','roles','initialActions','assumptions','limitations','sources','accounting','demographics','session','society']);
 ensure(v.version===3&&v.kind==='summary-execution');ensure(typeof v.runId==='string'&&v.runId.length<=160&&typeof v.question==='string'&&v.question.length<=2000);parseKnowledgeGraph(v.graph);
 ensure(Array.isArray(v.initialActions)&&v.initialActions.length<=8);for(const a of v.initialActions)object(a,['id','roleId','type','round','position','previousEventIds']);
 if(v.society){
  const required=['version','runId','worldId','phase','tick','totalSteps','minutes','counts','platforms','groups','agents','links','map','usage','limitations'];const s=object(v.society,[...required,'conversation'],required);
  ensure(s.version===2&&s.runId===v.runId&&Array.isArray(s.agents)&&s.agents.length<=100&&Array.isArray(s.groups)&&s.groups.length<=8&&Array.isArray(s.platforms)&&s.platforms.length<=4);
  const agentFields=['id','roleId','label','entityType','affiliation','goal','initialPosition','position','activity','platformIds','groupCount','events','modelDecisions','ruleEvents','stateChanges','demographic'];
  for(const a of s.agents){const agent=object(a,[...agentFields,'indexedExperiences','openIssues','discussion'],agentFields);if(agent.discussion!==undefined)discussion(agent.discussion);for(const [field,max]of [['indexedExperiences',32],['openIssues',8]] as const)if(agent[field]!==undefined)ensure(Number.isSafeInteger(agent[field])&&(agent[field] as number)>=0&&(agent[field] as number)<=max);}
  const platformFields=['id','entityId','name','entityType','style','adapter','participants','counts','startMinute','endMinute','themes','viewpoints','arguments','summary','limitations'];
  const groupFields=['id','name','entityType','platformId','purpose','creatorId','createdMinute','membershipPolicy','historyPolicy','sharingPolicy','members','counts','viewpoints','summary','themes','arguments'];
  for(const [values,fields]of [[s.platforms,platformFields],[s.groups,groupFields]] as const)for(const item of values as unknown[]){const p=object(item,[...fields,'discussion'],fields);if(p.discussion)discussion(p.discussion);}
  if(s.conversation){const c=object(s.conversation,['opportunityTicks','eligiblePeerReplies','includedPeerReplies','omittedPeerReplies','contextOmissions','peerReplies','maxDepth','memoryLinkedDecisions']);ensure(Array.isArray(c.opportunityTicks)&&c.opportunityTicks.length<=16&&c.opportunityTicks.every(t=>Number.isSafeInteger(t)&&t>=1&&t<=144));for(const [key,n]of Object.entries(c))if(key!=='opportunityTicks')ensure(Number.isSafeInteger(n)&&(n as number)>=0&&(n as number)<=8192);}
 }
 for(const i of Object.values(v.inspections as Record<string,any>))ensure(Array.isArray(i.interactions)&&i.interactions.length===0);
 return freezeSnapshot(v) as unknown as PublicExplore;
}
export class PublicScenarioSession extends StakeholderRequestGate{
 async execute(value:DynamicRequest,key:string,fetcher:typeof fetch=fetch,timeoutMs=125000):Promise<PublicExplore|DynamicFailure|null>{const input=parseDynamicRequest(value),ticket=this.begin(key),timer=setTimeout(()=>ticket.controller.abort(),timeoutMs);try{const r=await fetcher('/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal:ticket.controller.signal,body:JSON.stringify({version:1,attemptId:ticket.attemptId,request:input})});const reader=r.body?.getReader();ensure(reader);const chunks:Uint8Array[]=[];let size=0;try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>3_000_000){await reader.cancel();throw Error('Summary response exceeds its bound.');}chunks.push(part.value);}}finally{reader.releaseLock();}if(!this.accepts(ticket,key))return null;const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}const body=JSON.parse(new TextDecoder().decode(bytes));if(body.kind==='planning-failed'){const failed=await validateDynamicResponse(body,{version:1,attemptId:ticket.attemptId,request:input});ensure(failed.kind==='planning-failed');return failed;}ensure(r.ok);const accepted=parsePublicExplore(body);ensure(accepted.attemptId===ticket.attemptId&&accepted.requestIdentity===await digest('dynamic-request-',input),'Summary identity mismatch.');return accepted;}catch{if(!this.accepts(ticket,key))return null;throw Error('The scenario summary could not be prepared safely.');}finally{clearTimeout(timer);}}
}
