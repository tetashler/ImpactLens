import {assertJsonData} from '../experiments/validation.ts';
/** Historical aggregate context only; no per-agent demographic assignment. */
export const SCENARIO_DEMOGRAPHIC_AGE_GROUPS = ['0_4','5_9','10_14','15_19','20_24','25_29','30_34','35_39','40_44','45_49','50_54','55_59','60_64','65_69','70_74','75_79','80_84','85_89','90andOver'] as const;
export type ScenarioAgeGroup = typeof SCENARIO_DEMOGRAPHIC_AGE_GROUPS[number];
export type ScenarioAgeCounts = Record<ScenarioAgeGroup,number>;
export const SCENARIO_DEMOGRAPHIC_SOURCE = Object.freeze({
  datasetId:'d_d95ae740c0f8961a0b10435836660ce0',
  agency:'Singapore Department of Statistics',referenceYear:2020 as const,updated:'2021-06-18',
  url:'https://data.gov.sg/datasets/d_d95ae740c0f8961a0b10435836660ce0/view',
  tableUrl:'https://tablebuilder.singstat.gov.sg/table/CT/17560',
  licenceUrl:'https://data.gov.sg/open-data-licence',
});
export const SCENARIO_DEMOGRAPHIC_GRAIN = 'Subzone × age group × sex leaf cells, summed to national/planning-area age groups';
export const SCENARIO_DEMOGRAPHIC_UNKNOWNS = Object.freeze(['current population','exact ages','individual locations','income','occupation','behaviour']);
export const SCENARIO_DEMOGRAPHIC_LIMITATIONS = Object.freeze([
  'Historical Census 2020 resident aggregates, not current population or a projection.',
  'Rounded leaf counts differ from separately published totals; no renormalisation.',
  'Nil/negligible markers are approximated as zero, never proof of absence.',
  'Aggregate context cannot establish any individual attributes, location, reaction or scenario impact.',
  'Planning-area matches use question text only; geometry does not locate residents.',
]);
export interface ScenarioAgeProfile { name:string; leafPopulation:number; ageGroups:ScenarioAgeCounts }
export interface ScenarioDemographicContext {
  version:1;
  source:typeof SCENARIO_DEMOGRAPHIC_SOURCE & {rawSha256:string};
  grain:typeof SCENARIO_DEMOGRAPHIC_GRAIN;
  national:ScenarioAgeProfile;
  publishedNationalTotal:number;
  leafMinusPublished:number;
  planningArea:ScenarioAgeProfile|null;
  unknowns:string[];
  limitations:string[];
}
export type ScenarioDemographicAgentContext = Readonly<{
  status:'aggregate-context'; referenceYear:2020; sourceUrl:string; grain:string;
  national:ScenarioAgeProfile; publishedNationalTotal:number; leafMinusPublished:number;
  planningArea:ScenarioAgeProfile|null; limitation:string;
}> | Readonly<{status:'unavailable';limitation:string}>;

function ensure(ok:unknown):asserts ok {if(!ok)throw new Error('Invalid scenario demographic context');}
function object(value:unknown,keys:readonly string[]):Record<string,unknown> {
  ensure(value!==null&&typeof value==='object'&&!Array.isArray(value));
  const record=value as Record<string,unknown>;
  ensure(Object.keys(record).length===keys.length&&keys.every(k=>Object.hasOwn(record,k)));
  return record;
}
function count(value:unknown):asserts value is number {ensure(typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&value<=20_000_000);}
function profile(value:unknown):ScenarioAgeProfile {
  const p=object(value,['name','leafPopulation','ageGroups']);
  ensure(typeof p.name==='string'&&p.name.length>0&&p.name.length<=80&&/^[A-Za-z]+(?:[ -][A-Za-z]+)*$/.test(p.name));
  count(p.leafPopulation);
  const ages=object(p.ageGroups,SCENARIO_DEMOGRAPHIC_AGE_GROUPS);
  for(const age of SCENARIO_DEMOGRAPHIC_AGE_GROUPS)count(ages[age]);
  ensure(Object.values(ages).reduce<number>((sum,n)=>sum+(n as number),0)===p.leafPopulation);
  return structuredClone(p) as unknown as ScenarioAgeProfile;
}
function fixedList(value:unknown,expected:readonly string[]) {
  ensure(Array.isArray(value)&&value.length===expected.length&&value.every((v,i)=>v===expected[i]));
}
/** Rejects unknown fields and claims, inconsistent denominators and mutable aliases. */
export function parseScenarioDemographicContext(value:unknown):ScenarioDemographicContext {
  assertJsonData(value);
  const r=object(value,['version','source','grain','national','publishedNationalTotal','leafMinusPublished','planningArea','unknowns','limitations']);
  ensure(r.version===1&&r.grain===SCENARIO_DEMOGRAPHIC_GRAIN);
  const source=object(r.source,[...Object.keys(SCENARIO_DEMOGRAPHIC_SOURCE),'rawSha256']);
  ensure(Object.entries(SCENARIO_DEMOGRAPHIC_SOURCE).every(([key,v])=>source[key]===v));
  ensure(typeof source.rawSha256==='string'&&/^[a-f0-9]{64}$/.test(source.rawSha256));
  const national=profile(r.national);ensure(national.name==='Singapore'&&national.leafPopulation>0);
  count(r.publishedNationalTotal);
  ensure(r.publishedNationalTotal>0&&r.leafMinusPublished===national.leafPopulation-r.publishedNationalTotal);
  if(r.planningArea!==null) {
    const area=profile(r.planningArea);
    ensure(area.name!=='Singapore'&&area.leafPopulation<=national.leafPopulation);
    ensure(SCENARIO_DEMOGRAPHIC_AGE_GROUPS.every(age=>area.ageGroups[age]<=national.ageGroups[age]));
  }
  fixedList(r.unknowns,SCENARIO_DEMOGRAPHIC_UNKNOWNS);
  fixedList(r.limitations,SCENARIO_DEMOGRAPHIC_LIMITATIONS);
  return structuredClone(r) as unknown as ScenarioDemographicContext;
}
const AGENT_LIMITATION = 'Historical rounded aggregates only. Nil/negligible cells use zero without proving absence. No current population, individual attributes, locations, behaviour or scenario effects follow.';
/** An unresolved/foreign affiliation never inherits the Singapore profile. */
export function contextForAgent(snapshot:ScenarioDemographicContext,jurisdictionLabel:string|null):ScenarioDemographicAgentContext {
  if(typeof jurisdictionLabel!=='string'||!['singapore','republic of singapore','sg'].includes(jurisdictionLabel.trim().toLowerCase()))
    return {status:'unavailable',limitation:'No demographic context for this foreign or unresolved jurisdiction; explicit Singapore affiliation is required.'};
  const s=parseScenarioDemographicContext(snapshot);
  return {status:'aggregate-context',referenceYear:2020,sourceUrl:s.source.url,grain:s.grain,national:s.national,
    publishedNationalTotal:s.publishedNationalTotal,leafMinusPublished:s.leafMinusPublished,planningArea:s.planningArea,limitation:AGENT_LIMITATION};
}
/** Compact, sourced planner data. Geography never routes a scenario or assigns a role. */
export function demographicPrompt(snapshot:ScenarioDemographicContext):string {
  return JSON.stringify({...contextForAgent(snapshot,'Singapore'),usage:'Use only for explicitly Singapore-affiliated roles; foreign/unresolved roles have no demographic context. Age bands are aggregate context, never assigned personal attributes.'});
}
