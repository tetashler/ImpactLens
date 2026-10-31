/** Trusted server bridge. Neither personality admission nor citizen facts are browser-supplied. */
import {ensure} from '../../experiments/validation.ts';
import type {SocietyWorld} from '../../society/contract.ts';
import {controlledIds} from '../../society/hybrid.ts';
import {createCitizenGrounding} from '../../citizen-grounding/social.ts';
import type {PersonalityInitialization,PersonalityRoster} from '../../citizen-grounding/personality.ts';
import {getPrivateCitizenImpact} from './api.ts';
export function citizenInitializer(impactRunId:string,initialize:(request:PersonalityInitialization)=>Promise<PersonalityRoster>){
 const impact=getPrivateCitizenImpact(impactRunId);ensure(impact,'CITIZEN_IMPACT_NOT_AVAILABLE');
 return async(preview:SocietyWorld)=>{
  const activeIds=preview.agents.map(a=>a.id),capableIds=controlledIds(preview);
  const roster=await initialize({runId:preview.genesis.input.runId,capableIds,backgroundIds:activeIds.filter(id=>!capableIds.includes(id)),seed:preview.genesis.input.seed});
  return createCitizenGrounding(impact.dataset,impact.run,roster,activeIds,capableIds);
 };
}
