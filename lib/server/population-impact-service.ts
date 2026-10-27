// Node-side only. No raw demographic distribution or graph is returned to the browser.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { loadFeed } from '../../prototype/mrt/gtfs.ts';
import { buildGraph } from '../../prototype/mrt/graph.ts';
import { prepareCensus } from '../../prototype/agents/prepare.ts';
import { generatePopulation } from '../../prototype/agents/generate.ts';
import { runPopulationImpact } from '../../prototype/agents/impact/simulation.ts';
import type { PopulationOptions } from '../../prototype/agents/types.ts';
import type { ImpactOptions, ImpactResult } from '../../prototype/agents/impact/types.ts';

const root=new URL('../../',import.meta.url);
/** Caller can retain ImpactResult server-side for profile lookup; serialize only payload/metrics/diagnostics. */
export function runImpactFromLocalData(population: PopulationOptions, intervention: unknown, options: ImpactOptions): ImpactResult {
  const distribution=prepareCensus(readFileSync(new URL('data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv',root),'utf8'));
  const citizens=generatePopulation(distribution,population);
  const baseline=buildGraph(loadFeed(fileURLToPath(new URL('data/transport/mrt-network/',root))),{date:options.assumptions.referenceDate});
  return runPopulationImpact(citizens,baseline,intervention,options);
}
