import { parseCitizenSimulation, parseCitizenProfile } from '../contracts/citizen-simulation.ts';
import type { CitizenSimulationPayload, CitizenProfileResponse, CitizenAnimation } from '../contracts/citizen-simulation.ts';

export type CitizenView = 'baseline' | 'scenario';
export interface CitizenViewPair { baseline: CitizenSimulationPayload; scenario: CitizenSimulationPayload }

function freeze<T>(value:T):T {
  if (value && typeof value==='object') {
    for (const child of Object.values(value)) freeze(child);
    Object.freeze(value);
  }
  return value;
}
function same(a:unknown,b:unknown):boolean {
  if (a===b) return true;
  if (!a || !b || typeof a!=='object' || typeof b!=='object') return false;
  const first=a as Record<string,unknown>, second=b as Record<string,unknown>;
  return Object.keys(first).length===Object.keys(second).length && Object.keys(first).every(key=>Object.hasOwn(second,key) && same(first[key],second[key]));
}
/** Validate before cloning; callers cannot mutate the accepted pair through their input. */
export function parseCitizenViewPair(value:unknown):CitizenViewPair {
  if (!value || typeof value!=='object' || Array.isArray(value) || Object.keys(value).length!==2 || !Object.hasOwn(value,'baseline') || !Object.hasOwn(value,'scenario')) throw new Error('Invalid citizen view pair');
  const candidate=value as Record<CitizenView,unknown>;
  const baseline=parseCitizenSimulation(candidate.baseline), scenario=parseCitizenSimulation(candidate.scenario);
  if (!same(baseline.metadata.population,scenario.metadata.population)) throw new Error('Citizen view population mismatch');
  const identities=new Map(baseline.citizens.map(c=>[c.agentId,c]));
  if (identities.size!==scenario.citizens.length || !scenario.citizens.every(c=>same(identities.get(c.agentId),c))) throw new Error('Citizen view identity mismatch');
  for (const citizen of baseline.citizens) {
    if (!same(baseline.sources.find(s=>s.id===citizen.sourceId),scenario.sources.find(s=>s.id===citizen.sourceId))) throw new Error('Citizen view identity source mismatch');
  }
  return freeze(structuredClone({baseline,scenario}));
}

/** Profiles inspect the full supplied payload, independently of the render sample. */
export function getCitizenProfile(payload:CitizenSimulationPayload,agentId:string):CitizenProfileResponse|null {
  const citizen=payload.citizens.find(c=>c.agentId===agentId);
  if (!citizen) return null;
  const journey=payload.journeys.find(j=>j.agentId===agentId) ?? null;
  const suppliedAnimation=payload.animations.find(a=>a.agentId===agentId) ?? null;
  const animation=suppliedAnimation?structuredClone(suppliedAnimation):null;
  const hypothetical=journey?.assignment==='hypothetical';
  if (animation && (!journey || (hypothetical && journey.comparison.scenarioStatus!=='reachable'))) animation.state='idle';
  // The v1 profile validator requires hypothetical description text. Reuse declared
  // assignment context verbatim; this is neither an observed activity nor a routine.
  const assignmentContext=hypothetical?payload.assumptions.find(a=>a.kind==='journey-assignment' && journey.assumptionIds.includes(a.id))!.description:null;
  return freeze(structuredClone(parseCitizenProfile({schemaVersion:payload.schemaVersion,metadata:payload.metadata,sources:payload.sources,assumptions:payload.assumptions,citizen,journey,animation,
    activity:{status:hypothetical?'hypothetical':'unassigned',assumptionIds:hypothetical?journey.assumptionIds:[],description:assignmentContext,destinationCategories:[],transportPreferences:[]}})));
}

/** Stable ID selection for rendering only; never a metrics denominator. */
export function selectCitizenSample(pair:CitizenViewPair,limit=300):string[] {
  if (!Number.isInteger(limit) || limit<0 || limit>300) throw new Error('Citizen render limit must be an integer from 0 to 300');
  // WGS84 poles are valid contract coordinates but cannot be displayed in Mercator.
  // Omit from rendering only; retain their inspectable profiles and supplied outcomes.
  const renderable=(a:CitizenAnimation)=>a.position!==null&&Math.abs(a.position.lat)<=85.05112878&&a.waypoints.every(p=>Math.abs(p.lat)<=85.05112878);
  const before=new Set(pair.baseline.animations.filter(renderable).map(a=>a.agentId));
  const after=new Set(pair.scenario.animations.filter(renderable).map(a=>a.agentId));
  return pair.baseline.citizens.map(c=>c.agentId).filter(id=>before.has(id)&&after.has(id)).sort().slice(0,limit);
}
