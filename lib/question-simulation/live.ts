/** Browser-safe, explicit live presets. Geographic scope never selects an engine by itself. */
import {classifyQuestionContext,parseQuestionContext,type QuestionContextV1} from './context.ts';
import {createLiveInput,type LiveDomain} from '../stakeholder-simulation/inference-input.ts';
import {parseStakeholderInput,type StakeholderSimulationInputV1} from '../stakeholder-simulation/contract.ts';
import {convertScenarioExperimentInput,linkStakeholderRun} from '../stakeholder-simulation/experiment-bridge.ts';
import {projectLinkedExperimentGraph} from '../stakeholder-simulation/experiment-graph.ts';
import {mergeStakeholderGraph} from '../stakeholder-simulation/graph-adapter.ts';
import {validateInferenceResponse,type InferenceResponseV2} from '../stakeholder-simulation/inference-contract.ts';
import {appendExperimentGraph} from '../experiments/graph.ts';
import {parseKnowledgeGraph,type KnowledgeGraph} from '../knowledge-graph/contract.ts';
import {validateExperiment,type ScenarioExperimentV1} from '../experiments/contract.ts';
import {createScenarioExperimentInput,type ScenarioExperimentInputV1} from '../experiments/handoff.ts';
import {assertJsonData,canonical,digest,ensure,freezeSnapshot,object,text} from '../experiments/validation.ts';

/** Conservative finite proposals only; mixed policies require clarification rather than guessing. */
export function selectQuestionLiveDomain(value:QuestionContextV1):LiveDomain|null{
 const context=parseQuestionContext(value),q=context.question;
 // Object lists and route endpoints may contain "and". A second policy action or
 // a separate intervention object needs clarification instead of a preset guess.
 const conjunctionTails=q.split(/\b(?:and|also|alongside|while|plus|then|afterwards|as well as)\b/i).slice(1);
 const mixedProposal=conjunctionTails.some(tail=>/\b(?:join\w*|ban\w*|build\w*|abolish\w*|rais\w*|lower\w*|introduc\w*|impos\w*|increas\w*|decreas\w*|reduc\w*|chang\w*|remov\w*|reform\w*|cut\w*|leav\w*|withdraw\w*|exit\w*)\b/i.test(tail)
  ||/^\s*(?:(?:a|an|the|new|higher|lower|more|fewer|another)\s+)*(?:housing|polyclinics?|AAC|parks?|schools?|GST|tax\w*|corporate|income|property|MRT|LRT|buses?|bus\s+service|ASEAN|EU|European Union|foreign\s+workers?|headquarters)\b/i.test(tail));
 if(context.primaryJurisdiction?.id!=='SG'||/\b(?:not|never|without|avoid\w*|instead of|rather than|won['’]?t|wouldn['’]?t|doesn['’]?t|don['’]?t|cannot)\b/i.test(q)
  ||mixedProposal
  ||/^\s*(?:what\s+(?:is|are|does)|define|explain|describe|history|when\s+did|did\s+)/i.test(q))return null;
 if(context.intent==='asean-withdrawal')return /\b(?:ban\w*|build\w*|abolish\w*|rais\w*|lower\w*|introduc\w*|impos\w*)\b/i.test(q)?null:'asean';
 if(context.intent==='mrt'&&context.scope==='local'&&!/\b(?:tax\w*|GST|duties|ASEAN|polyclinics?|AAC|parks?|housing|schools?)\b|active\s+ageing/i.test(q))return 'mrt';
 const hypothetical=/\b(?:what\s+if|if|suppose|imagine|hypothetical|scenario|would|should|could)\b/i.test(q);
 const importGoods=/\b(?:import(?:ed|ing|s)?\s+(?:goods|products)|import\s+(?:tax(?:es)?|dut(?:y|ies))|(?:tax(?:es)?|dut(?:y|ies))\s+on\s+imports?|tariffs?\s+on\s+imported\s+goods)\b/i.test(q);
 const taxChange=/\b(?:increas\w*|rais\w*|reduc\w*|lower\w*|introduc\w*|impos\w*|chang\w*|remov\w*|abolish\w*)\b/i.test(q);
 const foreignActor=context.relevantJurisdictions.some(j=>j.kind==='country'&&j.id!=='SG'&&new RegExp(`\\b${j.mention.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\s+(?:increas|rais|reduc|lower|introduc|impos|chang|remov|abolish)\\w*\\b`,'i').test(q));
 if(!foreignActor&&context.scope==='cross-border'&&hypothetical&&importGoods&&taxChange&&/\b(?:tax(?:es)?|GST|tariffs?|dut(?:y|ies)|excise)\b/i.test(q)
  &&!/\b(?:MRT|LRT|polyclinics?|AAC|ASEAN|headquarters|foreign\s+workers?|export\w*)\b/i.test(q))return 'import-tax';
 return null;
}

