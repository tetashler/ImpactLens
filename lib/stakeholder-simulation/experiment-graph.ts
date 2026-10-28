/** Standalone archived experiment/run lineage. Never accepts a current calculator graph. */
import {appendExperimentGraph} from '../experiments/graph.ts';
import {parseKnowledgeGraph,type KnowledgeGraph,type KnowledgeProvenance,type KnowledgeRelationship} from '../knowledge-graph/contract.ts';
import {mergeStakeholderGraph} from './graph-adapter.ts';
import {verifyLinkedStakeholderRun} from './experiment-bridge.ts';

export async function projectLinkedExperimentGraph(value:unknown):Promise<KnowledgeGraph>{
  const linked=await verifyLinkedStakeholderRun(value),{source,run,experiment}=linked;
  if(!experiment)throw new Error('The original validated saved experiment record is required for its archived graph.');
  const base=appendExperimentGraph(null,{
    scenarioIdentity:source.scenarioIdentity,question:experiment.question,configuration:experiment.configuration,
    evidence:experiment.evidence,experiment,geometryContext:experiment.geometryContext,archived:true,
    evidenceScenarioIdentity:source.scenarioIdentity,
  });
  // The saved record's status remains historical. A separate run is now available.
  const saved=base.nodes.find(node=>node.properties.experimentId===experiment.experimentId&&node.properties.archived===true);
  if(!saved)throw new Error('The archived experiment has no saved snapshot entity.');
  const pending=base.nodes.find(node=>node.properties.executionStatus==='not-executed'&&node.id!==saved.id);
  if(pending){
    pending.label='Saved input execution boundary';
    pending.description='Saved input has no execution; a separate recorded stakeholder run is linked to this immutable input. Saving alone did not execute agents or calculate outcomes.';
    pending.provenance={kind:'planning-only',reference:'Historical saved input status; separate verified run record'};
    for(const edge of base.edges.filter(edge=>edge.target===pending.id)){
      edge.relationship='describes';
      edge.description='The saved input retains its original not-executed status independently of the separately recorded run.';
      edge.provenance={kind:'planning-only' as const,reference:'Historical saved input execution boundary'};
    }
  }
  base.limitations=base.limitations.filter(item=>!item.includes('no stakeholder-simulation executor'));
  const graph=await mergeStakeholderGraph(base,run);
  graph.executionIdentity=run.runId;
  const runRoot=graph.nodes.find(node=>node.properties.recordType==='run');
  if(!runRoot)throw new Error('The verified run has no graph entity.');
  const lineage={sourceExperimentId:source.sourceExperimentId,scenarioIdentity:source.scenarioIdentity,
    configurationIdentity:source.configurationIdentity,evidenceSnapshotIdentity:source.evidenceSnapshotIdentity,
    executionInputIdentity:source.executionInputIdentity,runId:run.runId,inputFingerprint:run.inputFingerprint,evidenceFingerprint:run.evidenceFingerprint};
  Object.assign(graph.nodes.find(node=>node.id===saved.id)!.properties,lineage);
  Object.assign(runRoot.properties,lineage,{archived:true});

  // Resolve the simplified run bundle onto the actual rich research entities.
  // This keeps their classifications, checked excerpts and verification caveats.
  const aliases=new Map<string,string>();
  for(const node of graph.nodes){
    if(node.properties.recordType!=='source'&&node.properties.recordType!=='finding')continue;
    const property=node.properties.recordType==='source'?'sourceId':'findingId';
    const original=base.nodes.find(candidate=>candidate.properties[property]===node.properties[property]
      &&(property!=='sourceId'||!candidate.properties.findingId));
    if(!original)throw new Error('A run evidence reference has no corresponding original research entity.');
    aliases.set(node.id,original.id);
  }
  for(const edge of graph.edges){
    const suppliedAssociation=aliases.has(edge.source)&&aliases.has(edge.target);
    edge.source=aliases.get(edge.source)??edge.source;
    edge.target=aliases.get(edge.target)??edge.target;
    if(suppliedAssociation){
      edge.relationship='uses';
      edge.description='The execution input retained this source association as context. Only the original research finding classification establishes the recorded excerpt support.';
      edge.provenance={kind:'planning-only' as const,reference:'Verified transfer of supplied evidence references; no new source verification by the simulation'};
    }
  }
  graph.nodes=graph.nodes.filter(node=>!aliases.has(node.id));
  const planning:KnowledgeProvenance={kind:'planning-only',reference:'Verified immutable experiment-to-run input binding'};
  const synthetic:KnowledgeProvenance={kind:'synthetic-exploratory',reference:`Recorded run ${run.runId}; no public-opinion or forecast authority`};
  let edgeIndex=0;
  const occupied=new Set([...graph.nodes,...graph.edges].map(item=>item.id));
  function edge(from:string,to:string,relationship:KnowledgeRelationship,description:string,provenance:KnowledgeProvenance){
    let id:string;do{id=`experiment-run-link:${edgeIndex++}`;}while(occupied.has(id));occupied.add(id);
    graph.edges.push({id,source:from,target:to,relationship,description,provenance,directed:true});
  }
  edge(saved.id,runRoot.id,'produces','This immutable saved input was used to produce the separately recorded synthetic run; saving the snapshot alone did not execute it.',planning);
  edge(runRoot.id,saved.id,'uses','This run uses the exact validated archived experiment and its configuration/evidence identities.',planning);
  for(const event of run.events){
    const entity=graph.nodes.find(node=>node.properties.eventId===event.id);
    if(!entity)throw new Error('A recorded event has no graph entity.');
    for(const sourceId of event.sourceIds){
      const original=base.nodes.find(node=>node.properties.sourceId===sourceId&&!node.properties.findingId);
      if(!original)throw new Error('An event source reference has no original research source.');
      edge(entity.id,original.id,'uses','This synthetic turn names the archived source as context; the source does not verify the fictional viewpoint or its future implications.',synthetic);
    }
  }
  graph.limitations=[...new Set([...graph.limitations,'Archived experiment and recorded synthetic run only. Current MRT/AAC calculations are not included.'])];
  return parseKnowledgeGraph(graph);
}
