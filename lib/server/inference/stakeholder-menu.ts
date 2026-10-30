import {object} from '../../experiments/validation.ts';
import type {TurnContext,StakeholderTurnOutput} from '../../stakeholder-simulation/contract.ts';
type Choice={id:string;type:StakeholderTurnOutput['type'];position:StakeholderTurnOutput['position'];addressedRoleId:string|null;previousEventIds:string[]};
/** Dynamic v2 wire only. The model selects a real interaction; it never regenerates event IDs. */
export function stakeholderChoices(c:TurnContext):Choice[]{
 const other=[...c.previousEvents].reverse().filter(e=>e.roleId!==c.role.id).filter((e,i,all)=>all.findIndex(x=>x.roleId===e.roleId)===i).slice(0,3),own=[...c.previousEvents].reverse().find(e=>e.roleId===c.role.id);
 const planned=c.input.version===2?c.input.scenarioPlan.draft.agents.find(a=>a.id===c.role.id)?.initialPosition:undefined;
 const position=c.memory.position??planned??'conditional',result:Choice[]=[];
 for(const e of other.length?other:[null])for(const type of (e?['response','argument','evidence-question','challenge-assumption','acknowledgement']:['argument','evidence-question','challenge-assumption']) as Choice['type'][]){result.push({id:'turn-choice-'+(result.length+1),type,position,addressedRoleId:e?.roleId??null,previousEventIds:e?[e.id]:[]});}
 if(own&&other.length)for(const e of other)for(const p of ['concerned','conditional','information-seeking'] as const)if(p!==position)result.push({id:'turn-choice-'+(result.length+1),type:'revision',position:p,addressedRoleId:e.roleId,previousEventIds:[own.id,e.id]});
 return result;
}
export function stakeholderMenuSchema(c:TurnContext){
 const refs=(ids:string[],max=2)=>({type:'array',maxItems:Math.min(max,ids.length),uniqueItems:true,items:ids.length?{type:'string',enum:ids}:{type:'string'}});
 const properties={choiceId:{type:'string',enum:stakeholderChoices(c).map(o=>o.id)},statement:{type:'string',minLength:1,maxLength:600},reasoningSummary:{type:'string',minLength:1,maxLength:180},uncertainties:{type:'array',minItems:1,maxItems:2,uniqueItems:true,items:{type:'string',minLength:1,maxLength:160}},topics:{type:'array',minItems:1,maxItems:2,uniqueItems:true,items:{type:'string',minLength:1,maxLength:60}},evidenceFindingIds:refs(c.input.evidence?.findings.map(f=>f.id)??[]),assumptionIds:refs(c.input.assumptions.map(a=>a.id))};
 return {type:'object',additionalProperties:false,required:Object.keys(properties),properties};
}
export function decodeStakeholderChoice(value:unknown,c:TurnContext):StakeholderTurnOutput{
 const v=object(value,['choiceId','statement','reasoningSummary','uncertainties','topics','evidenceFindingIds','assumptionIds']);
 const option=stakeholderChoices(c).find(o=>o.id===v.choiceId);if(!option)throw new Error('Unknown or unavailable previous event');
 const {id,...bound}=option;return {...bound,statement:v.statement,reasoningSummary:v.reasoningSummary,uncertainties:v.uncertainties,topics:v.topics,evidenceFindingIds:v.evidenceFindingIds,assumptionIds:v.assumptionIds} as StakeholderTurnOutput;
}
