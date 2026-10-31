/** Immutable opt-in bundle. Absence always means historical Phase 4B/4C semantics. */
import {ensure,object} from '../experiments/validation.ts';
export interface IntelligencePolicy {
 version:1;
 scheduling:'conversation-windows-v1';
 context:'conversation-menu-v2'|'conversation-menu-v3';
 behaviour?:'behaviour-quality-v1';
 memory:'episodic-v1'|'episodic-topic-v2';
 rules:'attention-v1';
 episodicEntries:number;
 readCooldown:number;
 responseCooldown:number;
 postCooldown:number;
}
export const BALANCED_POLICY:Readonly<IntelligencePolicy>=Object.freeze({version:1,scheduling:'conversation-windows-v1',context:'conversation-menu-v2',memory:'episodic-v1',rules:'attention-v1',episodicEntries:32,readCooldown:4,responseCooldown:8,postCooldown:12});
/** New sessions only. Never mutate the historical bundle or upgrade stored input. */
export const TOPIC_POLICY:Readonly<IntelligencePolicy>=Object.freeze({...BALANCED_POLICY,memory:'episodic-topic-v2'});
export const QUALITY_POLICY:Readonly<IntelligencePolicy>=Object.freeze({...TOPIC_POLICY,context:'conversation-menu-v3',behaviour:'behaviour-quality-v1'});
export const isBehaviourQuality=(policy:IntelligencePolicy|undefined)=>policy?.behaviour==='behaviour-quality-v1';
export const isMenuPolicy=(policy:string|undefined)=>policy==='action-menu-v1'||policy==='conversation-menu-v2'||policy==='conversation-menu-v3';
export function validateIntelligence(value:IntelligencePolicy){
 object(value,[...Object.keys(BALANCED_POLICY),'behaviour'],Object.keys(BALANCED_POLICY));
 for(const key of ['version','scheduling','rules'] as const)ensure(value[key]===BALANCED_POLICY[key],'Unknown intelligence policy.');
 ensure(value.behaviour===undefined?value.context===BALANCED_POLICY.context:value.behaviour==='behaviour-quality-v1'&&value.context==='conversation-menu-v3'&&value.memory==='episodic-topic-v2','Unknown behaviour context policy.');
 ensure(['episodic-v1','episodic-topic-v2'].includes(value.memory),'Unknown intelligence policy.');
 for(const key of ['episodicEntries','readCooldown','responseCooldown','postCooldown'] as const)ensure(Number.isSafeInteger(value[key])&&value[key]>=1&&value[key]<=(key==='episodicEntries'?32:48),'Invalid intelligence bound.');
}
