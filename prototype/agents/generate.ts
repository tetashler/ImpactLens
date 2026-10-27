import { createHash } from 'node:crypto';
import { AGE_GROUPS, normaliseGeography } from './prepare.ts';
import type { DemographicDistribution, PopulationOptions, SyntheticPopulation, SyntheticCitizen, RenderAgent } from './types.ts';

export function generatePopulation(distribution: DemographicDistribution, options: PopulationOptions): SyntheticPopulation {
  if (!options || !Number.isSafeInteger(options.size) || options.size<1) throw new Error('Sample size must be a positive safe integer');
  if (typeof options.seed !== 'string' || !options.seed.trim()) throw new Error('Seed must be nonempty text');
  if (!distribution || distribution.schemaVersion!==1 || !Array.isArray(distribution.cells) || !distribution.source?.rawSha256) throw new Error('Invalid demographic distribution');
  const keys = new Set<string>();
  for (const c of distribution.cells) {
    if (!AGE_GROUPS.includes(c.ageGroup) || !['male','female'].includes(c.sex) || normaliseGeography(c.planningArea)!==c.planningArea || normaliseGeography(c.subzone)!==c.subzone) throw new Error('Invalid demographic category');
    if (!Number.isSafeInteger(c.count) || c.count<0) throw new Error('Invalid population count');
    const key = JSON.stringify([c.planningArea,c.subzone,c.ageGroup,c.sex]);
    if (keys.has(key)) throw new Error('Duplicate demographic cell');
    keys.add(key);
  }
  const total = distribution.cells.reduce((s,c)=>s+c.count,0);
  if (!Number.isSafeInteger(total) || total!==distribution.population) throw new Error('Inconsistent distribution population total');
  const selection = (items: string[] | undefined, known: Set<string>) => {
    if (items === undefined) return undefined;
    if (!Array.isArray(items) || !items.length) throw new Error('Empty geographic selection');
    const selected = new Set(items.map(normaliseGeography));
    for (const id of selected) if (!known.has(id)) throw new Error(`Unknown geographic selection: ${id}`);
    return selected;
  };
  const areas = selection(options.planningAreas,new Set(distribution.cells.map(c=>c.planningArea)));
  const zones = selection(options.subzones,new Set(distribution.cells.map(c=>c.subzone)));
  const cells = distribution.cells.filter(c=>(!areas || areas.has(c.planningArea)) && (!zones || zones.has(c.subzone)) && c.count>0)
    .sort((a,b)=> { const x=JSON.stringify([a.planningArea,a.subzone,a.ageGroup,a.sex]), y=JSON.stringify([b.planningArea,b.subzone,b.ageGroup,b.sex]); return x<y?-1:x>y?1:0; });
  const representedPopulation = cells.reduce((s,c)=>s+c.count,0);
  if (!representedPopulation) throw new Error('Empty population in geographic selection');
  if (options.size<cells.length) throw new Error(`Sample size ${options.size} cannot cover ${cells.length} positive cells; increase size or narrow geographic selection`);
  // SHA-256 seeds a specified 32-bit PRNG; no ambient random state or timestamps.
  let state = createHash('sha256').update(options.seed).digest().readUInt32LE(0);
  const random = () => {
    state = (state+0x6D2B79F5)>>>0;
    let t = Math.imul(state^(state>>>15),state|1);
    t ^= t+Math.imul(t^(t>>>7),t|61);
    return ((t^(t>>>14))>>>0)/4294967296;
  };
  const remainder = options.size-cells.length;
  const allocations = cells.map(c=> {
    const quota=remainder*c.count/representedPopulation;
    return {cell:c,n:1+Math.floor(quota),fraction:quota-Math.floor(quota),tie:random()};
  });
  const remaining=options.size-allocations.reduce((s,a)=>s+a.n,0);
  const ranked=[...allocations].sort((a,b)=>b.fraction-a.fraction || a.tie-b.tie);
  for (let i=0;i<remaining;i++) ranked[i].n++;
  const source=structuredClone(distribution.source);
  const citizens: SyntheticCitizen[]=[];
  const runId=createHash('sha256').update(JSON.stringify({seed:options.seed,size:options.size,source,cells:cells.map(c=>[c.planningArea,c.subzone,c.ageGroup,c.sex,c.count])})).digest('hex').slice(0,16);
  for (const {cell,n} of allocations) {
    const {count,sourceRow,...observed}=cell;
    for (let i=0;i<n;i++) citizens.push({id:`syn-${runId}-${citizens.length+1}`,synthetic:true,weight:count/n,observed:{...observed},
      assumed:{status:'unassigned',assumptionIds:[]},provenance:{...structuredClone(source),sourceRow}});
  }
  for (let i=citizens.length-1;i>0;i--) { const j=Math.floor(random()*(i+1)); [citizens[i],citizens[j]]=[citizens[j],citizens[i]]; }
  return {schemaVersion:1,seed:options.seed,representedPopulation,source,method:'minimum-one-largest-remainder-v1',citizens};
}
export function toRenderAgent(c: SyntheticCitizen): RenderAgent {
  return {agentId:c.id,origin:{planningArea:c.observed.planningArea,subzone:c.observed.subzone},demographic:{ageGroup:c.observed.ageGroup,sex:c.observed.sex},weight:c.weight};
}
