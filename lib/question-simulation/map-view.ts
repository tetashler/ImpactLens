import type {QuestionSimulationContext,QuestionSimulationSnapshot} from './client.ts';
import {canonical} from '../experiments/validation.ts';

/** Presentation gate only. Execution identities and authoritative validation remain in the existing controller. */
export function mapResultFor(state:QuestionSimulationSnapshot,context:QuestionSimulationContext):'completed'|'partial'|null {
 if(state.question!==context.question||!state.run||!['completed','partial','failed'].includes(state.phase))return null;
 if(state.dynamic){
  const request=state.dynamic.plan.request;
  if(request.question!==context.question||request.geometryRevision!==context.geometryRevision||canonical(request.geometry)!==canonical(context.geometry)||state.dynamic.run.runId!==state.run.runId)return null;
 }else{
  const geometry=state.record?.geometryContext;
  if(!geometry||geometry.revision!==context.geometryRevision||geometry.canonicalContent!==canonical(context.geometry))return null;
 }
 return state.run.status==='completed'&&state.phase==='completed'?'completed':state.run.events.length?'partial':null;
}
