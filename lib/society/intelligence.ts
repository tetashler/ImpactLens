/** Immutable opt-in bundle. Absence always means historical Phase 4B/4C semantics. */
import {ensure,object} from '../experiments/validation.ts';
export interface IntelligencePolicy {
 version:1;
 scheduling:'conversation-windows-v1';
 context:'conversation-menu-v2';
 memory:'episodic-v1';
 rules:'attention-v1';
 episodicEntries:number;
 readCooldown:number;
 responseCooldown:number;
 postCooldown:number;
}
export const BALANCED_POLICY:Readonly<IntelligencePolicy>=Object.freeze({version:1,scheduling:'conversation-windows-v1',context:'conversation-menu-v2',memory:'episodic-v1',rules:'attention-v1',episodicEntries:32,readCooldown:4,responseCooldown:8,postCooldown:12});
export const isMenuPolicy=(policy:string|undefined)=>policy==='action-menu-v1'||policy==='conversation-menu-v2';
export function validateIntelligence(value:IntelligencePolicy){
 object(value,Object.keys(BALANCED_POLICY));
 for(const key of ['version','scheduling','context','memory','rules'] as const)ensure(value[key]===BALANCED_POLICY[key],'Unknown intelligence policy.');
 for(const key of ['episodicEntries','readCooldown','responseCooldown','postCooldown'] as const)ensure(Number.isSafeInteger(value[key])&&value[key]>=1&&value[key]<=(key==='episodicEntries'?32:48),'Invalid intelligence bound.');
}
