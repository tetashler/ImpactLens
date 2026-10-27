import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import { prepareFacilityCatalogue } from './prepare.ts';
import { simulateEldercareIntervention } from './accessibility.ts';
import { createDemonstrationPopulation, demonstrationIntervention } from './demo.ts';
import { validateOptions } from './scenario.ts';
import type { AccessibilityOptions } from './types.ts';

try{
  let prepare=false,json=false,benchmark=false,size=2000,seed='eldercare-demo',thresholds=[500,1000];
  const proposal=structuredClone(demonstrationIntervention);
  let speed:number|undefined;
  const args=process.argv.slice(2);
  for(let i=0;i<args.length;i++){
    const flag=args[i];if(flag==='--prepare'){prepare=true;continue;}if(flag==='--json'){json=true;continue;}if(flag==='--benchmark'){benchmark=true;continue;}
    if(!['--size','--seed','--thresholds','--lat','--lon','--capacity','--walking-speed'].includes(flag))throw new Error(`Unknown option ${flag}`);
    const value=args[++i];if(!value || value.startsWith('--'))throw new Error(`Missing value for ${flag}`);
    if(flag==='--size')size=Number(value);if(flag==='--seed')seed=value;
    if(flag==='--thresholds')thresholds=value.split(',').map(Number);if(flag==='--lat')proposal.position.lat=Number(value);if(flag==='--lon')proposal.position.lon=Number(value);
    if(flag==='--capacity')proposal.capacity={users:Number(value),basis:'illustrative-assumption',rationale:'CLI user-supplied illustrative users; no utilisation or allocation model.'};
    if(flag==='--walking-speed')speed=Number(value);
  }
  const options:AccessibilityOptions={referenceDate:'2026-10-27',minimumAge:60,thresholdsMetres:thresholds,existingAvailability:'assume-listed-available',eligibility:'age-only-other-criteria-unknown',...(speed===undefined?{}:{straightLineWalkingMetresPerSecond:speed})};
  validateOptions(options);
  const start=performance.now(),root=new URL('../../',import.meta.url);
  const catalogue=prepareFacilityCatalogue(readFileSync(new URL('data/facilities/EldercareServices.geojson',root),'utf8'));
  const prepared=performance.now();
  if(prepare){
    const dir=new URL('data/derived/eldercare/',root);mkdirSync(dir,{recursive:true});writeFileSync(new URL('catalogue.json',dir),JSON.stringify(catalogue,null,2)+'\n');
    console.log(JSON.stringify({output:'data/derived/eldercare/catalogue.json',source:catalogue.source,validRecords:catalogue.facilities.length,corroboratedAac:catalogue.facilities.filter(f=>f.serviceType==='aac').length,audit:catalogue.audit,...(benchmark?{preparationMilliseconds:Number((prepared-start).toFixed(3))}:{})},null,2));
  }else{
    const input=createDemonstrationPopulation(size,seed),generated=performance.now();
    const result=simulateEldercareIntervention(catalogue,proposal,input.population,input.origins,options),finished=performance.now(),memory=process.memoryUsage();
    const timings=benchmark?{preparationMilliseconds:Number((prepared-start).toFixed(3)),populationAndProxyMilliseconds:Number((generated-prepared).toFixed(3)),accessibilityMilliseconds:Number((finished-generated).toFixed(3)),totalMilliseconds:Number((finished-start).toFixed(3)),heapUsedMiB:Number((memory.heapUsed/1048576).toFixed(2)),rssMiB:Number((memory.rss/1048576).toFixed(2))}:undefined;
    const summary={schemaVersion:result.schemaVersion,scenarioId:result.scenarioId,resultKind:result.resultKind,facilitySourceDate:result.provenance.facilitySource.catalogueUpdated,sourceRecordUpdate:catalogue.audit.recordUpdateValues,facilityCount:result.baselineFacilities.length,demographicYear:result.provenance.population.referenceYear,ageTarget:'60+ in Census 2020 age bands; no ageing-forward projection or confirmed AAC eligibility',geographicScope:'Two public landmark proxies in Bukit Merah; other subzones remain unlocated. Four corroborated AAC records, not a complete local/national inventory.',metrics:result.metrics[0],capacity:result.capacity,diagnostics:result.diagnostics,interpretation:'Straight-line geographic access only. No walking-network route, participation, care placement, health or loneliness outcome is calculated.'};
    if(json && timings)console.error(JSON.stringify({benchmark:timings}));
    console.log(JSON.stringify(json?result:{...summary,...(timings?{benchmark:timings}:{})},null,2));
  }
}catch(error){console.error((error as Error).message);process.exitCode=1;}
