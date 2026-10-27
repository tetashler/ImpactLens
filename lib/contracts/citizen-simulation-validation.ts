import type {
  AgeGroup, CitizenSimulationPayload, CitizenProfileResponse, CitizenSimulationContext,
  CitizenReference, CitizenJourneyOutcome, ModellingAssumption, PopulationSource,
} from './citizen-simulation.ts';

type ObjectValue = Record<string, unknown>;
type Context = CitizenSimulationContext;
const ages = ['0_4','5_9','10_14','15_19','20_24','25_29','30_34','35_39','40_44','45_49','50_54','55_59','60_64','65_69','70_74','75_79','80_84','85_89','90andOver'] as const satisfies readonly AgeGroup[];
const statuses = ['unassigned','compared','newly-reachable','unreachable','invalid'] as const;
const routeStatuses = ['reachable','unreachable','station-unavailable','invalid'] as const;
const demographicKeys = ['planningArea','planningAreaName','subzone','subzoneName','ageGroup','sex'];

function ensure(condition: unknown, path: string): asserts condition {
  if (!condition) throw new Error(`Invalid citizen simulation contract: ${path}`);
}
function object(value: unknown, keys: string[], path: string, optional: string[] = []): ObjectValue {
  ensure(value !== null && typeof value === 'object' && !Array.isArray(value), path);
  ensure(Object.getPrototypeOf(value) === Object.prototype || Object.getPrototypeOf(value) === null, path);
  const result = value as ObjectValue;
  ensure(Object.keys(result).every(key => keys.includes(key)), `${path} fields`);
  ensure(keys.every(key => optional.includes(key) || Object.hasOwn(result, key)), `${path} required fields`);
  return result;
}
function array(value: unknown, path: string): unknown[] {
  ensure(Array.isArray(value), path);
  for (let i=0; i<value.length; i++) ensure(Object.hasOwn(value, i), `${path} entries`);
  return value;
}
function text(value: unknown, path: string): string {
  ensure(typeof value === 'string' && value.trim().length > 0, path);
  return value;
}
function id(value: unknown, path: string): string {
  const result = text(value, path);
  ensure(/^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/.test(result), path);
  return result;
}
function geography(value: unknown, path: string): string {
  const result = text(value, path);
  ensure(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(result), path);
  return result;
}
function numeric(value: unknown, path: string, minimum = -Infinity): number {
  ensure(typeof value === 'number' && Number.isFinite(value) && value >= minimum, path);
  return value;
}
function count(value: unknown, path: string): number {
  const result = numeric(value, path, 0); ensure(Number.isSafeInteger(result), path); return result;
}
function choice<T extends string>(value: unknown, options: readonly T[], path: string): T {
  ensure(typeof value === 'string' && options.includes(value as T), path); return value as T;
}
function date(value: unknown, path: string): string {
  const result = text(value, path);
  ensure(/^\d{4}-\d{2}-\d{2}$/.test(result), path);
  const parsed = new Date(`${result}T00:00:00Z`);
  ensure(Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0,10) === result, path);
  return result;
}
function unique(values: string[], path: string): void { ensure(new Set(values).size === values.length, `${path} uniqueness`); }
function ids(value: unknown, path: string): string[] {
  const result = array(value,path).map(v=>id(v,path)); unique(result,path); return result;
}
function near(a: number, b: number): boolean {
  return Number.isFinite(a) && Number.isFinite(b) && Math.abs(a-b) <= 1e-6 + 1e-9*Math.max(Math.abs(a),Math.abs(b));
}
function equalNumber(value: unknown, expected: number | null, path: string): void {
  if (expected === null) ensure(value === null, path);
  else ensure(near(numeric(value,path), expected), path);
}
function position(value: unknown): void {
  const p=object(value,['lat','lon'],'WGS84 position');
  ensure(numeric(p.lat,'latitude',-90) <= 90 && numeric(p.lon,'longitude',-180) <= 180,'WGS84 bounds');
}
function refs(value: unknown, context: Context, path: string, requiredKinds: ModellingAssumption['kind'][] = []): string[] {
  const result=ids(value,path);
  const selected=result.map(key=>context.assumptions.find(a=>a.id===key));
  ensure(selected.every(Boolean) && result.every(key=>context.metadata.assumptionIds.includes(key)),path);
  for (const kind of requiredKinds) ensure(selected.some(a=>a?.kind===kind),`${path} required assumption kind`);
  return result;
}
function covered(area: string, zone: string | undefined, context: Context): void {
  ensure(context.metadata.coverage.planningAreas.includes(area),'planning area coverage');
  if (zone && context.metadata.coverage.subzones) {
    ensure(context.metadata.coverage.subzones.some(s=>s.planningArea===area && s.subzone===zone),'subzone coverage');
  }
}
function sourceRef(value: unknown, context: Context): PopulationSource {
  const result=context.sources.find(s=>s.id===value); ensure(result,'source reference'); return result;
}

