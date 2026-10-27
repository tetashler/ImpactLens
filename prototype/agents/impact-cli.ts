import { performance } from 'node:perf_hooks';
import { runImpactFromLocalData } from '../../lib/server/population-impact-service.ts';
import { illustrativeLine } from '../mrt/examples/illustrative-line.ts';
import { illustrativeDemand } from './impact/example.ts';

try {
  let size=2000,renderLimit=150,threshold=30,seed='phase4c-demo',json=false,benchmark=false;
  const args=process.argv.slice(2);
  for (let i=0;i<args.length;i++) {
    const flag=args[i];
    if (flag==='--json') {json=true;continue;}
    if (flag==='--benchmark') {benchmark=true;continue;}
    if (!['--size','--seed','--threshold','--render-limit'].includes(flag)) throw new Error(`Unknown option ${flag}`);
    const value=args[++i];if (!value || value.startsWith('--')) throw new Error(`Missing value for ${flag}`);
    if (flag==='--size') size=Number(value);
    if (flag==='--seed') seed=value;
    if (flag==='--threshold') threshold=Number(value);
    if (flag==='--render-limit') renderLimit=Number(value);
  }
  // Fail cheap invalid options before loading the feed.
  if (!Number.isFinite(threshold) || threshold<0) throw new Error('Invalid threshold');
  const start=performance.now();
  const result=runImpactFromLocalData({size,seed,planningAreas:['Choa Chu Kang']},illustrativeLine,{assumptions:{...illustrativeDemand,seed},thresholdMinutes:threshold,renderLimit});
  const elapsed=performance.now()-start, memory=process.memoryUsage(),m=result.metrics[0];
  const timing=benchmark?{elapsedMilliseconds:Number(elapsed.toFixed(2)),heapUsedMiB:Number((memory.heapUsed/1048576).toFixed(2)),rssMiB:Number((memory.rss/1048576).toFixed(2)),maxRssKiB:process.resourceUsage().maxRSS}:undefined;
  const output=json?{payload:result.payload,metrics:result.metrics,distributionalDifferences:result.distributionalDifferences,diagnostics:result.diagnostics,...(timing?{benchmark:timing}:{})}:{
    resultKind:result.payload.metadata.resultKind,demographicYear:2020,simulationDate:result.payload.metadata.simulationDate,
    assumedDemand:illustrativeDemand.description,agentCount:size,renderedCitizenReferences:result.payload.citizens.length,
    coverage:m.coverage,weightedBenefitingPopulation:m.weightedBenefitingPopulation,benefiting:m.benefiting,unchanged:m.unchanged,
    weightedMeanMinutesSaved:m.weightedMeanMinutesSaved,weightedTotalMinutesSaved:m.weightedTotalMinutesSaved,weightedMeanTransferChange:m.weightedMeanTransferChange,
    accessibility:m.accessibility,diagnostics:result.diagnostics,
    censusSourceDiscrepancy:{roundedLeafTotal:4047260,publishedTotal:4044210,difference:3050},
    limitations:'One hypothetical trip per assigned representative. Station-to-station model only; unassigned is unknown. No actual commuting, walking access, crowding, induced demand or economic forecast.',
    ...(timing?{benchmark:timing}:{}),
  };
  console.log(JSON.stringify(output,null,2));
} catch(error) {console.error((error as Error).message);process.exitCode=1;}
