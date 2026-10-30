/** Server-only local Census adapter. No generation, retrieval or location assignment. */
import {readFileSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {prepareCensus} from '../../../prototype/agents/prepare.ts';
import type {DemographicDistribution} from '../../../prototype/agents/types.ts';
import {parseScenarioDemographicContext,SCENARIO_DEMOGRAPHIC_SOURCE,SCENARIO_DEMOGRAPHIC_GRAIN,SCENARIO_DEMOGRAPHIC_AGE_GROUPS,SCENARIO_DEMOGRAPHIC_UNKNOWNS,SCENARIO_DEMOGRAPHIC_LIMITATIONS,type ScenarioAgeProfile,type ScenarioDemographicContext} from '../../demographics/scenario-context.ts';

let cached:{path:string;size:number;mtimeMs:number;distribution:DemographicDistribution}|undefined;
function source():DemographicDistribution {
  const path=join(process.cwd(),'data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv');
  const stat=statSync(path);
  if(!cached||cached.path!==path||cached.size!==stat.size||cached.mtimeMs!==stat.mtimeMs)
    cached={path,size:stat.size,mtimeMs:stat.mtimeMs,distribution:prepareCensus(readFileSync(path,'utf8'))};
  return cached.distribution;
}
function aggregate(distribution:DemographicDistribution,name:string,planningArea?:string):ScenarioAgeProfile {
  const ageGroups=Object.fromEntries(SCENARIO_DEMOGRAPHIC_AGE_GROUPS.map(age=>[age,0])) as ScenarioAgeProfile['ageGroups'];
  let leafPopulation=0;
  for(const cell of distribution.cells) {
    if(planningArea!==undefined&&cell.planningArea!==planningArea)continue;
    ageGroups[cell.ageGroup]+=cell.count;leafPopulation+=cell.count;
  }
  return {name,leafPopulation,ageGroups};
}
/** Casefolded whole-token geography lookup; multiple matches remain unresolved. */
export function buildScenarioDemographicContext(question:string,_geometry?:unknown):ScenarioDemographicContext {
  if(typeof question!=='string'||question.length>2000)throw new Error('Invalid bounded demographic question');
  const d=source();
  const areas=new Map(d.cells.map(c=>[c.planningArea,c.planningAreaName]));
  const tokens=` ${question.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()} `;
  const matches=[...areas].filter(([,name])=>tokens.includes(` ${name.toLowerCase().replace(/[^a-z0-9]+/g,' ').trim()} `));
  const national=aggregate(d,'Singapore');
  return parseScenarioDemographicContext({version:1,source:{...SCENARIO_DEMOGRAPHIC_SOURCE,rawSha256:d.source.rawSha256},grain:SCENARIO_DEMOGRAPHIC_GRAIN,
    national,publishedNationalTotal:d.audit.publishedNationalTotal,leafMinusPublished:national.leafPopulation-d.audit.publishedNationalTotal,
    planningArea:matches.length===1?aggregate(d,matches[0][1],matches[0][0]):null,
    unknowns:[...SCENARIO_DEMOGRAPHIC_UNKNOWNS],limitations:[...SCENARIO_DEMOGRAPHIC_LIMITATIONS]});
}
