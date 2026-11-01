/** Pure private cohort selection. Never recalculates, reweights or alters population impacts. */
import {ensure,freezeSnapshot,object,hash,text,assertJsonData} from '../experiments/validation.ts';
import {groundDistance} from '../plots/adapters.ts';
import {isPlotPosition,type PlotPosition} from '../plots/geometry.ts';
import {randomFor} from '../society/contract.ts';
import type {PopulationView} from '../population/contract.ts';
import type {HybridBinding} from '../interventions/binding.ts';
import type {CitizenDataset,CitizenCommuteRun,CitizenCommuteFact,CitizenRecord} from './contract.ts';
import type {CitizenGroundedInput} from './social.ts';
export const CITIZEN_SELECTION_POLICY='citizen-selection-v2' as const;
const nearMetres=2500,changed=new Set(['improved','worse','newly-reachable']);
const statuses=['improved','worse','newly-reachable','unchanged','unreachable','unknown','not-applicable'];
export interface CitizenSelectionV2 {
 version:2;policy:typeof CITIZEN_SELECTION_POLICY;populationId:string;datasetId:string;scenarioFingerprint:string;bindingFingerprint:string;seed:string;
 eligibleAdults:number;availableImpacts:number;availableNear:number;
 members:{id:string;bucket:'impact'|'geography'|'comparison'|'fallback';status:CitizenCommuteFact['status'];distanceMetres:number|null}[];
}
type Binding=Pick<HybridBinding,'fingerprint'|'scenarioFingerprint'|'intent'|'intervention'|'geometry'>;
function sites(binding:Binding):PlotPosition[]{
 ensure(binding.intent.type==='new_mrt_line'&&binding.intervention!==null,'CITIZEN_SELECTION_INTERVENTION');
 const ids=binding.intent.stationPointIds;ensure(ids.length>=2&&ids.length<=40&&new Set(ids).size===ids.length,'CITIZEN_SELECTION_STATIONS');
 // Accepted intent owns station membership; original user drawings may retain an unassigned role.
 return ids.map(id=>{const p=binding.geometry.features.find(p=>p.id===id);ensure(p?.kind==='point'&&isPlotPosition(p.coordinate),'CITIZEN_SELECTION_STATIONS');return p.coordinate;});
}
function distance(c:CitizenRecord,points:PlotPosition[]):number|null {
 const proxies=[c.homeProxy,c.workplaceProxy].filter((p):p is NonNullable<typeof p>=>!!p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=1&&p.lat<=1.6&&p.lon>=103.5&&p.lon<=104.6);
 return proxies.length?Math.ceil(Math.min(...proxies.flatMap(p=>points.map(q=>groundDistance(p,q))))):null;
}
type Candidate={citizen:CitizenRecord;fact:CitizenCommuteFact;metres:number|null};
const compare=(seed:string,a:string,b:string)=>randomFor(seed+'|'+a)-randomFor(seed+'|'+b)||(a<b?-1:a>b?1:0);
/** One per planning area per round; within areas rotate demographic/employment/mode strata. */
function spread(pool:Candidate[],count:number,seed:string):Candidate[]{
 const areas=new Map<string,Map<string,Candidate[]>>();
 for(const c of pool){const r=c.citizen,key=[r.ageGroup,r.sex,r.labourForceStatus,r.travelMode].join('|');let area=areas.get(r.planningArea);if(!area)areas.set(r.planningArea,area=new Map());const group=area.get(key)??[];group.push(c);area.set(key,group);}
 const ordered=[...areas].sort(([a],[b])=>compare(seed+'area',a,b)).map(([area,groups])=>({next:0,groups:[...groups].sort(([a],[b])=>compare(seed+area,a,b)).map(([,items])=>({at:0,items:items.sort((a,b)=>compare(seed,a.citizen.id,b.citizen.id))}))}));
 const result:Candidate[]=[];let progress=true;
 while(result.length<count&&progress){progress=false;for(const area of ordered){if(result.length===count)break;for(let tries=0;tries<area.groups.length;tries++){const group=area.groups[area.next++%area.groups.length];if(group.at<group.items.length){result.push(group.items[group.at++]);progress=true;break;}}}}
 return result;
}
export function selectCitizenCohort(dataset:CitizenDataset,run:CitizenCommuteRun,binding:Binding,capacity:number,seed:string):CitizenSelectionV2 {
 ensure([50,100].includes(capacity),'CITIZEN_SELECTION_CAPACITY');text(seed,128);
 ensure(dataset.records.length<=10000&&run.facts.length===dataset.records.length&&run.citizenDatasetId===dataset.id&&run.populationId===dataset.populationId&&run.scenarioFingerprint===binding.scenarioFingerprint,'CITIZEN_SELECTION_SOURCE');
 const points=sites(binding),facts=new Map(run.facts.map(f=>[f.citizenId,f]));ensure(facts.size===run.facts.length&&new Set(dataset.records.map(c=>c.id)).size===dataset.records.length,'CITIZEN_SELECTION_IDENTITIES');
 const candidates:Candidate[]=dataset.records.map(c=>{const fact=facts.get(c.id);ensure(fact&&statuses.includes(fact.status)&&fact.citizenDatasetId===dataset.id&&fact.populationId===dataset.populationId&&fact.scenarioFingerprint===run.scenarioFingerprint,'CITIZEN_SELECTION_FACT');return {citizen:c,fact,metres:null};}).filter(c=>Number(c.citizen.ageGroup.split('_')[0])>=20).map(c=>({...c,metres:distance(c.citizen,points)}));
 ensure(candidates.length>=capacity,'CITIZEN_SELECTION_ADULTS');
 const members:CitizenSelectionV2['members']=[],used=new Set<string>();
 const add=(c:Candidate,bucket:CitizenSelectionV2['members'][number]['bucket'])=>{if(!used.has(c.citizen.id)){used.add(c.citizen.id);members.push({id:c.citizen.id,bucket,status:c.fact.status,distanceMetres:c.metres});}};
 const impact=candidates.filter(c=>changed.has(c.fact.status)),near=candidates.filter(c=>c.metres!==null&&c.metres<=nearMetres),quota=Math.floor(capacity/4);
 const kinds=['worse','newly-reachable','improved'].map(kind=>impact.filter(c=>c.fact.status===kind).sort((a,b)=>Math.abs(b.fact.minutesSaved??0)-Math.abs(a.fact.minutesSaved??0)||compare(seed,a.citizen.id,b.citizen.id)));
 for(let at=0;members.length<quota&&kinds.some(g=>g.length>at);at++)for(const group of kinds){if(members.length===quota)break;if(group[at])add(group[at],'impact');}
 for(const c of near.filter(c=>!used.has(c.citizen.id)).sort((a,b)=>a.metres!-b.metres!||compare(seed,a.citizen.id,b.citizen.id)).slice(0,quota))add(c,'geography');
 const comparison=candidates.filter(c=>!used.has(c.citizen.id)&&!changed.has(c.fact.status)&&(c.metres===null||c.metres>nearMetres));
 for(const c of spread(comparison,capacity-members.length,seed))add(c,'comparison');
 for(const c of spread(candidates.filter(c=>!used.has(c.citizen.id)),capacity-members.length,seed))add(c,'fallback');
 ensure(members.length===capacity,'CITIZEN_SELECTION_CAPACITY');
 return freezeSnapshot({version:2,policy:CITIZEN_SELECTION_POLICY,populationId:dataset.populationId,datasetId:dataset.id,scenarioFingerprint:run.scenarioFingerprint,bindingFingerprint:binding.fingerprint,seed,eligibleAdults:candidates.length,availableImpacts:impact.length,availableNear:near.length,members});
}
/** Replay validates the frozen roster without loading or reranking mutable external data. */
export function validateCitizenSelection(s:CitizenSelectionV2,population:PopulationView,capacity:number,seed:string,grounding?:CitizenGroundedInput):void {
 assertJsonData(s);ensure(new TextEncoder().encode(JSON.stringify(s)).length<=32000,'CITIZEN_SELECTION_BOUND');
 object(s,['version','policy','populationId','datasetId','scenarioFingerprint','bindingFingerprint','seed','eligibleAdults','availableImpacts','availableNear','members']);
 ensure(s.version===2&&s.policy===CITIZEN_SELECTION_POLICY&&s.populationId===population.id&&s.seed===seed&&[50,100].includes(capacity),'CITIZEN_SELECTION_IDENTITY');
 hash(s.populationId,'population-');hash(s.datasetId,'citizens-');hash(s.scenarioFingerprint,'');hash(s.bindingFingerprint,'');text(s.seed,128);
 ensure(Number.isSafeInteger(s.eligibleAdults)&&s.eligibleAdults>=capacity&&s.eligibleAdults<=10000&&[s.availableImpacts,s.availableNear].every(n=>Number.isSafeInteger(n)&&n>=0&&n<=s.eligibleAdults),'CITIZEN_SELECTION_COUNTS');
 ensure(Array.isArray(s.members)&&s.members.length===capacity&&new Set(s.members.map(m=>m.id)).size===capacity&&population.residents.length===capacity,'CITIZEN_SELECTION_ROSTER');
 s.members.forEach((m,i)=>{object(m,['id','bucket','status','distanceMetres']);ensure(m.id===population.residents[i].id&&Number(population.residents[i].ageGroup.split('_')[0])>=20&&statuses.includes(m.status)&&['impact','geography','comparison','fallback'].includes(m.bucket),'CITIZEN_SELECTION_ROSTER');ensure(m.distanceMetres===null||Number.isSafeInteger(m.distanceMetres)&&m.distanceMetres>=0&&m.distanceMetres<=20000002,'CITIZEN_SELECTION_DISTANCE');if(m.bucket==='impact')ensure(changed.has(m.status),'CITIZEN_SELECTION_REASON');if(m.bucket==='geography')ensure(m.distanceMetres!==null&&m.distanceMetres<=nearMetres,'CITIZEN_SELECTION_REASON');if(m.bucket==='comparison')ensure(!changed.has(m.status)&&(m.distanceMetres===null||m.distanceMetres>nearMetres),'CITIZEN_SELECTION_REASON');});
 ensure(s.members.filter(m=>m.bucket==='impact').length<=Math.floor(capacity/4)&&s.members.filter(m=>m.bucket==='geography').length<=Math.floor(capacity/4),'CITIZEN_SELECTION_QUOTA');
 ensure(s.availableImpacts>=s.members.filter(m=>changed.has(m.status)).length&&s.availableNear>=s.members.filter(m=>m.distanceMetres!==null&&m.distanceMetres<=nearMetres).length,'CITIZEN_SELECTION_COUNTS');
 if(grounding){ensure(grounding.version===2&&grounding.datasetId===s.datasetId&&grounding.scenarioFingerprint===s.scenarioFingerprint&&grounding.hybridBinding.fingerprint===s.bindingFingerprint,'CITIZEN_SELECTION_GROUNDING');const points=sites(grounding.hybridBinding);s.members.forEach((m,i)=>{const p=grounding.profiles[i];ensure(p?.citizen.id===m.id&&p.commute?.status===m.status&&distance(p.citizen,points)===m.distanceMetres,'CITIZEN_SELECTION_GROUNDING');});}
}
export function selectionDisclosure(s:CitizenSelectionV2):string {
 const count=(bucket:string)=>s.members.filter(m=>m.bucket===bucket).length;
 return `${CITIZEN_SELECTION_POLICY}: enriched discussion cohort of ${s.members.length}, by selection reason: ${count('impact')} impact-priority, ${count('geography')} proximity-priority, ${count('comparison')} broader comparison, ${count('fallback')} fallback. Proximity uses home/work proxies within 2.5 km of validated station dots, not walking access or a benefit. This is not a representative or causal control sample; all population-wide weights and impact totals remain unchanged.`;
}
