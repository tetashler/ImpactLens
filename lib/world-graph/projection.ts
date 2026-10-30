/** Primary semantic view. The audit graph and immutable execution are retained separately. */
import {verifyStakeholderRun} from '../stakeholder-simulation/identities.ts';
import type {StakeholderSimulationRunV1,StakeholderEvent} from '../stakeholder-simulation/contract.ts';
import {parseKnowledgeGraph,type KnowledgeGraph,type KnowledgeNode,type KnowledgeEdge} from '../knowledge-graph/contract.ts';
import {projectDynamicGraph} from '../dynamic-scenarios/projection.ts';
import {projectStakeholderRun} from '../stakeholder-simulation/graph-adapter.ts';
import {parseGroundingSupport} from '../grounding/contract.ts';
import {contextForAgent} from '../demographics/scenario-context.ts';
import {assessEntityAttribution,assessRelationshipAttribution,type SourceAttributionV1} from './attribution.ts';
export interface WorldSourceReference {title:string;url:string;publisher:string;publishedAt:string|null;retrievedAt:string;quote:string;limitation:string}
export interface WorldInspectionV1 {version:1;kind:'model-suggested-entity'|'fictional-agent'|'proposed-relationship'|'source-reported-relationship'|'recorded-interaction';affiliation:string|null;sources:WorldSourceReference[];interactions:StakeholderEvent[];assumptions:string[];sourceAttribution?:SourceAttributionV1;demographicContext?:ReturnType<typeof contextForAgent>}
export interface PrimaryWorldGraphV1 {version:1;graph:KnowledgeGraph;inspections:Record<string,WorldInspectionV1>}
export function worldRunLabel(run:StakeholderSimulationRunV1|null|undefined,executionIdentity:string|undefined):string {
 if(!run||run.runId!==executionIdentity)return 'Recorded world snapshot';
 return `${run.status==='completed'?'Completed synthetic run':run.events.length?'Partial world context':'Prepared world context'} · ${run.events.length} accepted turns · ${run.status}`;
}
/** Eligible legacy nodes are identified by registered record types, never English labels. */
export function legacyWorldEntities(audit:KnowledgeGraph):KnowledgeGraph {
 const nodes=audit.nodes.filter(n=>['role','generated-agent','world-entity','fictional-agent'].includes(String(n.properties.recordType))),ids=new Set(nodes.map(n=>n.id));
 return parseKnowledgeGraph({...audit,nodes,edges:audit.edges.filter(e=>ids.has(e.source)&&ids.has(e.target))});
}
export async function projectPrimaryWorldGraph(value:StakeholderSimulationRunV1):Promise<PrimaryWorldGraphV1>{
 const run=await verifyStakeholderRun(value),plan=run.inputSnapshot.version===2?run.inputSnapshot.scenarioPlan:null;
 const audit=plan?await projectDynamicGraph(run):await projectStakeholderRun(run),prefix=`world:${run.runId}`,nodes:KnowledgeNode[]=[],edges:KnowledgeEdge[]=[],inspections:Record<string,WorldInspectionV1>={};
 const generated={kind:'synthetic-exploratory' as const,reference:`Model-generated proposal in ${plan?.planId??run.runId}; not independently verified`};
 const roleNodes=new Map<string,string>(),entityNodes=new Map<string,string>();
 const assumptions=run.inputSnapshot.assumptions.map(a=>`${a.provenance}: ${a.value}`);
 const record=(kind:WorldInspectionV1['kind'],affiliation:string|null=null):WorldInspectionV1=>({version:1,kind,affiliation,sources:[],interactions:[],assumptions});
 const sourceRefs=(support:NonNullable<NonNullable<typeof plan>['draft']['ontology']>['entities'][number]['support']):WorldSourceReference[]=>{
  if(!support||!plan?.grounding)return [];const ref=parseGroundingSupport(support,plan.grounding),source=plan.grounding.sources.find(s=>s.id===ref.sourceId)!;
  return [{title:source.title,url:source.url,publisher:source.publisher,publishedAt:source.publishedAt,retrievedAt:source.retrievedAt,quote:ref.quote,limitation:'Literal source linkage; entity identity, relationship entailment and applicability are not independently corroborated.'}];
 };
 for(const role of run.inputSnapshot.stakeholderRoles){
  const original=audit.nodes.find(n=>n.properties.roleId===role.id);if(!original)continue;
  const agent=plan?.draft.agents.find(a=>a.id===role.id),affiliation=plan?.draft.jurisdictions.find(j=>j.id===agent?.jurisdictionId)?.label??null;
  const n={...original,entityType:agent?.category.slice(0,80)??role.expertise[0]?.slice(0,80)??'Stakeholder',properties:{...original.properties,recordType:'fictional-agent',worldRecordVersion:1}};nodes.push(n);roleNodes.set(role.id,n.id);
  inspections[n.id]={...record('fictional-agent',affiliation),interactions:run.events.filter(e=>e.roleId===role.id||e.addressedRoleId===role.id),...(plan?.demographics?{demographicContext:contextForAgent(plan.demographics,affiliation)}:{})};
 }
 const ontology=plan?.draft.ontology;
 if(ontology){for(const e of ontology.entities){
  const type=ontology.entityTypes.find(t=>t.id===e.typeId)!,id=`${prefix}:entity:${e.id}`,affiliation=plan?.draft.jurisdictions.find(j=>j.id===e.jurisdictionId)?.label??null;
  nodes.push({id,label:e.name,entityType:type.name,category:'planning',description:`Model-suggested ${type.name.toLowerCase()}. Identity, relevance and affiliations remain unverified.`,provenance:generated,properties:{recordType:'world-entity',worldRecordVersion:1,entityId:e.id},limitations:['A source mention does not establish all proposed attributes or relationships.']});entityNodes.set(e.id,id);
  const assessed=assessEntityAttribution(e,plan?.grounding);inspections[id]={...record('model-suggested-entity',affiliation),sources:sourceRefs(assessed.evidence),sourceAttribution:assessed.attribution};
 }}else if(plan){for(const e of plan.draft.entities){const original=audit.nodes.find(n=>n.properties.entityId===e.id);if(!original)continue;const n={...original,entityType:e.kind,properties:{...original.properties,recordType:'world-entity',worldRecordVersion:1}};nodes.push(n);entityNodes.set(e.id,n.id);inspections[n.id]=record('model-suggested-entity',plan.draft.jurisdictions.find(j=>j.id===e.jurisdictionId)?.label??null);}}
 const endpoints=new Map([...roleNodes,...entityNodes]);
 if(ontology)for(const r of ontology.relationships){
  const assessed=assessRelationshipAttribution(r,ontology,plan?.grounding),source=endpoints.get(r.source)!,target=endpoints.get(r.target)!,id=`${prefix}:relation:${r.id}`,refs=sourceRefs(assessed.evidence),reported=assessed.attribution.status==='source-reported';
  edges.push({id,source,target,relationship:'describes',relationshipLabel:ontology.relationshipTypes.find(t=>t.id===r.typeId)!.name,description:r.statement,provenance:reported?{kind:'source-backed',reference:'Literal source-reported statement; not independently corroborated',url:refs[0].url}:generated,directed:true});
  inspections[id]={...record(reported?'source-reported-relationship':'proposed-relationship'),sources:refs,sourceAttribution:assessed.attribution};
 }
 if(plan)for(const r of plan.draft.relationships){const source=roleNodes.get(r.sourceAgentId)!,target=roleNodes.get(r.targetAgentId)!,id=`${prefix}:opportunity:${r.id}`;edges.push({id,source,target,relationship:'plans',relationshipLabel:'PROPOSED_INTERACTION',description:r.opportunity,provenance:generated,directed:true});inspections[id]=record('proposed-relationship');}
 const events=new Map(run.events.map(e=>[e.id,e]));
 for(const event of run.events){
  const targets=new Set([...(event.addressedRoleId?[event.addressedRoleId]:[]),...event.previousEventIds.map(id=>events.get(id)!.roleId)].filter(id=>id!==event.roleId));
  for(const targetId of targets){const source=roleNodes.get(event.roleId),target=roleNodes.get(targetId);if(!source||!target)continue;const id=`${prefix}:event-link:${event.turnIndex}:${targetId}`;
   edges.push({id,source,target,relationship:'describes',relationshipLabel:`RECORDED_${event.type.replaceAll('-','_').toUpperCase()}`,description:event.statement,provenance:{kind:'synthetic-exploratory',reference:`Accepted synthetic event ${event.id}; not observed real-world behaviour`},directed:true});inspections[id]={...record('recorded-interaction'),interactions:[event,...event.previousEventIds.map(id=>events.get(id)!)].slice(0,9)};
  }
 }
 return {version:1,graph:parseKnowledgeGraph({version:1,scenarioIdentity:audit.scenarioIdentity,executionIdentity:run.runId,nodes,edges,limitations:['World entities and fictional stakeholders only. Evidence and execution records remain in inspectors and Report.','Model suggestions and fictional dialogue do not establish real-world outcomes.']}),inspections};
}
