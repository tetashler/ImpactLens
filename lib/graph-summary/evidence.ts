import type {PublicExplore} from '../society/public-contract.ts';
import {projectReportEvidence} from '../report-summary/evidence.ts';
const clip=(value:string,max:number)=>value.slice(0,max);
const metricKeys=['members','representedAgents','representedPopulation','comparableWeight','meanMinutesSaved','benefitingShare','unknownAgents','notApplicableAgents'] as const;
export interface GraphSummaryNodeContext {nodeId:string;label:string;kind:string;recordType:string;description:string;summaryFocus?:'conversation'|'entity-discussion'|'scenario';purpose?:string;provenance:string;relationships:{label:string;relationship:string}[];metrics:Record<string,number|null>;limitations:string[];evidenceScope:string}
/** All registered nodes, only explicit public explanation fields. Never forward graph property bags. */
export function projectGraphSummaryContext(run:PublicExplore){
 const byId=new Map(run.graph.nodes.map(node=>[node.id,node]));
 const privatePlatforms=new Set(run.society?.platforms.filter(platform=>platform.style==='private-group').map(platform=>platform.id));
 const nodes:GraphSummaryNodeContext[]=run.graph.nodes.map(node=>{
  const type=typeof node.properties.recordType==='string'?clip(node.properties.recordType,80):node.category;
  const privateContext=type==='fictional-messaging-group'||node.properties.style==='private-group'||typeof node.properties.platformId==='string'&&privatePlatforms.has(node.properties.platformId);
  const conversation=type==='communication-platform'||type==='fictional-messaging-group';
  const entityDiscussion=!node.properties.agentId&&!node.properties.roleId&&(type==='world-entity'||['infrastructure','geography'].includes(node.category));
  const aggregate=type==='fictional-agent-aggregate';
  const metrics:Record<string,number|null>={};
  for(const key of metricKeys){const value=node.properties[key];if(value===null||typeof value==='number'&&Number.isFinite(value))metrics[key]=value;}
  return {nodeId:node.id,label:clip(node.label,180),kind:clip(node.entityType??node.category,80),recordType:type,
   description:conversation?'Fictional discussion in this scenario. A bounded, anonymous account of the recorded exchanges is supplied separately to the server-side writer.':aggregate?'Other fictional participants outside scenario roles, excluding the primary individuals shown separately. Only statements specifically attributed to this aggregate may describe its concerns; activity counts cannot establish shared views.':clip(node.description,800),summaryFocus:conversation?'conversation':entityDiscussion?'entity-discussion':'scenario',
   ...(typeof node.properties.purpose==='string'?{purpose:clip(node.properties.purpose,400)}:{}),provenance:node.provenance.kind,
   relationships:run.graph.edges.filter(edge=>edge.source===node.id||edge.target===node.id).slice(0,8).map(edge=>({label:clip(byId.get(edge.source===node.id?edge.target:edge.source)?.label??'Related scenario element',180),relationship:clip(edge.relationshipLabel??edge.relationship,80)})),
   metrics:conversation?{}:metrics,limitations:conversation?[]:node.limitations.slice(0,3).map(value=>clip(value,300)),evidenceScope:conversation?'server-only-anonymous-conversation-excerpts':privateContext?'public-metadata-only':aggregate?'attributable-public-statements-only':'public-context-and-accepted-public-statements'};
 });
 const base=projectReportEvidence(run);
 return {...(base.research?{research:base.research,researchScope:base.researchScope}:{}),runId:run.runId,question:run.question.slice(0,2000),runStatus:run.job?.status??run.society?.phase??run.status,revision:run.session?.revision??null,tick:run.society?.tick??null,nodes,calculatedCommute:base.calculatedCommute,limitations:run.limitations.slice(0,12).map(value=>clip(value,600))};
}
export type GraphSummaryContext=ReturnType<typeof projectGraphSummaryContext>;
