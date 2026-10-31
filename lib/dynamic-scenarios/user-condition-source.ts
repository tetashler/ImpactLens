/** Complete source retention, not semantic condition extraction or verified facts. */
import {assertJsonData,freezeSnapshot} from '../experiments/validation.ts';
import {checkPlan,planGuard,planObject,planStrings,planText} from './diagnostics.ts';

export interface UserConditionProvenance {version:1;policy:'complete-question-v1';sourceId:'question-1'}

export function completeQuestionSource(question:string){
 planText(question,2000,'request.question');
 return freezeSnapshot({version:1 as const,policy:'complete-question-v1' as const,candidates:[{id:'question-1' as const,text:question}]});
}

/** No model-authored text, optional selection, or offsets can replace the source. */
export function resolveUserConditionIds(ids:unknown,question:string):{userConditions:[string];userConditionProvenance:UserConditionProvenance}{
 planText(question,2000,'request.question');
 checkPlan(Array.isArray(ids)&&ids.length===1,'plan.user_condition_reference_invalid','draft.userConditionIds',ids);
 planGuard('draft.userConditionIds',()=>assertJsonData(ids));
 checkPlan(ids[0]==='question-1','plan.user_condition_reference_invalid','draft.userConditionIds[0]',ids[0]);
 return freezeSnapshot({userConditions:[question],userConditionProvenance:{version:1,policy:'complete-question-v1',sourceId:'question-1'}});
}

/** Archive validation also checks equality, so a marker cannot authorise partial quotes. */
export function validateUserConditionSource(conditions:unknown,provenance:unknown,question:string):void{
 planText(question,2000,'request.question');
 planGuard('draft.userConditionProvenance',()=>assertJsonData(provenance));
 const p=planObject(provenance,['version','policy','sourceId'],'draft.userConditionProvenance');
 checkPlan(p.version===1,'plan.unsupported_version','draft.userConditionProvenance.version',p.version);
 checkPlan(p.policy==='complete-question-v1','plan.invalid_value','draft.userConditionProvenance.policy',p.policy);
 checkPlan(p.sourceId==='question-1','plan.user_condition_reference_invalid','draft.userConditionProvenance.sourceId',p.sourceId);
 planGuard('draft.userConditions',()=>assertJsonData(conditions));
 const quotes=planStrings(conditions,1,2000,'draft.userConditions');
 checkPlan(quotes.length===1,'plan.user_condition_reference_invalid','draft.userConditions',conditions);
 checkPlan(quotes[0]===question,'plan.user_condition_not_verbatim','draft.userConditions[0]',quotes[0]);
}