function validateContext(root: ObjectValue): Context {
  ensure(root.schemaVersion === 1,'supported schemaVersion');
  const assumptions=array(root.assumptions,'assumptions').map(value=>{
    const a=object(value,['id','kind','description'],'assumption');
    id(a.id,'assumption id'); text(a.description,'assumption description');
    choice(a.kind,['population','journey-assignment','routing','visualisation','aggregation'],'assumption kind');
    return a as unknown as ModellingAssumption;
  });
  unique(assumptions.map(a=>a.id),'assumptions');
  const metadata=object(root.metadata,['scenarioId','intervention','simulationDate','demographicReferenceYear','coverage','assumptionIds','resultKind','population'],'metadata');
  id(metadata.scenarioId,'scenarioId');
  const intervention=object(metadata.intervention,['id','type'],'intervention');
  id(intervention.id,'intervention id'); choice(intervention.type,['mrt-line','eldercare-centre','active-ageing-centre'],'intervention type');
  const serviceDate=date(metadata.simulationDate,'simulationDate');
  const year=count(metadata.demographicReferenceYear,'demographicReferenceYear');
  ensure(year >= 1900 && year <= Number(serviceDate.slice(0,4)),'historical demographic year');
  choice(metadata.resultKind,['modelled','illustrative'],'result kind');
  const population=object(metadata.population,['seed','method','agentCount','representedPopulation'],'population');
  text(population.seed,'population seed'); ensure(population.method==='minimum-one-largest-remainder-v1','population method');
  ensure(count(population.agentCount,'population agentCount') > 0 && numeric(population.representedPopulation,'represented population',0) > 0,'nonempty population');
  const coverage=object(metadata.coverage,['planningAreas','subzones'],'coverage',['subzones']);
  const areas=array(coverage.planningAreas,'planningAreas').map(v=>geography(v,'planning area'));
  ensure(areas.length>0,'planningAreas'); unique(areas,'planningAreas');
  if (coverage.subzones !== undefined) {
    const zones=array(coverage.subzones,'subzones').map(value=>{
      const z=object(value,['planningArea','subzone'],'coverage subzone');
      const area=geography(z.planningArea,'coverage planningArea');
      const zone=geography(z.subzone,'coverage subzone'); ensure(areas.includes(area),'subzone planningArea');
      return `${area}/${zone}`;
    });
    ensure(zones.length>0,'subzone selection'); unique(zones,'subzones');
  }
  const assumptionIds=ids(metadata.assumptionIds,'metadata assumptionIds');
  ensure(assumptionIds.length>0 && assumptionIds.every(key=>assumptions.some(a=>a.id===key)),'declared modelling assumptions');
  const sources=array(root.sources,'sources').map(value=>{
    const s=object(value,['id','kind','datasetId','agency','referenceYear','updated','sourceUrl','licenceUrl','rawSha256','assumptionIds'],'source');
    id(s.id,'source id'); choice(s.kind,['government-statistics','synthetic-fixture'],'aggregate source kind');
    text(s.datasetId,'datasetId'); text(s.agency,'agency'); ensure(s.referenceYear===year,'source reference year'); date(s.updated,'source updated');
    for (const key of ['sourceUrl','licenceUrl']) {
      const url=text(s[key],key); let valid=false;
      try { valid=['http:','https:'].includes(new URL(url).protocol); } catch { /* Invalid URLs are rejected below. */ }
      ensure(valid,key);
    }
    ensure(typeof s.rawSha256==='string' && /^[a-f0-9]{64}$/.test(s.rawSha256),'source rawSha256');
    ensure(s.kind!=='synthetic-fixture' || metadata.resultKind==='illustrative','fixture result labelling');
    return s as unknown as PopulationSource;
  });
  ensure(sources.length>0,'sources'); unique(sources.map(s=>s.id),'sources');
  const context={schemaVersion:1,metadata,sources,assumptions} as unknown as Context;
  for (const source of sources) refs(source.assumptionIds,context,'source assumptions',source.kind==='synthetic-fixture'?['population']:[]);
  return context;
}

