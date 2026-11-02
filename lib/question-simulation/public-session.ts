import {parseSocietyLink} from '../society/link-detail-contract.ts';
import {PROVIDER_JOB_REASONS} from '../society/job-failure.ts';
import {parseAssumptionReview,parseAssumptionReviewDraft,parseAssumptionDecisions,assumptionContextKey,type AssumptionReviewDraft,type AssumptionDecision} from '../assumption-review/contract.ts';
import {parseHybridExploreOptions,parseHybridReview,parseHybridPublicGrounding,type HybridExploreOptions,type HybridReview} from '../interventions/explore-contract.ts';
import {parseResearchBriefing} from '../grounding/briefing.ts';
import {StakeholderRequestGate} from '../stakeholder-simulation/client.ts';
import {parseDynamicRequest,type DynamicRequest} from '../dynamic-scenarios/plan.ts';
import {validateDynamicResponse,type DynamicFailure} from '../dynamic-scenarios/response.ts';
import type {PublicExplore} from '../society/public-contract.ts';
import {object,ensure,freezeSnapshot,digest} from '../experiments/validation.ts';
import {executionProfile,type ExecutionProfile} from '../society/execution-profile.ts';
import {parseKnowledgeGraph} from '../knowledge-graph/contract.ts';
function discussion(value:unknown,maxDecisions=16){
 const fields=['version','authoredItems','uniqueAuthors','modelAuthoredDecisions','classifiedDecisions','unclassifiedItems','arguments','topicCoverage','stakeholderCategories','followups','peerReplies','maxDepth','actualPositionChanges','openIssues','resolvedIssues','withdrawnIssues','timeline'];
 const d=object(value,fields);ensure(d.version===1);for(const key of fields.filter(k=>!['version','arguments','topicCoverage','stakeholderCategories','timeline'].includes(k)))ensure(Number.isSafeInteger(d[key])&&(d[key] as number)>=0&&(d[key] as number)<=8192);
 const counts=object(d.arguments,['concern','condition','support','question','disagreement']);for(const n of Object.values(counts))ensure(Number.isSafeInteger(n)&&(n as number)>=0&&(n as number)<=maxDecisions);
 ensure((d.classifiedDecisions as number)<=(d.modelAuthoredDecisions as number)&&(d.unclassifiedItems as number)+(d.classifiedDecisions as number)===d.authoredItems);
 ensure(Array.isArray(d.topicCoverage)&&d.topicCoverage.length<=12);for(const topic of d.topicCoverage){const t=object(topic,['label','decisions']);ensure(typeof t.label==='string'&&t.label.length<=80&&Number.isSafeInteger(t.decisions)&&(t.decisions as number)>=0&&(t.decisions as number)<=maxDecisions);}
 ensure(Array.isArray(d.stakeholderCategories)&&d.stakeholderCategories.length<=100&&d.stakeholderCategories.every(t=>typeof t==='string'&&t.length<=120));
 ensure(Array.isArray(d.timeline)&&d.timeline.length===3);for(const period of d.timeline){const t=object(period,['period','authoredItems','classifiedDecisions','followups','positionChanges']);ensure(['early','middle','late'].includes(t.period as string));for(const [k,n]of Object.entries(t))if(k!=='period')ensure(Number.isSafeInteger(n)&&(n as number)>=0&&(n as number)<=8192);}
}
function selectedProfile(value:unknown){ensure(typeof value==='string');return executionProfile(value);}
function natural(value:unknown,max:number){ensure(Number.isSafeInteger(value)&&(value as number)>=0&&(value as number)<=max);}
export function parseSocietyJob(value:unknown):import('../society/public-contract.ts').SocietyJobSummary {
 const fields=['version','id','status','tick','totalSteps','acceptedDecisions','participatingAgents','capacity','admittedCalls','remainingCalls','reason','revision'];
 const j=object(value,[...fields,'profileId'],fields),profile=j.profileId===undefined?null:selectedProfile(j.profileId);
 ensure(j.version===1&&typeof j.id==='string'&&j.id.length<=160&&['running','paused','cancelled','completed','budget-limited','capacity-limited','failed'].includes(j.status as string));
 for(const key of ['tick','totalSteps','acceptedDecisions','participatingAgents','capacity','admittedCalls','remainingCalls','revision'])natural(j[key],10000);
 ensure((j.tick as number)<=(j.totalSteps as number)&&(profile?j.totalSteps===profile.steps&&j.capacity===profile.decisions&&(j.acceptedDecisions as number)<=profile.decisions&&(j.participatingAgents as number)<=profile.modelAgents:(j.totalSteps as number)<=144&&(j.capacity as number)<=700&&(j.participatingAgents as number)<=70));
 ensure((j.admittedCalls as number)<=(j.capacity as number)&&(j.remainingCalls as number)<=(j.admittedCalls as number));
 ensure(j.reason===null||['APPLICATION_RESTART','DEADLINE','PROVIDER_BUDGET','PROVIDER_IDENTITY',...PROVIDER_JOB_REASONS,'STORAGE','ACCESS','OPERATION','EVENT_CAPACITY','ITEM_CAPACITY','STORAGE_CAPACITY','JOURNAL_CAPACITY'].includes(j.reason as string));
 return freezeSnapshot(j) as unknown as import('../society/public-contract.ts').SocietyJobSummary;
}
function parseClock(value:unknown,profile:Readonly<ExecutionProfile>,tick:number){
 const c=object(value,['version','policy','profileId','timeZone','tickMinutes','anchor','day','hour','minute','elapsedMinutes','availabilityAssumption','daily']);
 ensure(c.version===1&&c.policy==='multi-day-swarm-v1'&&c.profileId===profile.id&&c.timeZone===profile.calendar.timeZone&&c.tickMinutes===profile.tickMinutes&&c.anchor==='Day 1 08:00');
 const elapsed=tick*profile.tickMinutes,minute=profile.calendar.anchorMinute+elapsed;
 ensure(c.elapsedMinutes===elapsed&&c.day===1+Math.floor(minute/1440)&&c.hour===Math.floor((minute%1440)/60)&&c.minute===minute%60&&typeof c.availabilityAssumption==='string'&&c.availabilityAssumption.length<=600);
 ensure(Array.isArray(c.daily)&&c.daily.length===c.day);
 const days=new Set<number>();for(const day of c.daily){const d=object(day,['day','authoredItems','classifiedDecisions','followups','positionChanges','opportunities','acceptedDecisions','participatingAgents','modelAuthoredItems','ruleAuthoredItems','publicAuthoredItems','privateAuthoredItems']);natural(d.day,c.day as number);ensure((d.day as number)>=1&&!days.has(d.day as number));days.add(d.day as number);for(const key of ['authoredItems','classifiedDecisions','followups','positionChanges','modelAuthoredItems','ruleAuthoredItems','publicAuthoredItems','privateAuthoredItems'])natural(d[key],profile.limits.events);for(const key of ['opportunities','acceptedDecisions'])natural(d[key],profile.decisions);natural(d.participatingAgents,profile.modelAgents);ensure((d.classifiedDecisions as number)<=(d.authoredItems as number)&&(d.acceptedDecisions as number)<=(d.opportunities as number)&&(d.modelAuthoredItems as number)+(d.ruleAuthoredItems as number)<=(d.authoredItems as number)&&(d.publicAuthoredItems as number)+(d.privateAuthoredItems as number)===d.authoredItems);}
}

