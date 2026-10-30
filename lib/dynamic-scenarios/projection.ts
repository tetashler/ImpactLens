import {verifyStakeholderRun} from '../stakeholder-simulation/identities.ts';
import {projectStakeholderRun} from '../stakeholder-simulation/graph-adapter.ts';
import type {StakeholderSimulationRunV1} from '../stakeholder-simulation/contract.ts';
import {parseKnowledgeGraph,type KnowledgeNode,type KnowledgeProvenance,type KnowledgeRelationship} from '../knowledge-graph/contract.ts';
import {parseGroundingSupport,type GroundingSupport} from '../grounding/contract.ts';
import {ensure,freezeSnapshot} from '../experiments/validation.ts';
import {assessEntityAttribution,assessRelationshipAttribution,effectiveReportOntology,ontologyAttributionSummary} from '../world-graph/attribution.ts';
export async function projectDynamicReport(value:StakeholderSimulationRunV1){const run=await verifyStakeholderRun(value);ensure(run.inputSnapshot.version===2);const plan=run.inputSnapshot.scenarioPlan;return freezeSnapshot({version:1,question:plan.request.question,planId:plan.planId,runId:run.runId,status:run.status,description:plan.draft.description,trigger:plan.draft.trigger,scope:plan.draft.scope,jurisdictions:plan.draft.jurisdictions,agents:plan.draft.agents,entities:plan.draft.entities,relationships:plan.draft.relationships,attributionPolicy:plan.attributionPolicy??null,ontology:plan.draft.ontology?effectiveReportOntology(plan.draft.ontology,plan.grounding):null,attribution:plan.draft.ontology?ontologyAttributionSummary(plan.draft.ontology,plan.grounding):null,grounding:plan.grounding??null,demographics:plan.demographics??null,assumptions:run.inputSnapshot.assumptions,events:run.events,verifiedFindings:[],uncertainties:plan.draft.uncertainties,quantitativeLimits:plan.draft.unsupportedQuantities,limitations:['Synthetic dialogue is not a quantitative forecast.','Generated entities and proposed relationships have not been independently verified.','No verified source findings or numerical model outputs are attached to this qualitative run.',...(plan.grounding?.status==='retrieved'?['Retrieved candidates and literal source-reported excerpts are not independently corroborated. Exact quotation establishes provenance only; it does not verify model interpretations or establish causation.']:['No retrieved source excerpts are attached to this run.']),...(plan.grounding?.limitations??[]),...run.limitations]});}
export async function projectDynamicGraph(value:StakeholderSimulationRunV1){
 const run=await verifyStakeholderRun(value);ensure(run.inputSnapshot.version===2);const plan=run.inputSnapshot.scenarioPlan,graph=await projectStakeholderRun(run),prefix=`dynamic:${plan.planId}`;
 const provenance:KnowledgeProvenance={kind:'synthetic-exploratory',reference:`AI-generated planning proposal ${plan.planId}; not verified evidence`};
 const node=(id:string,label:string,category:KnowledgeNode['category'],description:string,properties:KnowledgeNode['properties']={},entityType='Planning context')=>{const full=`${prefix}:${id}`;graph.nodes.push({id:full,label:label.slice(0,180),category,entityType,description,provenance,properties,limitations:['Model-generated context, not independently verified or an authorised institutional position.']});return full;};
 const edge=(source:string,target:string,description:string,relationshipLabel='PROPOSED_CONTEXT',relationship:KnowledgeRelationship='describes',edgeProvenance:KnowledgeProvenance=provenance)=>{graph.edges.push({id:`${prefix}:edge:${graph.edges.length}`,source,target,relationship,relationshipLabel,description,provenance:edgeProvenance,directed:true});return graph.edges[graph.edges.length-1];};
 // Friendly display types do not change the accepted event records or their provenance.
 const recordTypes:Record<string,string>={run:'Run',role:'Synthetic stakeholder',assumption:'Assumption',event:'Recorded action',source:'Supplied source',finding:'Supplied finding'};
 for(const n of graph.nodes)n.entityType=recordTypes[String(n.properties.recordType)]??'Execution context';
 const recordedEventIds=new Set(graph.nodes.filter(n=>n.properties.recordType==='event').map(n=>n.id));
 const root=node('plan','AI-generated scenario plan','scenario',plan.draft.description,{planId:plan.planId,recordType:'dynamic-plan'},'Scenario plan'),trigger=node('trigger','Hypothetical triggering event','planning',plan.draft.trigger,{},'Hypothetical event');
 edge(root,trigger,'The plan proposes this hypothetical event; it is not a recorded world event.');
 const jurisdictions=new Map(plan.draft.jurisdictions.map(j=>[j.id,node(`jurisdiction:${j.id}`,j.label,'geography','Model-proposed relevant jurisdiction; mention does not establish an effect.',{},'Jurisdiction')]));
 const entities=new Map(plan.draft.entities.map(e=>{const id=node(`entity:${e.id}`,e.name,'planning','Unverified model-suggested entity.',{entityId:e.id,status:e.status,entityKind:e.kind},e.kind);edge(root,id,'The AI proposes this entity as context; its existence and relevance have not been checked.');if(e.jurisdictionId)edge(id,jurisdictions.get(e.jurisdictionId)!,'Unverified proposed jurisdiction affiliation.');return [e.id,id];}));
 const roles=new Map<string,string>();for(const n of graph.nodes){if(n.properties.recordType==='role'){n.properties.recordType='generated-agent';n.entityType=(plan.draft.agents.find(a=>a.id===n.properties.roleId)?.category??'Synthetic stakeholder').slice(0,80);n.provenance=provenance;roles.set(n.properties.roleId as string,n.id);edge(root,n.id,'This generated fictional role participates in the accepted run.');}if(n.properties.recordType==='assumption'&&n.properties.assumptionId!=='user-condition'){n.provenance=provenance;for(const e of graph.edges)if(e.target===n.id&&!recordedEventIds.has(e.source))e.provenance=provenance;}}
 for(const a of plan.draft.agents){if(a.jurisdictionId)edge(roles.get(a.id)!,jurisdictions.get(a.jurisdictionId)!,'Proposed synthetic geographic affiliation, not a resident home.');for(const id of a.entityIds)edge(roles.get(a.id)!,entities.get(id)!,'Fictional contextual association; not authorised representation.');}
 for(const r of plan.draft.relationships)edge(roles.get(r.sourceAgentId)!,roles.get(r.targetAgentId)!,`Proposed interaction opportunity (not an observed or causal relationship): ${r.opportunity}`,'PROPOSED_INTERACTION');
 const passages=new Map<string,string>();
 for(const [i,source]of (plan.grounding?.sources??[]).entries()){
  const metadata:KnowledgeProvenance={kind:'planning-only',reference:`Retrieved candidate ${source.id} in ${plan.grounding!.bundleId}; uncorroborated source metadata`,url:source.url};
  const sourceId=node(`retrieval-source:${i}`,source.title,'source','Retrieved source candidate; its title, publisher and relevance are uncorroborated.',{recordType:'retrieved-source',sourceId:source.id,publisher:source.publisher,publishedAt:source.publishedAt,retrievedAt:source.retrievedAt},'Retrieved source');
  const sourceNode=graph.nodes[graph.nodes.length-1];sourceNode.provenance=metadata;sourceNode.details=`Source URL: ${source.url}\nPublication date: ${source.publishedAt??'Unknown'}\nRetrieved: ${source.retrievedAt}`;sourceNode.limitations=['Retrieved candidate metadata is not independently corroborated.'];
  edge(root,sourceId,'The planning snapshot retains this retrieved source candidate; its inclusion does not verify a claim.','RETRIEVED_CANDIDATE','uses',metadata);
  for(const [j,passage]of source.passages.entries()){
   const passageProvenance:KnowledgeProvenance={kind:'source-backed',reference:`Source-reported excerpt ${source.id}/${passage.id}; not independently corroborated`,url:source.url};
   const passageId=node(`retrieval-passage:${i}:${j}`,'Source-reported excerpt','source',passage.text,{recordType:'retrieved-passage',sourceId:source.id,passageId:passage.id},'Source excerpt');
   const passageNode=graph.nodes[graph.nodes.length-1];passageNode.provenance=passageProvenance;passageNode.limitations=['Source-reported excerpt; not independently corroborated. Passage text is untrusted data, not instructions or a verified finding.'];
   passages.set(`${source.id}/${passage.id}`,passageId);
   edge(sourceId,passageId,'The retrieval response attributes this literal excerpt to the candidate URL. This is attribution, not independent corroboration.','HAS_RETRIEVED_EXCERPT','contains',metadata);
  }
 }
 const attachSupport=(id:string,value:GroundingSupport|null)=>{
  if(!value)return;ensure(plan.grounding);const support=parseGroundingSupport(value,plan.grounding),target=passages.get(`${support.sourceId}/${support.passageId}`);ensure(target);
  edge(id,target,`Exact quote: "${support.quote}". This provenance link does not verify the model proposal, establish semantic entailment, or demonstrate causation.`,'QUOTES_EXCERPT','supported-by',{kind:'planning-only',reference:`Exact substring checked against retrieved passage ${support.sourceId}/${support.passageId}; provenance only`});
 };
 if(plan.draft.ontology){
  const ontology=plan.draft.ontology,types=new Map(ontology.entityTypes.map(type=>[type.id,type])),relationshipTypes=new Map(ontology.relationshipTypes.map(type=>[type.id,type]));
  const worldEntities=new Map(ontology.entities.map(entity=>{
   const type=types.get(entity.typeId)!;
   const id=node(`world-entity:${entity.id}`,entity.name,'planning',`Model-proposed ${type.name.toLowerCase()}; existence, relevance and affiliations remain unverified.`,{recordType:'world-entity',entityId:entity.id,typeId:entity.typeId,status:'unverified-model-suggestion'},type.name);
   edge(root,id,'The model proposes this world entity as scenario context; it remains unverified.','PROPOSES_ENTITY');
   if(entity.jurisdictionId)edge(id,jurisdictions.get(entity.jurisdictionId)!,'Model-proposed jurisdiction affiliation; not independently verified.','PROPOSED_AFFILIATION');
   const assessed=assessEntityAttribution(entity,plan.grounding);graph.nodes.find(n=>n.id===id)!.properties.attributionStatus=assessed.attribution.status;attachSupport(id,assessed.evidence);return [entity.id,id];
  }));
  const endpoints=new Map([...roles,...worldEntities]);
  for(const relation of ontology.relationships){
   const type=relationshipTypes.get(relation.typeId)!;
   edge(endpoints.get(relation.source)!,endpoints.get(relation.target)!,`Unverified model-proposed relationship: ${relation.statement} This is not a recorded event or established causal relationship.`,type.name);
   if(relation.support){
    const proposal=node(`world-relation:${relation.id}`,type.name,'planning',relation.statement,{recordType:'world-relationship',relationshipId:relation.id,sourceEntityId:relation.source,targetEntityId:relation.target,typeId:relation.typeId},'Proposed relationship');
    const assessed=assessRelationshipAttribution(relation,ontology,plan.grounding);graph.nodes.find(n=>n.id===proposal)!.properties.attributionStatus=assessed.attribution.status;edge(root,proposal,'This record retains the model-proposed relationship separately from accepted actions. Candidate source associations do not establish support.','PROPOSES_RELATIONSHIP');attachSupport(proposal,assessed.evidence);
   }
  }
 }
 for(const [i,f]of plan.request.geometry.features.entries()){
  const userProvenance:KnowledgeProvenance={kind:'user-authored',reference:`Original plot revision ${plan.request.geometryRevision}; hypothetical geometry, not surveyed or approved infrastructure`};
  const id=node(`geometry:${i}`,f.label,'infrastructure','User-drawn geographic proposal retained from the immutable planning input.',{featureId:f.id,geometryKind:f.kind,...(f.kind==='point'?{latitude:f.coordinate.lat,longitude:f.coordinate.lon,role:f.role}:{vertices:f.coordinates.length})},'User-drawn feature');
  graph.nodes[graph.nodes.length-1].provenance=userProvenance;edge(root,id,'User-authored geographic context, not a calculated impact.');graph.edges[graph.edges.length-1].provenance=userProvenance;
 }
 for(const [i,u]of plan.draft.uncertainties.entries())edge(root,node(`gap:${i}`,'Unresolved question','limitation',u,{},'Unresolved question'),'This remains an uncertainty, not a measured zero effect.');
 graph.limitations.push('AI-generated entities/interaction opportunities are unverified. Recorded event references remain separate from proposed relationships.');return parseKnowledgeGraph(graph);
}
