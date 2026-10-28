/** Explicit Phase 7E -> 7D conversion. Validation and conversion never execute turns. */
import {createScenarioExperimentInput,validateScenarioExperimentInput,type ScenarioExperimentInputV1} from '../experiments/handoff.ts';
import {validateExperiment,type ScenarioExperimentV1} from '../experiments/contract.ts';
import type {StakeholderFocus} from '../experiments/configuration.ts';
import {assertJsonData,canonical,ensure,object} from '../experiments/validation.ts';
import {convertExperimentSnapshot} from './compatibility.ts';
import {type EvidenceBundleSnapshotV1,type ScenarioAssumption,type SimulationOptionsV1,type StakeholderSimulationInputV1,type StakeholderSimulationRunV1} from './contract.ts';
import {freezeSnapshot,inputFingerprints,verifyStakeholderRun} from './identities.ts';

export interface StakeholderExecutionOptions {
  stakeholderRoleIds:string[];
  simulationOptions:SimulationOptionsV1;
}
export interface LinkedStakeholderRunV1 {
  version:1;
  source:ScenarioExperimentInputV1;
  run:StakeholderSimulationRunV1;
  experiment?:ScenarioExperimentV1;
}
export interface ConvertedScenarioExperimentInput {
  source:ScenarioExperimentInputV1;
  input:StakeholderSimulationInputV1;
}

const FOCUS_ROLES:readonly {focus:StakeholderFocus;roles:readonly string[]}[] = [
  {focus:'businesses-trade',roles:['small-business','supply-chain']},
  {focus:'workers-households',roles:['export-worker','household']},
  {focus:'government-diplomacy',roles:['policy-analyst','regional-cooperation']},
];

/** Stable catalogue selection; focus groups do not imply population representation. */
export function allowedStakeholderRoleIds(focus:readonly StakeholderFocus[]):string[] {
  assertJsonData(focus);
  ensure(Array.isArray(focus)&&focus.length>0&&focus.length<=3&&new Set(focus).size===focus.length
    &&focus.every(item=>FOCUS_ROLES.some(group=>group.focus===item)),'Choose a supported stakeholder focus.');
  return FOCUS_ROLES.filter(group=>focus.includes(group.focus)).flatMap(group=>[...group.roles]);
}
export const stakeholderRoleIdsForFocus=allowedStakeholderRoleIds;

function boundedText(value:string,maximum:number,label:string):string {
  ensure(value.trim().length>0&&value.length<=maximum,`${label} cannot be represented within the stakeholder ${maximum}-character limit.`);
  return value;
}
function boundedId(value:string,label:string):string {return boundedText(value,128,label);}

function projectEvidence(source:ScenarioExperimentInputV1):EvidenceBundleSnapshotV1|null {
  const evidence=source.evidence;
  if(!evidence)return null;
  const gaps=[...new Set([
    ...evidence.unknowns,...source.limitations,
    ...evidence.findings.flatMap(finding=>finding.limitations.map(limitation=>`Finding ${finding.id}: ${limitation}`)),
  ])];
  ensure(gaps.length<=20,'Evidence unknowns and limitations exceed the stakeholder limit of 20 gaps; no gaps were discarded.');
  gaps.forEach(gap=>boundedText(gap,2000,'Evidence gap'));
  const projected:EvidenceBundleSnapshotV1={
    version:1,id:evidence.bundleId,
    sources:evidence.sources.map(item=>({
      id:boundedId(item.id,'Source identity'),title:item.title,url:boundedText(item.url,2000,'Source URL'),
      // Phase 7E's date can be a page update date. Never relabel replay checking as publication.
      referenceDate:item.publishedAt===null
        ?`Publication/update date unknown; replay checked ${item.verifiedAt.slice(0,10)}`
        :`Publication/update date ${item.publishedAt}; replay checked ${item.verifiedAt.slice(0,10)}`,
    })),
    findings:evidence.findings.map(item=>({
      id:boundedId(item.id,'Finding identity'),sourceIds:[boundedId(item.sourceId,'Finding source identity')],
      statement:boundedText(`[${item.classification}] ${item.statement}`,1500,'Classified evidence finding'),
    })),gaps,
  };
  ensure(new TextEncoder().encode(JSON.stringify(projected)).byteLength<=100000,'Projected evidence exceeds the stakeholder 100,000-byte limit.');
  return projected;
}

