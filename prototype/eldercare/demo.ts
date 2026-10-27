import { readFileSync } from 'node:fs';
import { prepareCensus } from '../agents/prepare.ts';
import { generatePopulation } from '../agents/generate.ts';
import type { SyntheticPopulation } from '../agents/types.ts';
import type { OriginReference } from './types.ts';
import { deriveDemonstrationOrigins } from './demo-origins.ts';
export { demonstrationIntervention } from './preset.ts';

const root=new URL('../../',import.meta.url);
export function createDemonstrationPopulation(size=2000,seed='eldercare-demo'): {population:SyntheticPopulation;origins:OriginReference[]} {
  const d=prepareCensus(readFileSync(new URL('data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv',root),'utf8'));
  const population=generatePopulation(d,{size,seed,planningAreas:['Bukit Merah']});
  const stopsRaw=readFileSync(new URL('data/transport/mrt-network/stops.txt',root),'utf8');
  const zonesRaw=readFileSync(new URL('data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson',root),'utf8');
  return {population,origins:deriveDemonstrationOrigins(stopsRaw,zonesRaw)};
}
