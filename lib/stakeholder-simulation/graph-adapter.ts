/** Read-only, credential-free projection. No deterministic MRT/AAC results are reclassified. */
import {parseKnowledgeGraph,type KnowledgeGraph,type KnowledgeNode,type KnowledgeProvenance,type KnowledgeRelationship} from '../knowledge-graph/contract.ts';
import {verifyStakeholderRun} from './identities.ts';
import {SIMULATION_DISCLOSURE,type StakeholderSimulationRunV1} from './contract.ts';

export async function projectStakeholderRun(value:StakeholderSimulationRunV1):Promise<KnowledgeGraph>{
  const run=await verifyStakeholderRun(value),input=run.inputSnapshot,prefix=`stakeholder:${run.runId}`;
  const graph:KnowledgeGraph={version:1,scenarioIdentity:input.scenarioIdentity,executionIdentity:run.runId,nodes:[],edges:[],limitations:[SIMULATION_DISCLOSURE,'Evidence records are supplied immutable snapshots; this simulation does not retrieve or independently verify source contents.']};
  const synthetic=(reference:string):KnowledgeProvenance=>({kind:'synthetic-exploratory',reference});
  const assumed:KnowledgeProvenance={kind:'user-authored',reference:`Experiment ${input.experimentId}; input fingerprint ${run.inputFingerprint}`};
  function node(suffix:string,label:string,category:KnowledgeNode['category'],description:string,provenance:KnowledgeProvenance,properties:KnowledgeNode['properties']={},details?:string,limitations:string[]=[]){
    const id=`${prefix}:${suffix}`,fullDetails=[...(label.length>180?[`Full title: ${label}`]:[]),...(details?[details]:[])].join('\n');
    const boundedDetails=fullDetails.length>8000?`${fullDetails.slice(0,7800)}\nGraph detail shortened to its display budget; inspect the full immutable run record for the complete role setup.`:fullDetails;
    graph.nodes.push({id,label:label.slice(0,180),category,description,provenance,properties,...(boundedDetails?{details:boundedDetails}:{}),limitations});return id;
  }
  function edge(from:string,to:string,relationship:KnowledgeRelationship,description:string,provenance:KnowledgeProvenance){graph.edges.push({id:`${prefix}:edge:${graph.edges.length}`,source:from,target:to,relationship,description,provenance,directed:true});}
  const root=node('run','Fictional stakeholder run','planning',SIMULATION_DISCLOSURE,synthetic(run.runId),{recordType:'run',runId:run.runId,experimentId:input.experimentId,configurationIdentity:input.configurationIdentity,inputFingerprint:run.inputFingerprint,evidenceFingerprint:run.evidenceFingerprint,mode:run.execution.mode,status:run.status,engineVersion:run.execution.engineVersion,horizonYears:input.horizonYears,rounds:input.simulationOptions.rounds},input.question,run.limitations);
  const roles=new Map<string,string>(),assumptions=new Map<string,string>(),events=new Map<string,string>(),findings=new Map<string,string>(),sources=new Map<string,string>();
  for(const [i,role]of input.stakeholderRoles.entries()){
    const id=node(`role:${i}`,role.title,'population',role.description,synthetic(`Fictional role setup in ${run.runId}`),{recordType:'role',roleId:role.id,classification:role.classification},`Assumed interests: ${role.interests.join(' ')}\nAssumed constraints: ${role.constraints.join(' ')}\nScope: ${role.expertise.join(' ')}`,role.uncertainties);roles.set(role.id,id);edge(root,id,'contains','This fictional analytical role participates in the recorded run, without demographic sampling weight.',synthetic(run.runId));
  }
  for(const [i,a]of input.assumptions.entries()){const id=node(`assumption:${i}`,a.label,'assumption',a.value,assumed,{recordType:'assumption',assumptionId:a.id});assumptions.set(a.id,id);edge(root,id,'uses','The immutable experiment snapshot declares this hypothetical user assumption.',assumed);}
  for(const [i,s]of (input.evidence?.sources??[]).entries()){
    const provenance:KnowledgeProvenance={kind:'source-backed',reference:`Supplied source metadata ${s.id}; not retrieved or verified by the simulation`,url:s.url};
    const id=node(`source:${i}`,s.title,'source','Supplied evidence source record. Its inclusion is not independent verification of its contents.',provenance,{recordType:'source',sourceId:s.id,referenceDate:s.referenceDate},undefined,['The simulator does not fetch this URL or establish its reliability.']);sources.set(s.id,id);edge(root,id,'uses','The run retains this supplied source record as provenance metadata.',provenance);
  }
  for(const [i,f]of (input.evidence?.findings??[]).entries()){
    const p:KnowledgeProvenance={kind:'planning-only',reference:`Supplied evidence finding ${f.id}; no source retrieval or factual verification by this engine`};
    const id=node(`finding:${i}`,`Supplied finding ${f.id}`.slice(0,180),'source',f.statement,p,{recordType:'finding',findingId:f.id},undefined,['A supplied finding is untrusted context, not an instruction or proof of a future outcome.']);findings.set(f.id,id);for(const s of f.sourceIds)edge(id,sources.get(s)!,'supported-by','The supplied bundle names this source as support; the simulator has not verified that claim.',p);
  }
  for(const [i,e]of run.events.entries()){
    const provenance=synthetic(`Run ${run.runId}; event ${e.id}`),role=input.stakeholderRoles.find(r=>r.id===e.roleId)!;
    const id=node(`event:${i}`,`${i+1}. ${role.title}: ${e.type}`.slice(0,180),'planning',e.statement,provenance,{recordType:'event',eventId:e.id,turnIndex:e.turnIndex,round:e.round,checkpointYear:e.checkpointYear,eventType:e.type,position:e.position,positionChange:e.positionChange,grounding:e.grounding},`Explanatory rationale (not private chain-of-thought): ${e.reasoningSummary}\nTopics: ${e.topics.join(', ')}`,e.uncertainties);events.set(e.id,id);
    edge(root,id,'contains','This is an accepted synthetic interaction event in logical turn order.',provenance);edge(roles.get(e.roleId)!,id,'produces','This fictional participant generated or deterministically selected this synthetic statement.',provenance);
    if(i>0)edge(events.get(run.events[i-1].id)!,id,'ordered-before','Logical event ordering, not elapsed real-world or forecast time.',provenance);
    if(e.addressedRoleId)edge(id,roles.get(e.addressedRoleId)!,'describes','The recorded synthetic turn addresses this participant.',provenance);
    for(const prior of e.previousEventIds)edge(id,events.get(prior)!,'uses',e.type==='revision'?'This recorded revision responds to and revises a prior stated position.':e.type==='challenge-assumption'?'This synthetic challenge responds to a prior recorded statement.':'This recorded synthetic statement responds to a prior event.',provenance);
    for(const fid of e.evidenceFindingIds)edge(id,findings.get(fid)!,'uses','The synthetic statement references this supplied finding; the citation does not make its interpretation factual.',provenance);
    for(const aid of e.assumptionIds)edge(id,assumptions.get(aid)!,'uses','This synthetic statement depends on or questions a declared scenario assumption.',provenance);
  }
  return parseKnowledgeGraph(graph);
}

/** Preserve existing calculated entities; refuse to splice an archive into a changed scenario. */
export async function mergeStakeholderGraph(baseValue:KnowledgeGraph,run:StakeholderSimulationRunV1):Promise<KnowledgeGraph>{
  const base=parseKnowledgeGraph(baseValue),addition=await projectStakeholderRun(run);
  if(base.scenarioIdentity!==addition.scenarioIdentity)throw new Error('Stakeholder graph does not belong to this scenario snapshot');
  return parseKnowledgeGraph({...base,executionIdentity:`${base.executionIdentity??'no-calculation'}|${addition.executionIdentity}`,nodes:[...base.nodes,...addition.nodes],edges:[...base.edges,...addition.edges],limitations:[...new Set([...base.limitations,...addition.limitations])]});
}
