import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareCensus } from './prepare.ts';
import { generatePopulation } from './generate.ts';

try {
  let size=2000, seed='impactlens-phase4a', area: string | undefined, subzone: string | undefined, preprocess=false, all=false;
  const args=process.argv.slice(2);
  for (let i=0;i<args.length;i++) {
    const flag=args[i];
    if (flag==='--prepare') { preprocess=true; continue; }
    if (flag==='--all') { all=true; continue; }
    if (!['--size','--seed','--area','--subzone'].includes(flag)) throw new Error(`Unknown option ${flag}`);
    const value=args[++i];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag==='--size') size=Number(value);
    if (flag==='--seed') seed=value;
    if (flag==='--area') area=value;
    if (flag==='--subzone') subzone=value;
  }
  const root=fileURLToPath(new URL('../../',import.meta.url));
  const input=resolve(root,'data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv');
  const d=prepareCensus(readFileSync(input,'utf8'));
  const validation={publishedNationalTotal:d.audit.publishedNationalTotal,representedNationalLeafTotal:d.population,totalDiscrepancies:d.audit.discrepancies.length,discrepanciesBeyondRoundingCheck:d.audit.discrepancies.filter(x=>Math.abs(x.difference)>x.tolerance).length,nilOrNegligibleCells:d.audit.nilOrNegligibleCells};
  if (all && (area || subzone)) throw new Error('--all cannot be combined with --area or --subzone');
  if (preprocess) {
    const output=resolve(root,'data/derived/agents/census2020.json');
    mkdirSync(dirname(output),{recursive:true}); writeFileSync(output,JSON.stringify(d,null,2)+'\n');
    console.log(JSON.stringify({output,referenceYear:d.source.referenceYear,population:d.population,rawRows:d.audit.rawRows,planningAreas:d.audit.planningAreas,subzones:d.audit.subzones,jointCells:d.cells.length,validation},null,2));
  } else {
    // Default a neighbourhood-scale area rather than silently omitting national strata.
    const p=generatePopulation(d,{size,seed,planningAreas:area?[area]:subzone || all?undefined:['Ang Mo Kio'],subzones:subzone?[subzone]:undefined});
    const summarise=(key:'planningArea'|'ageGroup'|'sex')=> {
      const result: Record<string,{agents:number;population:number}>={};
      for (const c of p.citizens) { const id=c.observed[key]; result[id]??={agents:0,population:0}; result[id].agents++; result[id].population+=c.weight; }
      for (const value of Object.values(result)) value.population=Number(value.population.toFixed(6));
      return result;
    };
    console.log(JSON.stringify({kind:d.source.kind,referenceYear:d.source.referenceYear,datasetId:d.source.datasetId,seed,agentCount:p.citizens.length,representedPopulation:p.representedPopulation,positiveCells:new Set(p.citizens.map(c=>`${c.observed.planningArea}/${c.observed.subzone}/${c.observed.ageGroup}/${c.observed.sex}`)).size,method:p.method,byPlanningArea:summarise('planningArea'),byAgeGroup:summarise('ageGroup'),bySex:summarise('sex'),validation,assumptions:d.source.assumptionIds,warning:'Historical Census 2020 rounded cell counts; synthetic representatives, unassigned behaviour and locations.'},null,2));
  }
} catch (error) { console.error((error as Error).message); process.exitCode=1; }
