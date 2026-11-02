import {createHash} from 'node:crypto';
import {parseKnowledgeGraph,GRAPH_LIMITS,type KnowledgeGraph,type KnowledgeNode,type KnowledgeEdge,type KnowledgeProvenance,type EdgeDetail} from '../../knowledge-graph/contract.ts';
import type {SocietySummary,AgentSummary} from '../../society/public-contract.ts';
import {discussionText,argumentText,timelineText} from './facts.ts';
import {explainLink,explainKnown} from '../../knowledge-graph/edge-explain.ts';

const PRIMARY_PEOPLE=12;
const synthetic:KnowledgeProvenance={kind:'synthetic-exploratory',reference:'Recorded fictional simulation; not observed real-world activity'};
const hash=(value:string)=>createHash('sha256').update(value).digest('hex').slice(0,32);
const unique=(values:string[])=>[...new Set(values)].slice(0,30);
type Props=KnowledgeNode['properties'];
type PublicAgent=AgentSummary&{controlMode?:'llm-capable'|'rule-driven';offeredDecisions?:number};

/** Adds presentation metadata without discarding a pre-existing entity attribute. */
function addProperties(node:KnowledgeNode,properties:Props){
 for(const [key,value]of Object.entries(properties))if(Object.hasOwn(node.properties,key)||Object.keys(node.properties).length<40)node.properties[key]=value;
}

/** Entity-first, complete safe candidates. Visibility is a separate pure projection.
 * The background aggregate is the exact complement of primary non-role people;
 * it makes no claim about employment, demographic or political membership.
 */
