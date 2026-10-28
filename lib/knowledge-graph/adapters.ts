import {parseKnowledgeGraph,GRAPH_LIMITS,type KnowledgeGraph,type KnowledgeNode,type KnowledgeProvenance,type NodeCategory,type KnowledgeRelationship} from './contract.ts';
import {parseScenarioPlan,type ScenarioPlan} from '../scenarios/contract.ts';
import {getCapability} from '../scenarios/registry.ts';
import {parseScenarioGeometry,type ScenarioGeometry} from '../plots/geometry.ts';
import type {NetworkCatalog,SimulationResponse} from '../map-contract.ts';
import type {EditorDraft} from '../editor.ts';
import {parseFacilitiesResponse,type EldercareApiResponse,type FacilitiesResponse} from '../eldercare/api-contract.ts';
import {parseEldercareResponse} from '../../prototype/eldercare/contract.ts';
import {parseCitizenSimulation,type CitizenSimulationPayload} from '../contracts/citizen-simulation.ts';

export interface BoundGraphResult<T>{scenarioIdentity:string;executionIdentity:string;result:T}
export interface GraphContext {
  question:string;plan:ScenarioPlan|null;geometry:ScenarioGeometry;catalog:NetworkCatalog|null;scenarioIdentity:string;
  anchors?:Record<string,string>;
  draft?:EditorDraft|null;mrt?:BoundGraphResult<SimulationResponse>|null;aac?:BoundGraphResult<EldercareApiResponse>|null;
  facilities?:FacilitiesResponse|null;demographic?:BoundGraphResult<CitizenSimulationPayload>|null;
}
/** Exact local equality key, deliberately not a short/weak execution fingerprint. */
export function knowledgeIdentity(input:unknown):string {
  // Preserve incomplete editor states instead of JSON's NaN/Infinity -> null
  // coercion or undefined-array elision. Valid JSON values retain canonical form.
  if(input===undefined)return 'undefined';
  if(typeof input==='number'&&!Number.isFinite(input))return String(input);
  if(input===null||typeof input!=='object')return JSON.stringify(input);
  if(Array.isArray(input))return `[${input.map(knowledgeIdentity).join(',')}]`;
  return `{${Object.entries(input).sort(([a],[b])=>a<b?-1:a>b?1:0).map(([k,v])=>`${JSON.stringify(k)}:${knowledgeIdentity(v)}`).join(',')}}`;
}
// Stable display keys; collisions are rejected, never used as execution authority.
function suffix(value:string):string {if(/^[A-Za-z0-9._:~-]{1,120}$/.test(value))return value;let h=14695981039346656037n;for(const v of new TextEncoder().encode(value))h=BigInt.asUintN(64,(h^BigInt(v))*1099511628211n);return h.toString(16);}
const user=(reference:string):KnowledgeProvenance=>({kind:'user-authored',reference});
const planning=(reference:string):KnowledgeProvenance=>({kind:'planning-only',reference});
const assumption=(reference:string):KnowledgeProvenance=>({kind:'model-assumption',reference});
const calculated=(reference:string):KnowledgeProvenance=>({kind:'calculated',reference});
const source=(reference:string,url?:string):KnowledgeProvenance=>({kind:'source-backed',reference,...(url?{url}:{})});

