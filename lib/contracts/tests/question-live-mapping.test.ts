import test from 'node:test';
import assert from 'node:assert/strict';
import {classifyQuestionContext} from '../../question-simulation/context.ts';
import {createExperiment} from '../../experiments/contract.ts';
import {createDefaultConfiguration,parseConfiguration} from '../../experiments/configuration.ts';
import {createGeometryContext} from '../../experiments/identity.ts';
import {createScenarioExperimentInput} from '../../experiments/handoff.ts';
import {convertScenarioExperimentInput} from '../../stakeholder-simulation/experiment-bridge.ts';
import {createReplayEvidence} from '../../evidence/replay.ts';

async function api(){const value=await import('../../question-simulation/live.ts').catch(()=>null);assert.ok(value,'The browser-safe live question handoff must exist');return value;}
async function record(question:string,kind:'asean'|'mrt'|'generic'='generic'){
 const geometryContext=await createGeometryContext({version:1,scenarioId:'live-mapping',features:[]},3);
 const configuration=kind==='generic'?parseConfiguration({kind:'generic',horizonYears:10,notes:'',researchFocus:'',hypotheses:[],namedAssumptions:[]}):createDefaultConfiguration(question,kind==='mrt'?'mrt-line':undefined);
 return createExperiment({question,configuration,geometryContext,evidence:null});
}
test('live preset mapping separates geographic scope from supported intervention and rejects mixed or negated proposals',async()=>{
 const {selectQuestionLiveDomain}=await api();
 const cases:[string,string|null][]=[
  ['What if Singapore leaves ASEAN?','asean'],['What if we left ASEAN?','asean'],
  ['What happens if Singapore increases tax on imported goods?','import-tax'],
  ['What if Singapore reduces import duties?','import-tax'],
  ['How beneficial would a new MRT line be for Singapore residents?','mrt'],
  ['How beneficial would an MRT line between Choa Chu Kang and Sengkang be?','mrt'],
  ['What if Singapore builds an MRT line for commuters and residents?','mrt'],
  ['What if Singapore increases tax on imported goods and products?','import-tax'],
  ['What if a new polyclinic opened in Sengkang?',null],['What if a community facility opens in Tampines?',null],
  ['What if a new AAC opened in Singapore?',null],['What if Singapore increases GST?',null],
  ['What is Singapore import tax?',null],['What if Singapore does not raise tax on imported goods?',null],
  ['What if Malaysia raises import taxes?',null],['What if Malaysia builds an MRT line?',null],
  ['What does ASEAN do?',null],['What if Singapore stays in ASEAN?',null],
  ['What if Singapore leaves ASEAN and bans cars?',null],
  ['What if Singapore leaves ASEAN then bans cars?',null],
  ['What if Singapore leaves ASEAN to ban cars?',null],
  ['What if China increases tax on imported goods from Singapore?',null],
  ['What is an MRT line in Singapore?',null],
  ['What if Singapore increases import taxes and builds an MRT line?',null],
  ['What if Singapore builds an MRT line and a polyclinic?',null],
  ['What if Singapore leaves ASEAN and joins the EU?',null],
  ['What if Singapore raises import tax and housing grants?',null],
  ['What if Singapore builds an MRT line and a bus service?',null],
 ];
 for(const [question,want]of cases)assert.equal(selectQuestionLiveDomain(classifyQuestionContext(question)),want,question);
});
test('ASEAN live preparation retains actual source assumptions, evidence and horizon through the exact existing bridge',async()=>{
 const {prepareQuestionLiveInput}=await api(),question='What if Singapore leaves ASEAN?';
 const base=await record(question,'asean'),source=await createScenarioExperimentInput(base);
 const evidence=await createReplayEvidence({scenarioIdentity:base.scenarioIdentity,researchAttemptId:'live-evidence',question,topic:'asean'});
 const experiment=await createExperiment({question,configuration:{...base.configuration,horizonYears:10},geometryContext:base.geometryContext,evidence});
 const prepared=await prepareQuestionLiveInput(experiment,classifyQuestionContext(question));
 assert.equal(prepared.domain,'asean');assert.equal(prepared.input.horizonYears,10);
 assert.equal(prepared.input.configurationIdentity,experiment.configurationIdentity);
 assert.equal(prepared.input.stakeholderRoles.length,4);assert.equal(prepared.input.simulationOptions.mode,'llm-assisted');
 assert.equal(prepared.input.evidence?.sources.length,2);assert.equal(prepared.source.sourceExperimentId,experiment.experimentId);
 const converted=await convertScenarioExperimentInput(prepared.source,{stakeholderRoleIds:prepared.input.stakeholderRoles.map(r=>r.id),simulationOptions:prepared.input.simulationOptions});
 assert.deepEqual(prepared.input,converted.input);assert.equal(source.execution.status,'not-executed');
});
test('import-tax and MRT live preparation retain source geometry without claiming native results or old configuration identity',async()=>{
 const {prepareQuestionLiveInput}=await api();
 for(const [question,kind]of [['What if Singapore raises tax on imported goods?','generic'],['How beneficial would a new MRT line in Singapore be?','mrt']]as const){
  const experiment=await record(question,kind),prepared=await prepareQuestionLiveInput(experiment,classifyQuestionContext(question));
  assert.equal(prepared.input.scenarioIdentity,experiment.scenarioIdentity);assert.equal(prepared.input.experimentId,experiment.experimentId);
  assert.notEqual(prepared.input.configurationIdentity,experiment.configurationIdentity);assert.equal(prepared.input.horizonYears,experiment.configuration.horizonYears);
  assert.equal(prepared.input.evidence,null);assert.ok(prepared.input.assumptions.some(a=>a.value.includes(experiment.geometryContext!.identity)));
  assert.ok(prepared.input.assumptions.every(a=>a.value.length<=500));assert.ok(prepared.input.assumptions.some(a=>/not.*(?:calculated|validated)|no.*(?:calculated|validated)/i.test(a.value)));
  assert.ok(Object.isFrozen(prepared));
 }
});
test('live preparation refuses unsupported questions, altered context and question/source mismatch',async()=>{
 const {prepareQuestionLiveInput}=await api(),experiment=await record('What if Singapore raises tax on imported goods?');
 await assert.rejects(prepareQuestionLiveInput(experiment,classifyQuestionContext('What if a polyclinic opened in Singapore?')));
 const context=structuredClone(classifyQuestionContext(experiment.question));context.scope='local';
 await assert.rejects(prepareQuestionLiveInput(experiment,context));
});
test('non-ASEAN preparation retains bounded actual notes and user assumptions without truncating larger inputs',async()=>{
 const {prepareQuestionLiveInput}=await api(),question='What if Singapore raises tax on imported goods?';
 const experiment=await createExperiment({question,evidence:null,configuration:parseConfiguration({kind:'generic',horizonYears:5,notes:'Proposed product coverage remains food only.',researchFocus:'Understand product coverage.',hypotheses:['Supplier contracts require review.'],namedAssumptions:[{id:'coverage',name:'Coverage',statement:'Food imports only.'}]})});
 const prepared=await prepareQuestionLiveInput(experiment,classifyQuestionContext(question));
 for(const fragment of ['food only','Understand product coverage','Supplier contracts','Food imports only'])assert.ok(prepared.input.assumptions.some(a=>a.value.includes(fragment)),fragment);
 const larger=await createExperiment({question,evidence:null,configuration:{...experiment.configuration,notes:'x'.repeat(501)}});
 await assert.rejects(prepareQuestionLiveInput(larger,classifyQuestionContext(question)));
});
