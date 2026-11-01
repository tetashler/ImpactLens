import {parseKnowledgeGraph,type KnowledgeGraph} from '../knowledge-graph/contract.ts';
import type {CitizenImpactPublic} from './public-contract.ts';
import {canonical} from '../experiments/validation.ts';
/** One aggregate entity: no per-message nodes or private circumstance records. */
export function appendCitizenCommuteGraph(base:KnowledgeGraph|null,result:CitizenImpactPublic,scenarioIdentity:string):KnowledgeGraph{
 const graph=base??{version:1,scenarioIdentity,nodes:[],edges:[],limitations:[]};
 if(graph.scenarioIdentity!==scenarioIdentity)throw Error('CITIZEN_GRAPH_BINDING');
 const id=result.runId,provenance={kind:'calculated' as const,reference:'citizen-commute-v1; deterministic static routing over declared synthetic workplaces'};
 const node={id,label:'Citizen commute comparison',category:'population' as const,entityType:'Grounded fictional citizen aggregate',description:'Same weighted national citizen identities; individual work and commute assignments are synthetic.',provenance,properties:{recordType:'citizen-commute-aggregate',scenarioFingerprint:result.scenarioFingerprint,requestFingerprint:result.requestFingerprint,datasetId:result.datasetId,populationId:result.populationId,representedAgents:result.summary.representedAgents,representedPopulation:result.summary.representedPopulation,comparableWeight:result.summary.comparableWeight,meanMinutesSaved:result.summary.meanMinutesSaved,unknownAgents:result.summary.coverage.unknown.agents,notApplicableAgents:result.summary.coverage['not-applicable'].agents},limitations:['Comparable rail subset only. Geographic proxies and assumed worksites do not identify real people.']};
 const existing=graph.nodes.find(n=>n.id===id);if(existing){if(canonical(existing)!==canonical(node))throw Error('CITIZEN_GRAPH_BINDING');return parseKnowledgeGraph(graph);}
 return parseKnowledgeGraph({...graph,nodes:[...graph.nodes,node],limitations:[...graph.limitations,'Citizen commute quantities are deterministic model outputs under synthetic assignments, not observed individual journeys.']});
}