function validateCitizen(value: unknown, context: Context): CitizenReference {
  const c=object(value,['agentId','synthetic','demographic','weight','sourceId','sourceRow'],'citizen');
  ensure(typeof c.agentId==='string' && /^syn-[a-f0-9]{16}-[1-9]\d*$/.test(c.agentId),'synthetic agent ID');
  ensure(c.synthetic===true,'synthetic label'); ensure(numeric(c.weight,'population weight',0)>0,'positive population weight');
  sourceRef(c.sourceId,context); ensure(count(c.sourceRow,'source row')>0,'source row');
  const d=object(c.demographic,demographicKeys,'source-derived demographic');
  const area=geography(d.planningArea,'planningArea'), zone=geography(d.subzone,'subzone');
  covered(area,zone,context); text(d.planningAreaName,'planningAreaName'); text(d.subzoneName,'subzoneName');
  choice(d.ageGroup,ages,'ageGroup'); choice(d.sex,['male','female'],'sex');
  return c as unknown as CitizenReference;
}
function validateComparison(value: unknown): void {
  const c=object(value,['origin','destination','status','baselineStatus','scenarioStatus','baselineMinutes','scenarioMinutes','minutesSaved','percentageChange','baselineTransfers','scenarioTransfers','transferChange','usedProposedLine'],'journey comparison');
  const status=choice(c.status,['compared','newly-reachable','unreachable','invalid'],'comparison status');
  for (const key of ['origin','destination']) {
    if (status==='invalid') ensure(typeof c[key]==='string','invalid endpoint reference'); else id(c[key],key);
  }
  const before=choice(c.baselineStatus,routeStatuses,'baseline status'), after=choice(c.scenarioStatus,routeStatuses,'scenario status');
  const invalid=before==='invalid' || after==='invalid';
  ensure(!invalid || (before==='invalid' && after==='invalid'),'invalid route pair');
  const expected=invalid?'invalid':before==='reachable' && after==='reachable'?'compared':after==='reachable'?'newly-reachable':'unreachable';
  ensure(status===expected,'comparison/route status consistency');
  for (const [route,minutes,transfers] of [[before,c.baselineMinutes,c.baselineTransfers],[after,c.scenarioMinutes,c.scenarioTransfers]] as const) {
    if (route==='reachable') { numeric(minutes,'reachable duration',0); count(transfers,'reachable transfer count'); }
    else ensure(minutes===null && transfers===null,'unavailable journey has null metrics');
  }
  ensure(after==='reachable' ? typeof c.usedProposedLine==='boolean' : c.usedProposedLine===null,'proposed line use');
  const comparable=before==='reachable' && after==='reachable';
  const base=c.baselineMinutes as number, scenario=c.scenarioMinutes as number;
  equalNumber(c.minutesSaved,comparable?base-scenario:null,'minutes saved sign/value');
  equalNumber(c.percentageChange,comparable && base>0?(scenario-base)/base*100:null,'duration percentage sign/value');
  const change=comparable?(c.scenarioTransfers as number)-(c.baselineTransfers as number):null;
  ensure(c.transferChange===change,'transfer change sign/value');
}
function validateJourney(value: unknown, citizens: Map<string,CitizenReference>, context: Context): CitizenJourneyOutcome {
  const j=object(value,['id','agentId','assignment','assumptionIds','comparison'],'journey');
  id(j.id,'journey id'); ensure(typeof j.agentId==='string' && citizens.has(j.agentId),'journey citizen reference');
  const assignment=choice(j.assignment,['unassigned','hypothetical'],'journey assignment');
  const assumptions=refs(j.assumptionIds,context,'journey assumptions',assignment==='hypothetical'?['journey-assignment','routing']:[]);
  if (assignment==='unassigned') ensure(j.comparison===null && assumptions.length===0,'unassigned journey');
  else validateComparison(j.comparison);
  return j as unknown as CitizenJourneyOutcome;
}
function validateAnimation(value: unknown, citizens: Map<string,CitizenReference>, journeys: Map<string,CitizenJourneyOutcome>, context: Context): void {
  const a=object(value,['agentId','position','waypoints','state','journeyId','visualisation'],'animation');
  ensure(typeof a.agentId==='string' && citizens.has(a.agentId),'animation citizen reference');
  const state=choice(a.state,['unassigned','idle','walking','travelling'],'visual activity state');
  if (a.position!==null) position(a.position);
  const waypoints=array(a.waypoints,'waypoints'); waypoints.forEach(position);
  const v=object(a.visualisation,['kind','geometry','assumptionIds'],'visual provenance');
  ensure(v.kind==='visual-only','visual-only provenance'); choice(v.geometry,['none','schematic'],'geometry provenance');
  refs(v.assumptionIds,context,'visual assumptions',a.position!==null || waypoints.length>0?['visualisation']:[]);
  ensure(v.geometry==='none'?waypoints.length===0:waypoints.length>=2,'schematic waypoint geometry');
  const journey=a.journeyId===null?null:journeys.get(id(a.journeyId,'animation journey id'));
  ensure(a.journeyId===null || journey?.agentId===a.agentId,'animation journey reference');
  if (state==='walking' || state==='travelling') {
    ensure(a.position!==null && waypoints.length>=2 && journey?.assignment==='hypothetical' && journey.comparison.scenarioStatus==='reachable','assigned reachable animation journey');
  }
  if (state==='unassigned') ensure(waypoints.length===0 && (!journey || journey.assignment==='unassigned'),'unassigned visual state');
}