export async function prepareQuestionLiveInput(record:ScenarioExperimentV1,value:QuestionContextV1):Promise<{domain:LiveDomain;input:StakeholderSimulationInputV1;source:ScenarioExperimentInputV1}>{
 const experiment=await validateExperiment(record),context=parseQuestionContext(value);
 ensure(experiment.question===context.question,'Live question does not match its saved experiment.');
 const domain=selectQuestionLiveDomain(context);ensure(domain,'This question needs clarification or a supported live preset.');
 const source=await createScenarioExperimentInput(experiment);
 const preset=createLiveInput(domain,experiment.question,{scenarioIdentity:source.scenarioIdentity,experimentId:source.sourceExperimentId,configurationIdentity:source.configurationIdentity});
 if(domain==='asean'){
  const converted=await convertScenarioExperimentInput(source,{stakeholderRoleIds:preset.stakeholderRoles.map(role=>role.id),simulationOptions:preset.simulationOptions});
  return freezeSnapshot({domain,input:converted.input,source});
 }
 ensure(domain==='mrt'?source.configuration.kind==='mrt':source.configuration.kind==='generic','The saved configuration does not match this live preset.');
 // These adapters currently support honest generic research gaps, not arbitrary rich evidence conversions.
 ensure(!source.evidence||source.evidence.sources.length===0&&source.evidence.findings.length===0,'This live preset needs a separate evidence adapter for supplied findings.');
 const input=structuredClone(preset);input.horizonYears=source.horizonYears;
 input.assumptions.push({id:'source-input',label:'Saved research input',value:`Source ${source.sourceExperimentId}; execution input ${source.executionInputIdentity}. Research context only; no calculated outcomes are supplied.`,provenance:'user-authored'});
 input.assumptions.push({id:'source-geometry',label:'Schematic geometry reference',value:source.geometryContext?`${source.geometryContext.identity}; revision ${source.geometryContext.revision}. ${source.geometryContext.summary} No calculated journey metrics are supplied.`:'No geometry snapshot supplied. No route, location or calculated journey metrics are established.',provenance:'user-authored'});
 const retain=(id:string,label:string,value:string)=>{if(value!==''){text(value,500);input.assumptions.push({id,label,value,provenance:'user-authored'});}};
 retain('saved-notes','Saved scenario notes',source.configuration.notes);
 if(source.configuration.kind==='generic'){
  retain('saved-research-focus','Saved research focus',source.configuration.researchFocus);
  source.configuration.namedAssumptions.forEach((a,index)=>retain(`saved-assumption-${index}`,a.name,a.statement));
  source.configuration.hypotheses.forEach((hypothesis,index)=>retain(`saved-hypothesis-${index}`,'Unverified user hypothesis',hypothesis));
 }
 if(source.configuration.kind==='mrt')input.assumptions.push({id:'mrt-configuration',label:'Saved schematic MRT references',value:`Plan ${source.configuration.planId??'unconfirmed'}; route reference ${source.configuration.routeId===null?'unconfirmed':'retained in the saved experiment'}; ${source.configuration.stationPointIds.length} station point references. Timing and connectivity are not validated by this live preset.`,provenance:'user-authored'});
 if(source.evidence){
  const gaps=[...new Set([...source.evidence.unknowns,...source.limitations])];ensure(gaps.length<=20,'Live research gaps exceed the existing evidence budget.');
  input.evidence={version:1,id:source.evidence.bundleId,sources:[],findings:[],gaps};
 }
 input.configurationIdentity=await digest('config-',{version:1,kind:'question-live-preset',domain,sourceExecutionInputIdentity:source.executionInputIdentity,sourceConfigurationIdentity:source.configurationIdentity,roles:input.stakeholderRoles,assumptions:input.assumptions,horizonYears:input.horizonYears,options:input.simulationOptions});
 return freezeSnapshot({domain,input:parseStakeholderInput(input),source});
}

