import type {PublicExplore} from '../society/public-contract.ts';
import {isAutomaticReportRunFinished,type AutomaticReportKind,type AutomaticReportsState} from './automatic.ts';

/** Reader state covers the gap between simulation completion, writer startup and saved-output loading. */
export function reportPreparationState(run:PublicExplore,state:AutomaticReportsState|undefined,kind:AutomaticReportKind){
 const idle={preparing:false,message:'',error:''};
 if(!state||state.runId!==run.runId||!isAutomaticReportRunFinished(run))return idle;
 const status=state[kind];
 if(status==='failed'||status==='attempted'||status==='skipped'||state.stage==='cancelled')return {...idle,error:state.errors[kind]??(status==='attempted'?'Automatic preparation was already attempted. You can retry when ready.':'')};
 const name=kind==='summary'?'quick summary':'detailed report';
 if(status==='available')return {preparing:true,message:`Loading your ${name}...`,error:''};
 if(state.stage==='complete')return idle;
 const message=kind==='detailed'&&['idle','checking-summary','writing-summary'].includes(state.stage)?'Your detailed report will be prepared after the quick summary.':state.stage===`writing-${kind}`?`Writing your ${name}...`:`Preparing your ${name}...`;
 return {preparing:true,message,error:''};
}