export async function convertScenarioExperimentInput(value:unknown,options:StakeholderExecutionOptions):Promise<ConvertedScenarioExperimentInput> {
  const source=await validateScenarioExperimentInput(value);
  const configuration=source.configuration;
  ensure(configuration.kind==='asean','Only ASEAN experiment configurations are supported by this stakeholder bridge.');
  ensure(configuration.withdrawalTiming!=='custom','Custom withdrawal timing is unsupported by the current deterministic stakeholder rules.');
  ensure(configuration.tradeArrangements!=='hypothetical-continuity','Hypothetical continuity is unsupported by the current deterministic stakeholder rules.');
  assertJsonData(options);
  object(options,['stakeholderRoleIds','simulationOptions']);
  const allowed=allowedStakeholderRoleIds(source.stakeholderFocus);
  ensure(Array.isArray(options.stakeholderRoleIds)&&options.stakeholderRoleIds.length>=2&&options.stakeholderRoleIds.length<=6
    &&new Set(options.stakeholderRoleIds).size===options.stakeholderRoleIds.length
    &&options.stakeholderRoleIds.every(id=>allowed.includes(id)),'Choose 2–6 unique registered roles within the experiment stakeholder focus.');
  const assumption=(id:string,label:string,value:string):ScenarioAssumption=>({id,label,value,provenance:'user-authored'});
  const assumptions:ScenarioAssumption[]=[
    assumption('withdrawal','Hypothetical withdrawal process',configuration.withdrawalTiming),
    assumption('transition-months','Hypothetical transition months',configuration.transitionMonths===null?'unspecified':String(configuration.transitionMonths)),
    assumption('trade-arrangements','Hypothetical post-withdrawal trade arrangements',configuration.tradeArrangements==='hypothetical-replacement'?'replacement-agreements':'unresolved'),
    assumption('exploration-horizon','Exploratory horizon',`${source.horizonYears} years`),
    assumption('stakeholder-focus','Configured stakeholder focus',source.stakeholderFocus.join(', ')),
  ];
  if(configuration.notes!=='')assumptions.push(assumption('notes','User scenario notes',boundedText(configuration.notes,500,'Scenario notes')));
  const input=convertExperimentSnapshot({version:1,
    experimentId:boundedId(source.sourceExperimentId,'Source experiment identity'),
    scenarioIdentity:source.scenarioIdentity,configurationIdentity:source.configurationIdentity,
    configuration:{question:source.question,assumptions,horizonYears:source.horizonYears},
    evidence:projectEvidence(source),
  },options);
  // The public route's 96 KiB request cap is deliberately below the core parser cap.
  const requestBytes=new TextEncoder().encode(JSON.stringify({version:1,attemptId:'a'.repeat(64),input})).byteLength;
  ensure(requestBytes<=98_304,'Projected stakeholder request exceeds the public 96 KiB limit; no input was truncated.');
  return freezeSnapshot({source,input});
}

/** Bind a separately accepted run to its unchanged research snapshot. This never runs an agent. */
export async function linkStakeholderRun(sourceValue:unknown,runValue:unknown,experimentValue?:unknown):Promise<LinkedStakeholderRunV1> {
  assertJsonData(runValue);
  const run=await verifyStakeholderRun(runValue);
  const {source,input}=await convertScenarioExperimentInput(sourceValue,{
    stakeholderRoleIds:run.inputSnapshot.stakeholderRoles.map(role=>role.id),
    simulationOptions:run.inputSnapshot.simulationOptions,
  });
  const expected=await inputFingerprints(input);
  ensure(canonical(input)===canonical(run.inputSnapshot)&&expected.inputFingerprint===run.inputFingerprint
    &&expected.evidenceFingerprint===run.evidenceFingerprint,'Stakeholder run does not match the exact source experiment projection.');
  let experiment:ScenarioExperimentV1|undefined;
  if(experimentValue!==undefined){
    experiment=await validateExperiment(experimentValue);
    const recreated=await createScenarioExperimentInput(experiment);
    ensure(canonical(recreated)===canonical(source),'Actual experiment does not match the entire linked source snapshot.');
  }
  return freezeSnapshot({version:1,source,run,...(experiment?{experiment}:{})});
}

export async function verifyLinkedStakeholderRun(value:unknown):Promise<LinkedStakeholderRunV1> {
  assertJsonData(value);
  const record=object(value,['version','source','run','experiment'],['version','source','run']);
  ensure(record.version===1,'Unsupported linked stakeholder run version.');
  return linkStakeholderRun(record.source,record.run,record.experiment);
}

/** Guard validated imports before any history update. Hash exclusions do not make record metadata mutable. */
export function assertLinkedHistoryCompatible(
  existing:readonly LinkedStakeholderRunV1[],
  incoming:LinkedStakeholderRunV1,
  experiments:readonly ScenarioExperimentV1[] = [],
):void {
  for(const previous of existing){
    if(previous.run.runId===incoming.run.runId){
      ensure(canonical(previous)===canonical(incoming),'Conflicting immutable linked run identity. Existing history was retained.');
    }
    if(previous.experiment&&incoming.experiment&&previous.experiment.experimentId===incoming.experiment.experimentId){
      ensure(canonical(previous.experiment)===canonical(incoming.experiment),'Conflicting immutable saved experiment identity across linked runs. Existing history was retained.');
    }
  }
  if(incoming.experiment){
    for(const record of experiments){
      if(record.experimentId===incoming.experiment.experimentId){
        ensure(canonical(record)===canonical(incoming.experiment),'Conflicting immutable saved experiment identity in the experiment registry. Existing records were retained.');
      }
    }
  }
}