function validateMetric(value: unknown, context: Context): void {
  const m=object(value,['id','group','sourceId','basis','assumptionIds','denominator','outcomes','validJourneyAgents','weightedBenefitingPopulation','weightedMeanMinutesSaved','sensitivity'],'demographic metric',['sensitivity']);
  id(m.id,'metric id'); sourceRef(m.sourceId,context); ensure(m.basis===context.metadata.resultKind,'metric result basis');
  refs(m.assumptionIds,context,'metric assumptions',['journey-assignment','aggregation']);
  const group=object(m.group,['ageGroup','sex','planningArea','subzone'],'demographic group',['ageGroup','sex','planningArea','subzone']);
  if (group.ageGroup!==undefined) choice(group.ageGroup,ages,'group ageGroup');
  if (group.sex!==undefined) choice(group.sex,['male','female'],'group sex');
  ensure(group.subzone===undefined || group.planningArea!==undefined,'subzone group needs planningArea');
  if (group.planningArea!==undefined) covered(geography(group.planningArea,'group planningArea'),group.subzone===undefined?undefined:geography(group.subzone,'group subzone'),context);
  const d=object(m.denominator,['agentCount','representedPopulation'],'metric denominator');
  const n=count(d.agentCount,'group agentCount'), population=numeric(d.representedPopulation,'group represented population',0);
  ensure((n===0)===(population===0),'group count/weight consistency');
  ensure(n<=context.metadata.population.agentCount && (population<=context.metadata.population.representedPopulation || near(population,context.metadata.population.representedPopulation)),'group within population');
  if (Object.keys(group).length===0) {
    ensure(n===context.metadata.population.agentCount && near(population,context.metadata.population.representedPopulation),'full coverage denominator');
  }
  const outcomes=object(m.outcomes,[...statuses],'outcome buckets');
  let totalAgents=0,totalPopulation=0;
  for (const status of statuses) {
    const bucket=object(outcomes[status],['agents','representedPopulation'],'weighted outcome bucket');
    const agents=count(bucket.agents,'bucket agents'), weight=numeric(bucket.representedPopulation,'bucket population',0);
    ensure((agents===0)===(weight===0),'bucket count/weight consistency');
    totalAgents+=agents; totalPopulation+=weight;
  }
  ensure(totalAgents===n && near(totalPopulation,population),'outcome partition denominator');
  const compared=outcomes.compared as {agents:number;representedPopulation:number};
  ensure(m.validJourneyAgents===compared.agents,'finite comparable agent count');
  const benefit=numeric(m.weightedBenefitingPopulation,'weighted benefiting population',0);
  ensure(benefit<=compared.representedPopulation || near(benefit,compared.representedPopulation),'benefit denominator');
  if (compared.representedPopulation===0) ensure(m.weightedMeanMinutesSaved===null && benefit===0,'no finite comparable denominator');
  else {
    const mean=numeric(m.weightedMeanMinutesSaved,'weighted mean minutes saved');
    ensure(benefit!==0 || mean<=0,'zero beneficiaries cannot have positive mean savings');
    ensure(benefit!==compared.representedPopulation || mean>0,'universal beneficiaries must have positive mean savings');
  }
  if (m.sensitivity!==undefined) {
    const sensitivity=object(m.sensitivity,['description','assumptionIds'],'assumption sensitivity');
    text(sensitivity.description,'sensitivity description'); ensure(refs(sensitivity.assumptionIds,context,'sensitivity assumptions').length>0,'sensitivity references');
  }
}