export function entityFirstGraph(base:KnowledgeGraph,s:SocietySummary):KnowledgeGraph{
 const nodes:KnowledgeNode[]=base.nodes.filter(n=>!['event','message','social-item'].includes(String(n.properties.recordType))).map(n=>({...n,properties:{...n.properties},limitations:[...n.limitations]}));
 const nodeIds=new Set(nodes.map(n=>n.id));
 const edges:KnowledgeEdge[]=base.edges.filter(e=>nodeIds.has(e.source)&&nodeIds.has(e.target)).map(e=>({...e,...(e.relationshipLabel?.startsWith('RECORDED_')?{description:'Recorded fictional interaction metadata. Conversation content remains server-side.'}:{})}));
 for(const n of nodes)addProperties(n,{presentationPrimary:true,presentationCategory:n.properties.entityId?'entity':n.properties.roleId?'role':'entity'});
 const agents=[...s.agents].sort((a,b)=>a.id.localeCompare(b.id)),agentNodes=new Map<string,string>(),platformNodes=new Map<string,string>();
 const publicInteractions=new Map<string,number>();
 for(const link of s.links)if(link.kind==='RECORDED_PUBLIC_INTERACTION')for(const id of [link.source,link.target])publicInteractions.set(id,(publicInteractions.get(id)??0)+link.count);
 const significance=new Map(agents.map(a=>{
  const interactions=publicInteractions.get(a.id)??0,groups=s.groups.filter(g=>g.creatorId===a.id).length,changes=a.discussion?.actualPositionChanges??a.stateChanges,followups=a.discussion?.followups??0,authored=a.discussion?.authoredItems??0;
  const score=4*interactions+4*groups+3*changes+2*followups+authored;
  const reason=[interactions?`${interactions} recorded public interactions`:null,groups?`${groups} fictional groups created`:null,changes?`${changes} recorded position/state changes`:null,followups?`${followups} recorded follow-ups`:null,authored?`${authored} authored items`:null].filter(Boolean).join('; ')||'No recorded significance signal; model capability alone does not affect ranking.';
  return [a.id,{score,reason}] as const;
 }));
 const primaryPeople=new Set(agents.filter(a=>!a.roleId&&significance.get(a.id)!.score>0).sort((a,b)=>significance.get(b.id)!.score-significance.get(a.id)!.score||a.id.localeCompare(b.id)).slice(0,PRIMARY_PEOPLE).map(a=>a.id));
 const omitted=agents.filter(a=>!a.roleId&&!primaryPeople.has(a.id));
 function addNode(node:KnowledgeNode):string{
  // Namespaces are normally disjoint. Preserve a real base identity even if an
  // imported entity happens to use the same ID as a synthetic candidate.
  let id=node.id;if(nodeIds.has(id)){id=`societal:${hash(node.id+'|'+String(node.properties.recordType))}`;}
  nodes.push({...node,id});nodeIds.add(id);return id;
 }
 const edgeIds=new Set(edges.map(e=>e.id));
 function link(source:string|undefined,target:string|undefined,label:string,description:string,relationship:KnowledgeEdge['relationship']='describes',extra?:{detail?:EdgeDetail}){
  if(!source||!target||!nodeIds.has(source)||!nodeIds.has(target))return;
  const id=`societal-edge:${hash(source+'|'+target+'|'+label)}`;if(edgeIds.has(id))return;edgeIds.add(id);
  const nm=(x:string)=>(nodes.find(n=>n.id===x)?.label??'Unknown entity').replace(/\s*\(participant\)\s*$/i,''),detail=extra?.detail??explainKnown(label,{source:nm(source),target:nm(target)},description);
  edges.push({id,source,target,relationship,relationshipLabel:label,description,provenance:synthetic,directed:true,...(detail?{detail}:{})});
 }
 for(const a of agents as PublicAgent[]){
  const primary=!!a.roleId||primaryPeople.has(a.id),rank=significance.get(a.id)!;
  const properties:Props={recordType:'fictional-agent',agentId:a.id,roleId:a.roleId,persistentGoal:a.goal,affiliation:a.affiliation,demographicContext:a.demographic,simulatedPosition:a.position,initialPosition:a.initialPosition,recordedEvents:a.events,modelDecisions:a.modelDecisions,ruleEvents:a.ruleEvents,positionUpdates:a.stateChanges,indexedExperiences:a.indexedExperiences??0,openIssues:a.openIssues??0,platforms:a.platformIds.join(', ')||'No recorded channel activity',privateGroupCount:a.groupCount,presentationCategory:a.roleId?'role':'person',presentationPrimary:primary,representedAgents:primary?1:0,significanceScore:rank.score,significanceReason:a.roleId?'Explicit fictional scenario role; retained independently of activity. '+rank.reason:rank.reason};
  if(a.controlMode)properties.controlMode=a.controlMode;if(a.offeredDecisions!==undefined)properties.offeredDecisions=a.offeredDecisions;
  if(a.discussion)Object.assign(properties,{discussionSummary:discussionText(a.discussion),discussionTimeline:timelineText(a.discussion),classificationCoverage:`${a.discussion.classifiedDecisions} classified decisions / ${a.discussion.authoredItems} authored items; ${a.discussion.unclassifiedItems} uninterpreted items.`,themes:a.discussion.topicCoverage.map(t=>t.label).join(', ')||'Unavailable',arguments:argumentText(a.discussion)});
  const suffix=' (participant)',label=a.roleId?`${a.label.slice(0,GRAPH_LIMITS.label-suffix.length)}${suffix}`:a.label;
  const id=addNode({id:a.id,label,entityType:a.entityType,category:'population',description:'Fictional participant. Scenario role, affiliation and demographic context do not establish facts about an observed person.',properties,provenance:synthetic,limitations:s.limitations});agentNodes.set(a.id,id);
  if(a.roleId){const role=nodes.find(n=>n.id!==id&&n.properties.roleId===a.roleId&&!n.properties.entityId&&n.properties.agentId===undefined);if(role)link(id,role.id,'REPRESENTS_FICTIONAL_SCENARIO_ROLE','Explicit simulation role binding; no real employment, authority or demographic assignment is established.','represents');}
 }
 for(const p of s.platforms){
  const existing=p.entityId!==null?nodes.find(n=>n.properties.entityId===p.entityId):undefined;
  const properties:Props={recordType:'communication-platform',platformId:p.id,participants:p.participants,style:p.style,adapter:p.adapter,posts:p.counts.posts,messages:p.counts.messages,replies:p.counts.replies,reads:p.counts.reads,reactions:p.counts.reactions,shares:p.counts.shares,positionUpdates:p.counts.stateChanges,themes:p.themes.join(', ')||'Unavailable',discussionSummary:p.summary,arguments:p.arguments,activityPeriod:`${p.startMinute??0}–${p.endMinute??0} simulated minutes`,presentationPrimary:true,presentationCategory:'entity',activityProvenance:'Counts describe the internal fictional environment, not actual platform use.'};
  if(p.discussion)Object.assign(properties,{discussionTimeline:timelineText(p.discussion),classificationCoverage:`${p.discussion.classifiedDecisions} classified decisions / ${p.discussion.authoredItems} authored items; ${p.discussion.unclassifiedItems} uninterpreted items.`});
  let id:string;if(existing){addProperties(existing,properties);existing.limitations=unique([...existing.limitations,...p.limitations]);id=existing.id;}else id=addNode({id:`communication:${p.id}`,label:p.name,entityType:p.entityType,category:'planning',description:'Unverified platform candidate associated with an internal fictional communication environment.',properties,provenance:{kind:'model-assumption',reference:'Scenario-selected or explicit fallback; no independent identity verification'},limitations:p.limitations});
  platformNodes.set(p.id,id);
  for(const a of agents)if(a.platformIds.includes(p.id))link(agentNodes.get(a.id),id,'SIMULATED_PARTICIPATION','Recorded activity in the fictional environment; no real platform account or private membership is established.','uses');
 }
 const groupNodes=new Map<string,string>();
 for(const g of s.groups){
  const properties:Props={recordType:'fictional-messaging-group',platform:g.platformId,purpose:g.purpose,members:g.members,createdMinute:g.createdMinute,membershipPolicy:g.membershipPolicy,historyPolicy:g.historyPolicy,sharingPolicy:g.sharingPolicy,posts:g.counts.posts,messages:g.counts.messages,replies:g.counts.replies,reads:g.counts.reads,reactions:g.counts.reactions,shares:g.counts.shares,positionUpdates:g.counts.stateChanges,discussionSummary:g.summary,themes:g.themes.join(', ')||'Unavailable',arguments:g.arguments,presentationPrimary:true,presentationCategory:'entity'};
  if(g.discussion)Object.assign(properties,{discussionTimeline:timelineText(g.discussion),classificationCoverage:`${g.discussion.classifiedDecisions} classified decisions / ${g.discussion.authoredItems} authored items; ${g.discussion.unclassifiedItems} uninterpreted items.`});
  const id=addNode({id:g.id,label:g.name,entityType:g.entityType,category:'population',description:'Fictional messaging group. Only aggregate activity and membership counts are disclosed.',properties,provenance:synthetic,limitations:s.limitations});groupNodes.set(g.id,id);
  link(agentNodes.get(g.creatorId),id,'CREATED_FICTIONAL_GROUP','Recorded fictional group creation; private participant lists remain server-side.','produces');
  link(id,platformNodes.get(g.platformId),'USES_SIMULATED_ENVIRONMENT','Fictional group uses this internal communication environment.','uses');
 }
 const endpoint=(id:string)=>agentNodes.get(id)??platformNodes.get(id)??groupNodes.get(id)??(nodeIds.has(id)?id:undefined);
 for(const l of s.links){
  const from=endpoint(l.source),to=endpoint(l.target);
  const name=(id:string|undefined)=>(nodes.find(n=>n.id===id)?.label??'Unknown entity').replace(/\s*\(participant\)\s*$/i,'');
  const explained=explainLink(l,{source:name(from),target:name(to),platformName:id=>s.platforms.find(p=>p.id===id)?.name??id});
  link(from,to,l.kind,explained.description,'describes',{detail:explained.detail});
 }
 if(omitted.length){
  const sum=(field:'events'|'ruleEvents'|'modelDecisions'|'stateChanges')=>omitted.reduce((n,a)=>n+a[field],0);
  const id=addNode({id:`societal-background:${hash(s.runId)}`,label:`Background fictional participants (${omitted.length})`,entityType:'Fictional participant aggregate',category:'population',description:'Aggregate of non-role fictional participants omitted from primary individual presentation. Search may reveal their safe records; aggregate membership remains fixed for this projection.',properties:{recordType:'fictional-agent-aggregate',presentationCategory:'aggregate',presentationPrimary:true,members:omitted.length,representedAgents:omitted.length,membershipRule:'All fictional non-role agents not selected as primary individual nodes by the recorded-significance rule.',recordedEvents:sum('events'),ruleEvents:sum('ruleEvents'),modelDecisions:sum('modelDecisions'),positionUpdates:sum('stateChanges'),authoredItems:omitted.reduce((n,a)=>n+(a.discussion?.authoredItems??0),0),classifiedDecisions:omitted.reduce((n,a)=>n+(a.discussion?.classifiedDecisions??0),0),followups:omitted.reduce((n,a)=>n+(a.discussion?.followups??0),0),actualPositionChanges:omitted.reduce((n,a)=>n+(a.discussion?.actualPositionChanges??0),0),selectionRule:'Primary: every scenario role, then up to 12 non-role agents with positive score. Score = 4×public interactions + 4×groups created + 3×position changes + 2×follow-ups + authored items; ties by agent ID. Model capability gives no score.',countScope:'Exact complement of primary non-role individuals; candidate person records overlap this aggregate when revealed. Do not add revealed candidates to aggregate totals.'},provenance:{kind:'calculated',reference:'Exact counts over public summary agents matching the explicit presentation membership rule; all underlying activity is fictional'},limitations:['No employment, demographic or political membership is inferred. No private member list is disclosed.','Revealing a candidate changes presentation only, not aggregate membership or report totals.']});
  for(const p of s.platforms){const participants=omitted.filter(a=>a.platformIds.includes(p.id)).length;if(participants)link(id,platformNodes.get(p.id),'AGGREGATED_SIMULATED_PARTICIPATION',`${participants} fictional participants in this aggregate have recorded activity in this environment; count is not an event total.`,'uses');}
 }
 return parseKnowledgeGraph({...base,nodes,edges,limitations:unique([...base.limitations,...s.limitations,'Entity-first presentation retains all base entities and scenario roles, up to 12 significant non-role people, and an explicit background complement. All safe agent candidates remain searchable.','Significance uses recorded public interactions, group creation, actual position changes, follow-ups and authored items. It does not measure real influence or rely on model capability.'])});
}
