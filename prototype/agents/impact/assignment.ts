import { createHash } from 'node:crypto';
import { AGE_GROUPS } from '../prepare.ts';
import type { SyntheticCitizen } from '../types.ts';
import type { Graph } from '../../mrt/graph.ts';
import type { AssignedJourney, ImpactAssumptions } from './types.ts';

function requireValue(condition: unknown, message: string): asserts condition { if (!condition) throw new Error(message); }
function text(value: unknown): value is string { return typeof value==='string' && !!value.trim(); }
function geography(value: unknown): value is string { return typeof value==='string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value); }
function keys(value: unknown, allowed: string[], label: string): asserts value is Record<string,unknown> {
  requireValue(value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).every(k=>allowed.includes(k)),`Invalid ${label} fields`);
}
/** Per-agent hash draws avoid order dependence and shared RNG state. */
function draw(seed: string, agentId: string, purpose: string): number {
  return createHash('sha256').update(JSON.stringify([seed,agentId,purpose])).digest().readUInt32BE(0)/4294967296;
}
function distance(lat: number, lon: number, lat2: number, lon2: number): number {
  const rad=Math.PI/180, a=Math.sin((lat2-lat)*rad/2)**2+Math.cos(lat*rad)*Math.cos(lat2*rad)*Math.sin((lon2-lon)*rad/2)**2;
  return 6371008.8*2*Math.asin(Math.sqrt(Math.min(1,a)));
}
export function validateAssumptions(c: ImpactAssumptions, graph: Graph, citizens: SyntheticCitizen[]): void {
  keys(c,['id','version','description','referenceDate','seed','unassigned','eligible','travel'],'assumption');
  requireValue(c.version===1 && typeof c.id==='string' && /^[A-Za-z0-9][A-Za-z0-9._:-]{0,100}$/.test(c.id),'Invalid assumption id/version');
  requireValue(text(c.description) && text(c.seed) && c.unassigned==='retain-unknown','Invalid assumption description/seed/unassigned policy');
  const date=new Date(`${c.referenceDate}T00:00:00Z`);
  requireValue(/^\d{4}-\d{2}-\d{2}$/.test(c.referenceDate) && Number.isFinite(date.getTime()) && date.toISOString().slice(0,10)===c.referenceDate && c.referenceDate===graph.date,'Assumption date must match baseline service date');
  const known=new Set(citizens.map(x=>x.id));
  requireValue(known.size===citizens.length,'Duplicate synthetic agent identifiers');
  if (c.eligible!==undefined) {
    keys(c.eligible,['ageGroups','sexes','planningAreas'],'eligibility');
    for (const [key,values] of Object.entries(c.eligible)) {
      requireValue(Array.isArray(values) && new Set(values).size===values.length,'Invalid eligibility categories');
      for (const value of values) requireValue(key==='ageGroups'?AGE_GROUPS.includes(value as never):key==='sexes'?['male','female'].includes(value):geography(value),'Invalid eligibility category');
    }
  }
  const t=c.travel;
  requireValue(t && typeof t==='object','Missing travel configuration');
  if (t.method==='explicit-od') {
    keys(t,['method','pairs'],'explicit journey');
    requireValue(Array.isArray(t.pairs),'Invalid explicit pairs'); const seen=new Set<string>();
    for (const p of t.pairs) {
      keys(p,['agentId','origin','destination'],'explicit pair');
      requireValue(known.has(p.agentId) && !seen.has(p.agentId),'Unknown or duplicate explicit agent'); seen.add(p.agentId);
      requireValue(text(p.origin) && text(p.destination),'Explicit endpoints require station text');
    }
  } else {
    requireValue(t.method==='destination-distribution','Unknown travel method');
    keys(t,['method','participationRate','origins','destinations'],'distributed journey');
    requireValue(Number.isFinite(t.participationRate) && t.participationRate>=0 && t.participationRate<=1,'Invalid participation rate');
    requireValue(Array.isArray(t.destinations) && t.destinations.length>0,'Empty destination distribution');
    let sum=0; const destinations=new Set<string>();
    for (const d of t.destinations) {
      keys(d,['stationId','share'],'destination');
      const id=graph.aliases.get(d.stationId)??d.stationId;
      requireValue(text(id) && !destinations.has(id) && Number.isFinite(d.share) && d.share>0,'Invalid/duplicate destination share'); destinations.add(id);sum+=d.share;
    }
    requireValue(Number.isFinite(sum),'Nonfinite destination share total');
    const o=t.origins, seen=new Set<string>();
    requireValue(o && typeof o==='object','Missing origins');
    if (o.method==='explicit-stations') {
      keys(o,['method','rules'],'origin rules'); requireValue(Array.isArray(o.rules),'Invalid origin rules');
      for (const r of o.rules) {
        keys(r,['planningArea','subzone','stationId'],'origin rule');
        const id=graph.aliases.get(r.stationId)??r.stationId;
        requireValue(geography(r.planningArea) && (r.subzone===undefined || geography(r.subzone)) && graph.stations.has(id) && [...graph.states.values()].some(s=>s.stationId===id),'Invalid origin geography/station');
        const key=`${r.planningArea}/${r.subzone??'*'}`; requireValue(!seen.has(key),'Duplicate origin rule'); seen.add(key);
      }
    } else {
      requireValue(o.method==='reference-point-nearest','Unknown origin method'); keys(o,['method','maxDistanceMetres','points'],'catchment');
      requireValue(Number.isFinite(o.maxDistanceMetres) && o.maxDistanceMetres>=0 && Array.isArray(o.points),'Invalid catchment distance/points');
      for (const p of o.points) {
        keys(p,['planningArea','subzone','lat','lon','basis'],'reference point');
        requireValue(geography(p.planningArea) && geography(p.subzone) && text(p.basis) && Number.isFinite(p.lat) && Math.abs(p.lat)<=90 && Number.isFinite(p.lon) && Math.abs(p.lon)<=180,'Invalid geographic reference point');
        const key=`${p.planningArea}/${p.subzone}`; requireValue(!seen.has(key),'Duplicate geographic reference point');seen.add(key);
      }
    }
  }
}
export function assignJourneys(citizens: SyntheticCitizen[], graph: Graph, c: ImpactAssumptions): AssignedJourney[] {
  validateAssumptions(c,graph,citizens);
  const canonical=(id:string)=>graph.aliases.get(id)??id;
  const explicit=c.travel.method==='explicit-od'?new Map(c.travel.pairs.map(p=>[p.agentId,p])):null;
  const stations=[...graph.stations.values()].filter(s=>[...graph.states.values()].some(state=>state.stationId===s.id)).sort((a,b)=>a.id<b.id?-1:a.id>b.id?1:0);
  const origins=new Map<string,{stationId:string;reason:AssignedJourney['reason']}>();
  return citizens.map(citizen=>{
    const d=citizen.observed;
    const empty=(reason:AssignedJourney['reason']):AssignedJourney=>({agentId:citizen.id,pair:null,reason});
    if ((c.eligible?.ageGroups && !c.eligible.ageGroups.includes(d.ageGroup)) || (c.eligible?.sexes && !c.eligible.sexes.includes(d.sex)) || (c.eligible?.planningAreas && !c.eligible.planningAreas.includes(d.planningArea))) return empty('ineligible');
    if (explicit) {
      const p=explicit.get(citizen.id);return p?{agentId:citizen.id,pair:{origin:canonical(p.origin),destination:canonical(p.destination)},reason:'assigned'}:empty('not-specified');
    }
    const t=c.travel;
    if (t.method!=='destination-distribution') throw new Error('Invalid travel method');
    if (draw(c.seed,citizen.id,'participation')>=t.participationRate) return empty('not-participating');
    const key=`${d.planningArea}/${d.subzone}`;
    if (!origins.has(key)) {
      let stationId='', reason:AssignedJourney['reason']='missing-geography';
      if (t.origins.method==='explicit-stations') {
        const rules=t.origins.rules;
        const rule=rules.find(r=>r.planningArea===d.planningArea && r.subzone===d.subzone)??rules.find(r=>r.planningArea===d.planningArea && r.subzone===undefined);
        if (rule) {stationId=canonical(rule.stationId);reason='assigned';}
      } else {
        const p=t.origins.points.find(p=>p.planningArea===d.planningArea && p.subzone===d.subzone);
        if (p) {
          let best=Infinity;
          for (const s of stations) { const metres=distance(p.lat,p.lon,s.lat,s.lon); if (metres<best) {best=metres;stationId=s.id;} }
          reason=best<=t.origins.maxDistanceMetres?'assigned':'outside-catchment';
        }
      }
      origins.set(key,{stationId,reason});
    }
    const origin=origins.get(key)!; if (origin.reason!=='assigned') return empty(origin.reason);
    let remaining=draw(c.seed,citizen.id,'destination')*t.destinations.reduce((s,d)=>s+d.share,0);
    let destination=t.destinations.at(-1)!.stationId;
    for (const d of t.destinations) {remaining-=d.share;if (remaining<0) {destination=d.stationId;break;} }
    return {agentId:citizen.id,pair:{origin:origin.stationId,destination:canonical(destination)},reason:'assigned'};
  });
}