/** A new preset projection retains its actual source; it does not claim Phase 7E bridge equivalence. */
export interface QuestionLiveExecutionV1 {
 version:1;domain:LiveDomain;source:ScenarioExperimentInputV1;experiment:ScenarioExperimentV1;response:InferenceResponseV2;
}

export async function createQuestionLiveExecution(record:ScenarioExperimentV1,context:QuestionContextV1,value:unknown):Promise<QuestionLiveExecutionV1>{
 const experiment=await validateExperiment(record),prepared=await prepareQuestionLiveInput(experiment,context);
 assertJsonData(value);const envelope=object(value,['version','attemptId','run','inference']);
 const response=await validateInferenceResponse(value,{attemptId:text(envelope.attemptId,64),input:prepared.input});
 return freezeSnapshot({version:1,domain:prepared.domain,source:prepared.source,experiment,response});
}

export async function verifyQuestionLiveExecution(value:unknown):Promise<QuestionLiveExecutionV1>{
 assertJsonData(value);const supplied=object(value,['version','domain','source','experiment','response']);
 ensure(supplied.version===1,'Unsupported question live execution version.');
 const experiment=await validateExperiment(supplied.experiment);
 const verified=await createQuestionLiveExecution(experiment,classifyQuestionContext(experiment.question),supplied.response);
 ensure(canonical(supplied)===canonical(verified),'The live execution does not match its complete saved source projection.');
 return verified;
}

/** Standalone archive projection. No current MRT/AAC graph is accepted by this boundary. */
export async function projectQuestionLiveGraph(value:unknown):Promise<KnowledgeGraph>{
 const execution=await verifyQuestionLiveExecution(value),{experiment,source,response,domain}=execution;
 if(domain==='asean')return projectLinkedExperimentGraph(await linkStakeholderRun(source,response.run,experiment));
 const base=appendExperimentGraph(null,{scenarioIdentity:source.scenarioIdentity,question:experiment.question,configuration:experiment.configuration,evidence:experiment.evidence,experiment,geometryContext:experiment.geometryContext,archived:true,evidenceScenarioIdentity:source.scenarioIdentity,executionAvailable:true});
 const graph=await mergeStakeholderGraph(base,response.run);graph.executionIdentity=response.run.runId;
 const saved=graph.nodes.find(node=>node.properties.experimentId===experiment.experimentId&&node.properties.archived===true&&node.properties.recordType!=='run');
 const run=graph.nodes.find(node=>node.properties.recordType==='run');ensure(saved&&run,'The saved research input and accepted live run must remain inspectable.');
 run.properties.sourceExecutionInputIdentity=source.executionInputIdentity;
 run.properties.sourceConfigurationIdentity=source.configurationIdentity;
 run.properties.liveDomain=domain;run.properties.archived=true;
 graph.edges.push({id:`live-source:${response.run.runId}`,source:run.id,target:saved.id,relationship:'uses',description:'This separately validated live preset retains this immutable source research record. Its execution configuration has its own identity; saving alone did not execute the source.',provenance:{kind:'planning-only',reference:`Verified live preset projection ${response.run.inputFingerprint}`},directed:true});
 graph.limitations=[...new Set([...graph.limitations,'Archived saved research and separately recorded live synthetic turns only. Current MRT/AAC calculations are not included.'])];
 return parseKnowledgeGraph(graph);
}