/** Read-only projection of already validated application state, never an executor. */
export function buildKnowledgeGraph(context:GraphContext):KnowledgeGraph {
  if(typeof context.question!=='string'||context.question.length>2000)throw new Error('Invalid knowledge question');
  const geometry=parseScenarioGeometry(context.geometry);
  const parsed=context.plan?parseScenarioPlan(context.plan):null;
  // A retained old plan may be present while the composer changes; never reuse it.
  const plan=parsed?.request.question===context.question?parsed:null;
  const g:KnowledgeGraph={version:1,scenarioIdentity:context.scenarioIdentity,nodes:[],edges:[],limitations:['Relationships describe input, source or calculation lineage; connectivity does not establish causation.','This explorer has no document-retrieval or stakeholder-simulation executor.']};
  const keys=new Map<string,string>();
  function node(id:string,label:string,category:NodeCategory,description:string,provenance:KnowledgeProvenance,properties:KnowledgeNode['properties']={},limitations:string[]=[]):string {
    if(g.nodes.length>=GRAPH_LIMITS.nodes)throw new Error('Knowledge entity budget exceeded');
    const safe=suffix(id);if(keys.has(safe))throw new Error('Duplicate/colliding knowledge entity');keys.set(safe,id);
    g.nodes.push({id:safe,label,category,description,provenance,properties,limitations});return safe;
  }
  function edge(from:string,to:string,relationship:KnowledgeRelationship,description:string,provenance:KnowledgeProvenance,directed=true):void {
    if(g.edges.length>=GRAPH_LIMITS.edges)throw new Error('Knowledge relationship budget exceeded');
    g.edges.push({id:`edge:${g.edges.length}`,source:from,target:to,relationship,description,provenance,directed});
  }
  const root=node('scenario',plan?.title??'Current scenario','scenario',context.question||'No scenario question has been entered. User drawings remain hypotheses.',user('Current General workspace question'),{draftId:geometry.scenarioId,...(plan?{planId:plan.planId,capabilityId:plan.capabilityId}: {})});
  for(const [index,f]of geometry.features.entries()){
    const props:KnowledgeNode['properties']={plotId:f.id,provenance:f.provenance};
    if(f.kind==='point'){props.latitude=f.coordinate.lat;props.longitude=f.coordinate.lon;props.role=f.role;}else props.vertices=f.coordinates.length;
    const id=node(`plot:${f.id}`,f.label,'geography',f.kind==='point'?'User-selected map point; neither an observed home nor approved infrastructure site.':'User-drawn route annotation; vertices do not create stations, service or engineering feasibility.',user(`Current geometry feature ${f.id}`),props);
    edge(root,id,'declares','The current drawing contains this user-authored feature.',user(`Current geometry feature ${index+1}`));
  }
  if(!plan)return parseKnowledgeGraph(g);
  const capability=getCapability(plan.capabilityId);
  const capabilityNode=node('capability',capability.id,'planning',plan.routeReason,planning(`Validated plan ${plan.planId}; authoritative capability registry`),{execution:capability.execution,availability:capability.availability,readiness:plan.readiness});
  edge(root,capabilityNode,'plans','The validated plan selects this modelling or planning route; selection does not execute it.',planning(plan.planId));
  for(const [i,value]of plan.missingInputs.entries()){
    const id=node(`required:${i}`,value.label,'planning','Planner requirement. The planner does not know whether the current technical editor has completed it.',planning(plan.planId),{requirementId:value.id});edge(capabilityNode,id,'requires','The registered route declares this input requirement.',planning(plan.planId));
  }
  for(const [i,value]of plan.assumptions.entries()){
    const id=node(`plan-assumption:${i}`,`Model assumption ${i+1}`,'assumption',value,assumption(`Registry assumption for ${plan.capabilityId}`));edge(capabilityNode,id,'uses','The capability declares this modelling assumption.',assumption(plan.capabilityId));
  }
  for(const [i,value]of plan.limitations.entries()){
    const id=node(`plan-limit:${i}`,`Model limitation ${i+1}`,'limitation',value,planning(`Validated plan ${plan.planId}`));edge(capabilityNode,id,'limited-by','The plan records this limitation.',planning(plan.planId));
  }
  const matches=<T>(bound:BoundGraphResult<T>|null|undefined):bound is BoundGraphResult<T>=>!!bound&&bound.scenarioIdentity===context.scenarioIdentity&&!!bound.executionIdentity;
  if(plan.capabilityId==='mrt-accessibility-v1')mrt();
  else if(plan.capabilityId==='aac-accessibility-v1')aac();
  else {
    for(const [kind,values]of [['research',plan.researchQuestions],['evidence',plan.evidenceRequirements],['stakeholder',plan.stakeholders],['unsupported',plan.unsupportedOutcomes]] as const){
      for(const [i,value]of values.entries()){const id=node(`${kind}:${i}`,value.length<=180?value:`${kind} requirement ${i+1}`,'planning',value,planning(`Validated plan ${plan.planId}; no evidence retrieved or simulation executed`));edge(capabilityNode,id,kind==='unsupported'?'limited-by':'plans',kind==='stakeholder'?'This is a stakeholder category for future research, not a statement of its views.':'This is a planning requirement or unsupported outcome, not an observed finding.',planning(plan.planId));}
    }
  }
  return parseKnowledgeGraph(g);

  function mrt():void {
    const catalogue=context.catalog;
    const stations=new Map<string,string>();
    if(catalogue){
      const reference=`Accepted GTFS-derived existing network catalogue, service date ${catalogue.serviceDate}`;
      const catalogueNode=node('network-catalogue','Existing MRT/LRT network','source','Accepted station and service-connection catalogue. These source-backed baseline entities are separate from the hypothetical proposal.',source(reference),{serviceDate:catalogue.serviceDate,stations:catalogue.stations.length,quarantinedTrips:catalogue.quarantinedTrips},['Connections are schematic service relationships, not surveyed track geometry.']);
      edge(capabilityNode,catalogueNode,'uses','The MRT calculation capability uses the accepted existing network.',source(reference));
      for(const s of catalogue.stations){
        if(stations.has(s.id))throw new Error('Duplicate catalogue station');
        const id=node(`station:${s.id}`,s.name,'infrastructure','Existing served station in the accepted network catalogue.',source(reference),{stationId:s.id,latitude:s.lat,longitude:s.lon,lines:s.lines.join(', ')});stations.set(s.id,id);
        edge(catalogueNode,id,'contains','This station belongs to the source-backed existing network catalogue.',source(reference));
      }
      const lineNodes=new Map<string,string>();
      for(const line of catalogue.lines){const id=node(`service:${line.id}`,line.name,'infrastructure','Existing service line in the accepted network catalogue.',source(reference),{lineId:line.id});lineNodes.set(line.id,id);edge(catalogueNode,id,'contains','The catalogue contains this existing service line.',source(reference));}
      for(const s of catalogue.stations)for(const line of s.lines){const id=lineNodes.get(line);if(id)edge(id,stations.get(s.id)!,'contains','The station is served by this existing line according to the accepted catalogue.',source(reference));}
      for(const connection of catalogue.connections){const from=stations.get(connection.from),to=stations.get(connection.to);if(!from||!to)throw new Error('Unknown catalogue connection endpoint');edge(from,to,'connects',`Accepted existing service connection on ${connection.line}; no proposed interchange is inferred.`,source(reference),false);}
      for(const [pointId,stationId]of Object.entries(context.anchors??{})){
        const point=geometry.features.find(f=>f.kind==='point'&&f.id===pointId),station=catalogue.stations.find(s=>s.id===stationId);
        if(point?.kind==='point'&&station&&station.kind!=='hypothetical'&&station.lines.length>0
          &&Math.abs(point.coordinate.lat-station.lat)<=1e-10&&Math.abs(point.coordinate.lon-station.lon)<=1e-10){
          edge(suffix(`plot:${pointId}`),stations.get(stationId)!,'connects','The user explicitly confirmed this drawn point as an existing-station anchor. No proximity connection was inferred.',user(`Confirmed current plot anchor ${pointId} to ${stationId}`));
        }
      }
    }
    let proposal:string|undefined;
    const draft=context.draft;
    if(draft){
      proposal=node('proposal-line',draft.name,'infrastructure','User-confirmed hypothetical station order and explicit service assumptions; not an engineering alignment.',user('Current confirmed MRT editor draft'),{lineId:draft.id,boardingWaitSeconds:Number.isFinite(draft.waitingTimeSeconds)?draft.waitingTimeSeconds:null});edge(root,proposal,'declares','The confirmed editor draft proposes this hypothetical service line.',user('Current confirmed MRT editor draft'));
      const ordered:string[]=[];
      for(const [i,s]of draft.stations.entries()){
        const id=node(`proposal-stop:${s.key}`,s.kind==='new'?s.name:`Confirmed interchange ${s.stationId}`,'infrastructure',s.kind==='new'?'Explicitly proposed station location; site and engineering feasibility have not been established.':'Explicitly confirmed existing-station anchor; not inferred from map proximity.',user(`Confirmed draft stop ${i+1}`),s.kind==='new'?{stationId:s.id,latitude:s.lat,longitude:s.lon}:{stationId:s.stationId,transferWalkSeconds:s.transferWalkSeconds});
        ordered.push(id);edge(proposal,id,'contains',`Explicit station order position ${i+1}.`,user('Confirmed MRT station ordering'));
        if(s.kind==='existing'&&stations.has(s.stationId))edge(id,stations.get(s.stationId)!,'connects','The user explicitly confirmed this existing-station interchange anchor.',user('Confirmed MRT interchange anchor'));
      }
      for(const [i,s]of draft.segments.entries())if(ordered[i]&&ordered[i+1]){
        const id=node(`service-assumption:${i}`,`Segment ${i+1} timing`,'assumption','Explicit illustrative running and dwell times; not inferred from route length.',assumption('Reviewed MRT editor timing inputs'),{runSeconds:Number.isFinite(s.runSeconds)?s.runSeconds:null,dwellSeconds:Number.isFinite(s.dwellSeconds)?s.dwellSeconds:null});edge(proposal,id,'uses','The hypothetical service uses these entered times.',assumption('Reviewed MRT timing inputs'));edge(ordered[i],ordered[i+1],'ordered-before',`Confirmed consecutive station order; running ${s.runSeconds} s, dwell ${s.dwellSeconds} s are model assumptions.`,assumption('Explicit editor order and timing'));
      }
    }
    if(matches(context.mrt)){
      const bound=context.mrt,result=bound.result;g.executionIdentity=bound.executionIdentity;
      if(result.model!=='static-median-travel-time'||result.comparisons.length>100)throw new Error('Unsupported MRT comparison data');
      const run=node('mrt-execution','Calculated MRT comparison','result','Before/after journey calculation returned by the existing deterministic MRT engine.',calculated(bound.executionIdentity),{serviceDate:result.serviceDate,model:result.model,executionIdentity:bound.executionIdentity});edge(capabilityNode,run,'produces','The registered MRT engine returned this accepted calculation.',calculated(bound.executionIdentity));if(proposal)edge(run,proposal,'uses','This calculation is bound to the currently confirmed hypothetical proposal.',calculated(bound.executionIdentity));
      for(const [i,c]of result.comparisons.entries()){
        const id=node(`journey:${i}`,`${c.origin} to ${c.destination}`,'result','Modelled station-to-station comparison. Unavailable values remain unknown rather than zero.',calculated(bound.executionIdentity),{status:c.status,origin:c.origin,destination:c.destination,baselineMinutes:c.baselineMinutes,scenarioMinutes:c.scenarioMinutes,minutesSaved:c.minutesSaved,baselineTransfers:c.baselineTransfers,scenarioTransfers:c.scenarioTransfers,transferChange:c.transferChange,usedProposedLine:c.usedProposedLine});edge(run,id,'produces','The engine calculated this origin/destination comparison.',calculated(bound.executionIdentity));
        for(const endpoint of [c.origin,c.destination])if(stations.has(endpoint))edge(id,stations.get(endpoint)!,'compares','The comparison identifies this station as an origin or destination.',calculated(bound.executionIdentity));
      }
    }
    if(matches(context.demographic)){
      const bound=context.demographic,payload=parseCitizenSimulation(bound.result);
      g.executionIdentity=g.executionIdentity?knowledgeIdentity({mrt:g.executionIdentity,demographic:bound.executionIdentity}):bound.executionIdentity;
      const id=node('population-calculation','Weighted demographic calculation','result','Full weighted population metrics, independent of the animation subset. Travel demand remains hypothetical.',calculated(bound.executionIdentity),{executionIdentity:bound.executionIdentity,sourceYear:payload.metadata.demographicReferenceYear,representedPopulation:payload.metadata.population.representedPopulation,agents:payload.metadata.population.agentCount});edge(capabilityNode,id,'produces','The population-impact engine returned these weighted results.',calculated(bound.executionIdentity));
      for(const s of payload.sources){const sourceId=node(`population-source:${s.id}`,s.agency,'source','Demographic source provenance supplied by the validated population-impact payload.',source(`${s.datasetId}; reference year ${s.referenceYear}; ${s.kind}`,s.sourceUrl),{datasetId:s.datasetId,referenceYear:s.referenceYear,sourceKind:s.kind,rawSha256:s.rawSha256});edge(id,sourceId,'supported-by','Observed demographic categories and weights derive from this source; journey assignments remain model assumptions.',source(s.datasetId,s.sourceUrl));}
      for(const m of payload.metrics){const group=node(`demographic:${m.id}`,Object.values(m.group).join(' / ')||'Overall represented population','population','A demographic aggregation from the calculated population payload; overlapping groups must not be summed.',calculated(bound.executionIdentity),{...m.group,representedPopulation:m.denominator.representedPopulation,validJourneyAgents:m.validJourneyAgents,weightedBenefitingPopulation:m.weightedBenefitingPopulation,weightedMeanMinutesSaved:m.weightedMeanMinutesSaved},['Journey assignments are assumed; unassigned residents remain unknown.']);edge(id,group,'describes','The validated payload reports this weighted demographic group.',calculated(bound.executionIdentity));}
    }
  }
  function aac():void {
    if(context.facilities){const f=parseFacilitiesResponse(context.facilities);for(const facility of f.facilities){const id=node(`facility:${facility.id}`,facility.name,'infrastructure','Corroborated AAC classification at historical MOH coordinates. Current operation and capacity are unconfirmed.',source(`${f.source.id}; classification corroborated ${facility.corroboration?.checkedDate}`,facility.corroboration?.evidenceUrl??f.source.url),{facilityId:facility.id,latitude:facility.position.lat,longitude:facility.position.lon,serviceType:facility.serviceType,capacity:null,openingStatus:facility.operationStatus,address:facility.address},f.limitations);edge(capabilityNode,id,'uses','The limited AAC catalogue supplies this corroborated historical location.',source(f.source.id,f.source.url));}}
    if(!matches(context.aac))return;
    const bound=context.aac,envelope=bound.result,r=parseEldercareResponse(envelope.result);
    if(r.scenarioId!==envelope.identity.scenarioId)throw new Error('Mismatched AAC result identity');g.executionIdentity=bound.executionIdentity;
    const run=node('aac-execution','Calculated AAC accessibility','result','Population-weighted straight-line geographic comparison from the existing AAC engine; no allocation or health outcome.',calculated(bound.executionIdentity),{scenarioId:r.scenarioId,distanceMethod:r.provenance.distanceMethod,censusYear:r.provenance.population.referenceYear});edge(capabilityNode,run,'produces','The accepted AAC engine result is bound to this scenario.',calculated(bound.executionIdentity));
    const census=r.provenance.population;
    const censusNode=node('aac-demographic-source',census.agency,'source','Historical demographic source. Population expansion weights are preserved by the AAC engine.',source(`${census.datasetId}; reference year ${census.referenceYear}; ${census.kind}`,census.sourceUrl),{datasetId:census.datasetId,referenceYear:census.referenceYear,rawSha256:census.rawSha256});edge(run,censusNode,'supported-by','The weighted age-targeted population derives from this documented source.',source(census.datasetId,census.sourceUrl));
    const centre=node('proposed-aac',r.intervention.name,'infrastructure','Explicit hypothetical AAC location. Capacity and availability are recorded separately as model assumptions.',user('Accepted AAC request intervention'),{latitude:r.intervention.position.lat,longitude:r.intervention.position.lon});edge(root,centre,'declares','The accepted request proposes this hypothetical centre.',user('AAC request'));edge(run,centre,'uses','The comparison includes this explicitly hypothetical centre.',calculated(bound.executionIdentity));
    const serviceAssumptions=node('aac-service-assumptions','AAC service assumptions','assumption','Declared hypothetical availability and optional illustrative capacity. These do not establish verified opening, utilisation, attendance or service allocation.',assumption('Accepted AAC request assumptions'),{capacityUsers:r.capacity.proposedAssumedUsers,availability:r.intervention.availability,eligibility:r.intervention.eligibility});edge(centre,serviceAssumptions,'uses','The proposed centre has these explicitly assumed service properties.',assumption('Accepted AAC request assumptions'));
    for(const [i,a]of r.intervention.assumptions.entries()){const id=node(`aac-assumption:${i}`,a.id,'assumption',a.description,assumption('Accepted AAC intervention assumptions'));edge(run,id,'uses','The AAC calculation declares this assumption.',assumption(a.id));}
    for(const [i,o]of r.comparisons.entries()){
      const id=node(`origin:${o.origin.id}`,o.origin.subzone,'geography',o.origin.provenance.description,{...assumption(o.origin.provenance.assumptionId),url:o.origin.provenance.sourceUrl},{latitude:o.origin.position.lat,longitude:o.origin.position.lon,planningArea:o.origin.planningArea,subzone:o.origin.subzone},['Geographic landmark proxy, not an individual home or actual travel route.']);edge(run,id,'uses','This comparison uses an explicitly labelled geographic origin proxy.',assumption(o.origin.provenance.assumptionId));
      const comparison=node(`origin-comparison:${o.origin.id}`,`Distance at ${o.origin.subzone}`,'result','Calculated baseline/scenario nearest-compatible-facility distances for the labelled geographic proxy. Missing distances remain unknown.',calculated(bound.executionIdentity),{status:o.status,baselineMetres:o.baseline?.distanceMetres??null,scenarioMetres:o.scenario?.distanceMetres??null,reductionMetres:o.reductionMetres,distanceToProposedMetres:o.distanceToProposedMetres});edge(run,comparison,'produces','The AAC engine calculated this geographic-origin comparison.',calculated(bound.executionIdentity));edge(comparison,id,'uses','The distance comparison is evaluated at this assumed geographic reference point.',assumption(o.origin.provenance.assumptionId));
    }
    for(const [i,m]of r.metrics.entries()){
      const id=node(`aac-group:${i}`,Object.values(m.group).join(' / ')||'Age-targeted represented residents','population','Weighted Census-based age-targeted population under geographic-proxy assumptions; not confirmed service-eligible users.',calculated(bound.executionIdentity),{...m.group,population:m.population,locatedPopulation:m.locatedPopulation,unlocatedPopulation:m.unlocatedPopulation,comparablePopulation:m.comparablePopulation,closerPopulation:m.closerPopulation,meanBaselineMetres:m.meanBaselineMetres.value,meanScenarioMetres:m.meanScenarioMetres.value,meanReductionMetres:m.meanReductionMetres.value},['Unknown origins are not counted as definitely unaffected.','Age alone does not establish all AAC eligibility conditions.']);edge(run,id,'describes','The engine reports this weighted demographic aggregation.',calculated(bound.executionIdentity));
      if(i===0){
        const unknown=node('unlocated-population','Unlocated represented population','population','Represented residents without a usable geographic origin. Their accessibility remains unknown.',calculated(bound.executionIdentity),{representedPopulation:m.unlocatedPopulation,denominatorPopulation:m.population});edge(id,unknown,'contains','This is the explicitly unlocated part of the target population.',calculated(bound.executionIdentity));
        for(const t of m.thresholds){const distanceAssumption=node(`threshold-assumption:${t.metres}`,`${t.metres} m access assumption`,'assumption','User-configured straight-line distance threshold; not an official service standard or walking-network measurement.',assumption('Accepted AAC distance-threshold option'),{thresholdMetres:t.metres});const threshold=node(`threshold:${t.metres}`,`${t.metres} m threshold`,'result','Calculated weighted coverage conditional on the linked assumed straight-line threshold.',calculated(bound.executionIdentity),{baselinePopulation:t.baselinePopulation,scenarioPopulation:t.scenarioPopulation,newlyWithinPopulation:t.newlyWithinPopulation,baselineDenominator:t.baselineShare.denominatorPopulation,scenarioDenominator:t.scenarioShare.denominatorPopulation,baselineShare:t.baselineShare.value,scenarioShare:t.scenarioShare.value,changePercentagePoints:t.changePercentagePoints});edge(id,threshold,'has-metric','The engine reports weighted coverage under this assumed threshold.',calculated(bound.executionIdentity));edge(threshold,distanceAssumption,'uses','This coverage result is conditional on the linked threshold assumption.',assumption('Accepted AAC distance-threshold option'));}
      }
    }
    for(const [i,text]of envelope.limitations.entries()){const id=node(`aac-limit:${i}`,`AAC data limitation ${i+1}`,'limitation',text,source('AAC API documented modelling limitations'));edge(run,id,'limited-by','The result preserves this supported data/model limitation.',source('AAC API documented modelling limitations'));}
  }
}
