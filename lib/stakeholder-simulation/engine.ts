import {parseStakeholderInput,parseStakeholderTurnOutput,parseStakeholderRun,ENGINE_VERSION,SIMULATION_DISCLOSURE,checkpointYear,availableEvents,positionChange,updateMemory,id,type StakeholderSimulationInputV1,type StakeholderSimulationRunV1,type StakeholderEvent,type StakeholderMemory,type StakeholderTurnOutput,type TurnContext} from './contract.ts';
import {inputFingerprints,freezeSnapshot} from './identities.ts';
export {parseStakeholderTurnOutput} from './contract.ts';
export type {TurnContext,StakeholderTurnOutput} from './contract.ts';
export interface EngineOptions {attemptId:string;signal?:AbortSignal;generateTurn?:(context:TurnContext,signal?:AbortSignal)=>Promise<StakeholderTurnOutput>;provider?:string;model?:string}
const SAFE_TURN_ERRORS:Record<string,string>={AI_PROVIDER_IDENTITY:'The required serving model/provider identity could not be verified.',AI_TIMEOUT:'The participant model call timed out.',AI_CONFIG:'The selected participant model is not configured.',AI_UNSUPPORTED_MODEL:'The selected model does not support the required structured output.',AI_RATE_LIMIT:'The participant model provider rate limit was reached.',AI_INVALID_RESPONSE:'The participant model returned an invalid structured response.',AI_UPSTREAM:'The participant model provider could not complete the call.',STAKEHOLDER_CALL_BUDGET:'The bounded participant-call budget was exhausted.'};
function modelIdentifier(value:unknown):string|null {return typeof value==='string'&&!!value.trim()&&value.length<=200&&!/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value)?value:null;}
function choice(seed:string,role:string,turn:number):number {let h=2166136261;for(const c of `${seed}:${role}:${turn}`)h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0)%3;}
/** Scripted rules operate on current state, never on a prewritten whole transcript. */
export function deterministicTurn(context:TurnContext):StakeholderTurnOutput {
  const {input,role,memory,round,previousEvents,turnIndex}=context;
  const assumption=(key:string)=>input.assumptions.find(a=>a.id===key)?.value.toLowerCase()??'unspecified';
  const asean=/\basean\b/i.test(input.question),immediate=assumption('withdrawal')==='immediate',negotiated=assumption('withdrawal')==='negotiated',unresolved=assumption('trade-arrangements')==='unresolved',replacement=assumption('trade-arrangements')==='replacement-agreements';
  const other=[...previousEvents].reverse().find(e=>e.roleId!==role.id),own=[...previousEvents].reverse().find(e=>e.roleId===role.id);
  const priorities=['clarity before committing resources','a conditional plan with explicit review points','an evidence checklist before choosing a priority'];
  const priority=priorities[choice(input.simulationOptions.seed,role.id,turnIndex)];
  const roleConcern=role.interests[0].replace(/[.]$/,'').toLowerCase();
  const evidence=input.evidence?.findings[choice(input.simulationOptions.seed,role.id,turnIndex)%(input.evidence?.findings.length||1)];
  const base:StakeholderTurnOutput={type:'argument',addressedRoleId:null,statement:'',previousEventIds:[],evidenceFindingIds:evidence?[evidence.id]:[],assumptionIds:input.assumptions.map(a=>a.id),reasoningSummary:`This scripted turn applies the fictional role's stated interest in ${roleConcern}. It uses only the declared assumptions and available recorded context.`,uncertainties:[evidence?'Supplied evidence is context, not proof of this synthetic viewpoint or any future outcome.':'No evidence bundle is supplied; agreement-specific legal, economic and public-opinion outcomes remain unknown.',...role.uncertainties].slice(0,6),position:memory.position??(role.id.includes('analyst')||role.id==='regional-cooperation'?'information-seeking':immediate&&unresolved?'concerned':'conditional'),topics:[unresolved?'unresolved-arrangements':'replacement-arrangements',role.id]};
  const contextText=!asean?'scenario context':immediate?'immediate withdrawal':negotiated?'negotiated transition':'unspecified withdrawal setup';
  const arrangementText=!asean?'unverified scenario arrangements':unresolved?'unresolved post-withdrawal trade arrangements':replacement?'hypothetical replacement arrangements':'unspecified post-withdrawal arrangements';
  if(!asean||!unresolved&&!replacement)base.topics[0]='arrangements-unspecified';
  if(round===1){
    base.statement=`Under the user-assumed ${contextText} and ${arrangementText}, my fictional role would prioritise ${roleConcern}. I suggest ${priority}. This does not establish that any specific agreement changes or any particular real-world impact follows.`;
    if(role.id==='policy-analyst'||role.id==='regional-cooperation'){base.type='evidence-question';base.statement=`Before interpreting the assumed ${contextText}, I would ask which agreement texts and cooperation arrangements have actually been checked. With ${arrangementText}, my priority is ${roleConcern}. These legal and institutional questions are unresolved here.`;}
  }else if(other){
    base.addressedRoleId=other.roleId;base.previousEventIds=[other.id];
    if(round>=3&&own&&memory.position!=='conditional'){
      base.type='revision';base.position='conditional';base.previousEventIds=[own.id,other.id];
      base.statement=`After the recorded ${other.type} from the ${input.stakeholderRoles.find(r=>r.id===other.roleId)?.title}, I revise my earlier ${memory.position} position to a conditional one. My concern about ${roleConcern} remains, but I would make any next step contingent on evidence about ${arrangementText}. This is a synthetic revision, not measured persuasion.`;
    }else if(unresolved&&choice(input.simulationOptions.seed,role.id,turnIndex)!==0){
      base.type='challenge-assumption';
      base.statement=`Responding to the prior ${other.type}, I challenge treating unresolved arrangements as if their consequences were already known. My role prioritises ${roleConcern}, while another planning priority may differ. I would request ${priority} and agreement-specific evidence before drawing conclusions.`;
    }else{
      base.type='response';
      base.statement=`I acknowledge the preceding ${other.type}, but would place ${roleConcern} alongside that concern. Under ${arrangementText}, I would use ${priority}. Any possible arrangements require evidence; their existence and terms have not been independently established here.`;
    }
    base.reasoningSummary+=` The response addresses recorded event ${other.id}; ${own?'the participant also retains its earlier statement.':'there is no earlier own statement in the available memory.'}`;
  }
  if(evidence)base.reasoningSummary+=` Supplied finding ${evidence.id} is referenced as background only; it does not validate the hypothetical interpretation.`;
  return base;
}
/** Each turn is generated separately, validated, appended and committed to role memory. */
export async function runStakeholderSimulation(value:StakeholderSimulationInputV1,options:EngineOptions):Promise<StakeholderSimulationRunV1>{
  id(options.attemptId);if(options.attemptId.length>64)throw new Error('Attempt identifier is too long');
  const input=freezeSnapshot(parseStakeholderInput(value)),fingerprints=await inputFingerprints(input),runId=`run-${fingerprints.inputFingerprint.slice(0,24)}-${options.attemptId}`;
  const run:StakeholderSimulationRunV1={version:1,runId,attemptId:options.attemptId,inputSnapshot:input,...fingerprints,status:'completed',execution:{mode:input.simulationOptions.mode,engineVersion:ENGINE_VERSION,provider:input.simulationOptions.mode==='llm-assisted'?modelIdentifier(options.provider):null,model:input.simulationOptions.mode==='llm-assisted'?modelIdentifier(options.model):null},events:[],memories:input.stakeholderRoles.map(r=>({roleId:r.id,eventIds:[],position:null,citedFindingIds:[],concerns:[],uncertainties:[]})),error:null,limitations:[SIMULATION_DISCLOSURE,input.simulationOptions.mode==='deterministic-demo'?'Deterministic scripted turn rules; not independently AI-generated behaviour.':'Model-generated synthetic turns may vary across attempts even with identical inputs.',input.evidence?'Evidence references preserve supplied snapshots; no source retrieval or independent truth verification is performed.':'No evidence bundle is attached. Dialogue is ungrounded exploratory reasoning and research questions.','Hypothetical year checkpoints are narrative labels, not a validated future economic or behavioural model.','Positions and interaction counts describe this synthetic experiment only; roles have no population weights.']};
  if(input.simulationOptions.mode==='llm-assisted'&&!options.generateTurn){run.status='failed';run.error={code:'LLM_UNAVAILABLE',message:'LLM mode requires an authorised participant-turn generator. No scripted fallback was used.'};return parseStakeholderRun(run);}
  if(input.simulationOptions.mode==='llm-assisted'&&(!run.execution.provider||!run.execution.model)){run.status='failed';run.error={code:'AI_CONFIG',message:'LLM mode requires provider and model attribution before participant calls can begin.'};return parseStakeholderRun(run);}
  for(let turnIndex=0;turnIndex<input.stakeholderRoles.length*input.simulationOptions.rounds;turnIndex++){
    // Yield between turns so actual cancellation can interrupt deterministic execution.
    await new Promise(resolve=>setTimeout(resolve,0));
    if(options.signal?.aborted){run.status='cancelled';run.error={code:'CANCELLED',message:'The execution attempt was cancelled; accepted earlier turns remain inspectable.'};break;}
    const role=input.stakeholderRoles[turnIndex%input.stakeholderRoles.length],memory=run.memories.find(m=>m.roleId===role.id)!,round=Math.floor(turnIndex/input.stakeholderRoles.length)+1;
    const context:TurnContext=freezeSnapshot(structuredClone({input,role,turnIndex,round,checkpointYear:checkpointYear(round,input),previousEvents:availableEvents(run.events,memory,input.simulationOptions.memoryEvents),memory}));
    try{
      const proposed=input.simulationOptions.mode==='deterministic-demo'?deterministicTurn(context):await options.generateTurn!(context,options.signal);
      if(options.signal?.aborted){run.status='cancelled';run.error={code:'CANCELLED',message:'The execution attempt was cancelled; the late turn was not accepted.'};break;}
      const output=parseStakeholderTurnOutput(proposed,context);
      const sourceIds=[...new Set(output.evidenceFindingIds.flatMap(fid=>input.evidence?.findings.find(f=>f.id===fid)?.sourceIds??[]))].sort();
      const event:StakeholderEvent={...output,id:`event-${turnIndex}-${runId}`,runId,turnIndex,round,checkpointYear:context.checkpointYear,roleId:role.id,sourceIds,provenance:'synthetic-stakeholder-statement',grounding:sourceIds.length?'evidence-informed-interpretation':'no-evidence',positionChange:positionChange(memory.position,output.position)};
      run.events.push(event);run.memories=run.memories.map(m=>m.roleId===role.id?updateMemory(m,event,input.simulationOptions.memoryEvents):m);
    }catch(error){
      if(options.signal?.aborted){run.status='cancelled';run.error={code:'CANCELLED',message:'The execution attempt was cancelled; accepted earlier turns remain inspectable.'};break;}
      run.status=run.events.length?'partial':'failed';
      const code=error!==null&&typeof error==='object'&&'code'in error&&typeof error.code==='string'&&Object.hasOwn(SAFE_TURN_ERRORS,error.code)?error.code:'TURN_FAILED';
      run.error={code,message:SAFE_TURN_ERRORS[code]??'A participant turn could not be generated or accepted. No replacement statement was fabricated.'};break;
    }
  }
  return parseStakeholderRun(run);
}