export function parsePublicExplore(value:unknown):PublicExplore{
 const fields=['version','kind','attemptId','requestIdentity','runId','planId','question','status','request','graph','inspections','roles','initialActions','assumptions','limitations','sources','accounting','demographics','session','society'];const v=object(value,[...fields,'job','grounding','storage','locationContext','research','assumptionReview'],fields);
 if(v.assumptionReview!==undefined)parseAssumptionReview(v.assumptionReview);
 if(v.research!==undefined)parseResearchBriefing(v.research);
 if(v.storage!==undefined){const storage=object(v.storage,['version','policy','disposition']);ensure(storage.version===1&&storage.policy==='storage-admission-v1'&&['active','historical-read-only'].includes(storage.disposition as string));}
 ensure(v.version===3&&v.kind==='summary-execution');ensure(typeof v.runId==='string'&&v.runId.length<=160&&typeof v.question==='string'&&v.question.length<=2000);parseKnowledgeGraph(v.graph);
 ensure(Array.isArray(v.initialActions)&&v.initialActions.length<=8);for(const a of v.initialActions)object(a,['id','roleId','type','round','position','previousEventIds']);
 if(v.job!==undefined)parseSocietyJob(v.job);if(v.grounding!==undefined){parseHybridPublicGrounding(v.grounding);ensure((v.grounding as {geometryRevision:number}).geometryRevision===(v.request as {geometryRevision:number}|null)?.geometryRevision);}
 if(v.locationContext!==undefined){
  const context=parseHybridReview(v.locationContext),request=parseDynamicRequest({version:1,...object(v.request,['question','geometryRevision','geometry'])});
  ensure(v.grounding===undefined&&context.analysisMode==='location-context'&&context.interventionType==='new_polyclinic','LOCATION_DISCUSSION_SCOPE');
  ensure(context.question===v.question&&context.question===request.question&&context.geometryRevision===request.geometryRevision,'LOCATION_DISCUSSION_IDENTITY');
  const locations=context.locations??[],ids=new Set<string>();ensure(locations.length>0,'LOCATION_DISCUSSION_SITES');
  for(const location of locations){const point=request.geometry.features.find(f=>f.id===location.pointId);ensure(point?.kind==='point'&&!ids.has(location.pointId)&&point.coordinate.lat===location.coordinate.lat&&point.coordinate.lon===location.coordinate.lon,'LOCATION_DISCUSSION_POINT');ids.add(location.pointId);}
 }
 if(v.society){
  const required=['version','runId','worldId','phase','tick','totalSteps','minutes','counts','platforms','groups','agents','links','map','usage','limitations'];const s=object(v.society,[...required,'conversation','swarm','clock','issueDeclarations'],required);
  ensure(Array.isArray(s.links)&&s.links.length<=30000);for(const link of s.links)parseSocietyLink(link);
  ensure(s.version===2&&s.runId===v.runId&&Array.isArray(s.agents)&&s.agents.length<=100&&Array.isArray(s.groups)&&s.groups.length<=8&&Array.isArray(s.platforms)&&s.platforms.length<=4);
  const policy=(s.swarm as {executionPolicy?:string}|undefined)?.executionPolicy,profile=policy==='multi-day-swarm-v1'?selectedProfile((s.swarm as {profileId?:unknown}).profileId):null,deep=policy==='deep-swarm-v1'||!!profile;const maxDecisions=profile?.decisions??(deep?700:s.swarm?128:16);if(v.job!==undefined){const j=v.job as Record<string,unknown>;ensure(profile?j.profileId===profile.id&&j.totalSteps===s.totalSteps:j.profileId===undefined);}
  if(profile){natural(s.tick,profile.steps);ensure(s.totalSteps===profile.steps&&s.agents.length===profile.agents);parseClock(s.clock,profile,s.tick as number);}else ensure(s.clock===undefined);if(s.swarm){const fields=['version','activeAgents','llmCapableAgents','ruleDrivenAgents','offeredAgents','acceptedAgents','opportunities','acceptedDecisions','rejectedDecisions','skippedDecisions','modelAuthoredItems','ruleAuthoredItems','reads','reactions','deterministicStateChanges','maxPerAgent','maxCalls','perAgent'];const c=object(s.swarm,[...fields,'executionPolicy','profileId'],fields);if(c.executionPolicy!==undefined)ensure(['deep-swarm-v1','multi-day-swarm-v1'].includes(c.executionPolicy as string));if(profile)ensure(c.profileId===profile.id&&c.maxPerAgent===profile.maxPerAgent&&c.maxCalls===profile.decisions&&c.llmCapableAgents===profile.modelAgents);else ensure(c.profileId===undefined);ensure(c.version===1&&c.activeAgents===s.agents.length&&Array.isArray(c.perAgent)&&c.perAgent.length===c.llmCapableAgents);for(const key of fields.filter(k=>!['version','perAgent'].includes(k)))ensure(Number.isSafeInteger(c[key])&&(c[key] as number)>=0&&(c[key] as number)<=8192);ensure((c.llmCapableAgents as number)+(c.ruleDrivenAgents as number)===c.activeAgents&&(c.llmCapableAgents as number)<=70&&(c.maxCalls as number)<=maxDecisions&&(c.opportunities as number)<=(c.maxCalls as number)&&(c.maxPerAgent as number)<=(deep?16:8));const ids=new Set();for(const row of c.perAgent){const a=object(row,['agentId','offered','accepted']);ensure(typeof a.agentId==='string'&&!ids.has(a.agentId)&&(s.agents as any[]).some(p=>p.id===a.agentId)&&Number.isSafeInteger(a.offered)&&Number.isSafeInteger(a.accepted)&&(a.accepted as number)>=0&&(a.accepted as number)<=(a.offered as number)&&(a.offered as number)<=(c.maxPerAgent as number));ids.add(a.agentId);}}
  if(s.issueDeclarations!==undefined){const d=object(s.issueDeclarations,['policy','selectedStatements','ownerReportedClosures','calculatedSatisfactions','authoredEvidenceClaims']);ensure(d.policy==='issue-declaration-v1'&&d.authoredEvidenceClaims===0);for(const key of ['selectedStatements','ownerReportedClosures','calculatedSatisfactions'])natural(d[key],maxDecisions);const accepted=(s.usage as {accepted?:unknown}|null)?.accepted;ensure(Number.isSafeInteger(accepted)&&(accepted as number)>=0&&(accepted as number)<=maxDecisions&&(d.selectedStatements as number)<=(accepted as number)&&(d.ownerReportedClosures as number)+(d.calculatedSatisfactions as number)<=(d.selectedStatements as number));}
  const agentFields=['id','roleId','label','entityType','affiliation','goal','initialPosition','position','activity','platformIds','groupCount','events','modelDecisions','ruleEvents','stateChanges','demographic'];
  for(const a of s.agents){const agent=object(a,[...agentFields,'indexedExperiences','openIssues','discussion','controlMode','offeredDecisions'],agentFields);if(agent.discussion!==undefined)discussion(agent.discussion,maxDecisions);if(agent.controlMode!==undefined)ensure(s.swarm&&['llm-capable','rule-driven'].includes(agent.controlMode as string));if(agent.offeredDecisions!==undefined)ensure(s.swarm&&Number.isSafeInteger(agent.offeredDecisions)&&(agent.offeredDecisions as number)>=0&&(agent.offeredDecisions as number)<=(deep?16:8));for(const [field,max]of [['indexedExperiences',32],['openIssues',deep?16:8]] as const)if(agent[field]!==undefined)ensure(Number.isSafeInteger(agent[field])&&(agent[field] as number)>=0&&(agent[field] as number)<=max);}
  const platformFields=['id','entityId','name','entityType','style','adapter','participants','counts','startMinute','endMinute','themes','viewpoints','arguments','summary','limitations'];
  const groupFields=['id','name','entityType','platformId','purpose','creatorId','createdMinute','membershipPolicy','historyPolicy','sharingPolicy','members','counts','viewpoints','summary','themes','arguments'];
  for(const [values,fields]of [[s.platforms,platformFields],[s.groups,groupFields]] as const)for(const item of values as unknown[]){const p=object(item,[...fields,'discussion'],fields);if(p.discussion)discussion(p.discussion,maxDecisions);}
  if(s.conversation){const c=object(s.conversation,['opportunityTicks','eligiblePeerReplies','includedPeerReplies','omittedPeerReplies','contextOmissions','peerReplies','maxDepth','memoryLinkedDecisions']);ensure(Array.isArray(c.opportunityTicks)&&c.opportunityTicks.length<=maxDecisions&&c.opportunityTicks.every(t=>Number.isSafeInteger(t)&&t>=1&&t<=(profile?.steps??144)));for(const [key,n]of Object.entries(c))if(key!=='opportunityTicks')ensure(Number.isSafeInteger(n)&&(n as number)>=0&&(n as number)<=(profile?profile.decisions*6*profile.limits.ancestry:deep?700*6*64:8192));}
 }
 for(const i of Object.values(v.inspections as Record<string,any>))ensure(Array.isArray(i.interactions)&&i.interactions.length===0);
 return freezeSnapshot(v) as unknown as PublicExplore;
}
export class PublicScenarioSession extends StakeholderRequestGate{
 private review:{draft:AssumptionReviewDraft;key:string;input:DynamicRequest}|null=null;
 private async send(payload:unknown,key:string,fetcher:typeof fetch,timeoutMs:number){
  const ticket=this.begin(key);let timedOut=false;const timer=setTimeout(()=>{timedOut=true;ticket.controller.abort();},timeoutMs);
  try{
   const response=await fetcher('/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal:ticket.controller.signal,body:JSON.stringify(payload)});
   const reader=response.body?.getReader();ensure(reader,'Empty scenario response.');const chunks:Uint8Array[]=[];let size=0;
   const cancel=()=>void reader.cancel().catch(()=>{});ticket.controller.signal.addEventListener('abort',cancel,{once:true});if(ticket.controller.signal.aborted)cancel();
   try{while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>3_000_000){cancel();throw Error('Summary response exceeds its bound.');}chunks.push(part.value);}}finally{ticket.controller.signal.removeEventListener('abort',cancel);reader.releaseLock();}
   if(timedOut)throw Error('Scenario request timed out. No automatic retry was made.');if(!this.accepts(ticket,key))return null;const bytes=new Uint8Array(size);let at=0;for(const c of chunks){bytes.set(c,at);at+=c.byteLength;}
   return {response,body:JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes))};
  }catch(error){if(timedOut)throw Error('Scenario request timed out. No automatic retry was made.');if(!this.accepts(ticket,key))return null;throw error;}finally{clearTimeout(timer);}
 }
 async execute(value:DynamicRequest,key:string,fetcher:typeof fetch=fetch,timeoutMs=125000,hybrid?:HybridExploreOptions):Promise<PublicExplore|DynamicFailure|HybridReview|AssumptionReviewDraft|null>{
  const input=parseDynamicRequest(value);this.discard(fetcher);
  // The transport's preparation attempt is an unguessable identity independent of UI revisions.
  const attemptId='review-'+crypto.randomUUID(),result=await this.send({version:3,operation:'prepare',attemptId,request:input,...(hybrid?{hybrid:parseHybridExploreOptions(hybrid)}:{})},key,fetcher,Math.min(timeoutMs,130000));if(!result)return null;const {response,body}=result;
  if(body.kind==='hybrid-map-review'){const r=parseHybridReview(body);ensure(r.question===input.question&&r.geometryRevision===input.geometryRevision);return r;}
  if(body.kind==='planning-failed'){const failed=await validateDynamicResponse(body,{version:1,attemptId,request:input});ensure(failed.kind==='planning-failed');return failed;}
  ensure(response.ok&&body.kind==='assumption-review','The assumptions could not be prepared safely.');const draft=parseAssumptionReviewDraft(body);
  ensure(draft.attemptId===attemptId&&draft.question===input.question&&draft.contextKey===await assumptionContextKey(input,hybrid),'Review identity mismatch.');this.review={draft,key,input};return draft;
 }
 async startReviewed(decisions:AssumptionDecision[],key:string,fetcher:typeof fetch=fetch,timeoutMs=240000):Promise<PublicExplore|null>{
  const held=this.review;ensure(held&&held.key===key&&Date.now()<Date.parse(held.draft.expiresAt),'This review expired. Prepare a new review.');parseAssumptionDecisions(decisions,held.draft.assumptions);this.review=null;
  const result=await this.send({version:3,operation:'start',draftId:held.draft.draftId,token:held.draft.token,contextKey:held.draft.contextKey,decisions},key,fetcher,timeoutMs);if(!result)return null;
  ensure(result.response.ok&&result.body.kind==='summary-execution','Execution could not complete. No automatic retry was made.');const accepted=parsePublicExplore(result.body);
  ensure(accepted.attemptId===held.draft.attemptId&&accepted.requestIdentity===await digest('dynamic-request-',held.input)&&accepted.assumptionReview?.contextKey===held.draft.contextKey,'Reviewed result identity mismatch.');return accepted;
 }
 discard(fetcher:typeof fetch=fetch){const held=this.review;this.review=null;this.cancel();if(held)void fetcher('/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:3,operation:'discard',draftId:held.draft.draftId,token:held.draft.token})}).catch(()=>{});}
}