/** Validate unknown JSON without coercion, normalisation or data-bearing error messages. */
export function assertCitizenSimulation(value: unknown): asserts value is CitizenSimulationPayload {
  const p=object(value,['schemaVersion','metadata','sources','assumptions','citizens','journeys','animations','metrics'],'simulation payload');
  const context=validateContext(p);
  const citizens=array(p.citizens,'citizens').map(c=>validateCitizen(c,context));
  unique(citizens.map(c=>c.agentId),'citizens');
  ensure(citizens.length<=context.metadata.population.agentCount,'sample agent count');
  const sampleWeight=citizens.reduce((sum,c)=>sum+c.weight,0), fullWeight=context.metadata.population.representedPopulation;
  ensure(sampleWeight<=fullWeight || near(sampleWeight,fullWeight),'sample represented population');
  if (citizens.length===context.metadata.population.agentCount) ensure(near(sampleWeight,fullWeight),'complete population weight');
  const byCitizen=new Map(citizens.map(c=>[c.agentId,c]));
  const journeys=array(p.journeys,'journeys').map(j=>validateJourney(j,byCitizen,context));
  unique(journeys.map(j=>j.id),'journeys'); const byJourney=new Map(journeys.map(j=>[j.id,j]));
  const animations=array(p.animations,'animations'); animations.forEach(a=>validateAnimation(a,byCitizen,byJourney,context));
  unique(animations.map(a=>(a as {agentId:string}).agentId),'animations');
  const metrics=array(p.metrics,'metrics'); metrics.forEach(m=>validateMetric(m,context));
  unique(metrics.map(m=>(m as {id:string}).id),'metrics');
}
export function parseCitizenSimulation(value: unknown): CitizenSimulationPayload {
  assertCitizenSimulation(value); return value;
}
export function assertCitizenProfile(value: unknown): asserts value is CitizenProfileResponse {
  const p=object(value,['schemaVersion','metadata','sources','assumptions','citizen','activity','journey','animation'],'citizen profile');
  const payload={schemaVersion:p.schemaVersion,metadata:p.metadata,sources:p.sources,assumptions:p.assumptions,citizens:[p.citizen],journeys:p.journey===null?[]:[p.journey],animations:p.animation===null?[]:[p.animation],metrics:[]};
  assertCitizenSimulation(payload);
  const activity=object(p.activity,['status','assumptionIds','description','destinationCategories','transportPreferences'],'assumed activity');
  const status=choice(activity.status,['unassigned','hypothetical'],'activity status');
  const references=refs(activity.assumptionIds,payload,'activity assumptions',status==='hypothetical'?['journey-assignment']:[]);
  const categories=array(activity.destinationCategories,'destination categories').map(v=>text(v,'destination category'));
  const preferences=array(activity.transportPreferences,'transport preferences').map(v=>text(v,'transport preference'));
  if (status==='unassigned') ensure(references.length===0 && activity.description===null && categories.length===0 && preferences.length===0 && (!payload.journeys.length || payload.journeys[0].assignment==='unassigned'),'unassigned activity');
  else text(activity.description,'hypothetical activity description');
}
export function parseCitizenProfile(value: unknown): CitizenProfileResponse {
  assertCitizenProfile(value); return value;
}
