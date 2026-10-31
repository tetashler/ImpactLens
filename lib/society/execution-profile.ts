import type {SocietyInput,SocietyWorld} from './contract.ts';
import {SOCIETY_LIMITS} from './contract.ts';
import {ensure} from '../experiments/validation.ts';

export interface ExecutionBounds {
 events:number;items:number;groups:number;groupMembers:number;ancestry:number;memory:number;episodicEntries:number;seen:number;edges:number;activePerStep:number;renderAgents:number;
 journalBytes:number;rowBytes:number;checkpointBytes:number;savedBytes:number;contextItems:number;memoryReferences:number;contextBytes:number;
}
export interface ExecutionProfile {
 readonly id:string;readonly version:1;readonly steps:160|320|672;readonly agents:50|100;readonly modelAgents:35|70;readonly decisions:350|700;
 readonly decisionsPerTick:6|12;readonly maxPerAgent:16;readonly softAllowance:10;readonly cooldownTicks:4;readonly perThreadBurst:4;readonly proactiveLimit:2;readonly urgentBorrow:2|4;
 readonly availabilityPolicy:'seeded-rest-v1';readonly pacingPolicy:'grant-release-v1';readonly routinePolicy:'availability-routine-v1';readonly memoryPolicy:'episodic-topic-v2';
 readonly publicSchema:Readonly<{exploreVersion:3;societyVersion:2;jobVersion:1;clockVersion:1}>;
 readonly tickMinutes:15;readonly calendar:Readonly<{anchorDay:1;anchorMinute:480;timeZone:'Asia/Singapore'}>;readonly limits:Readonly<ExecutionBounds>;readonly replayIterations:number;
}
const calendar=Object.freeze({anchorDay:1 as const,anchorMinute:480 as const,timeZone:'Asia/Singapore' as const});
const publicSchema=Object.freeze({exploreVersion:3 as const,societyVersion:2 as const,jobVersion:1 as const,clockVersion:1 as const});
const limits=Object.freeze({events:SOCIETY_LIMITS.events,items:SOCIETY_LIMITS.items,memory:SOCIETY_LIMITS.memory,seen:SOCIETY_LIMITS.seen,edges:SOCIETY_LIMITS.edges,activePerStep:SOCIETY_LIMITS.activePerStep,renderAgents:SOCIETY_LIMITS.renderAgents,groups:8,groupMembers:8,ancestry:64,episodicEntries:32,journalBytes:128*1024*1024,rowBytes:4*1024*1024,checkpointBytes:32*1024*1024,savedBytes:32*1024*1024,contextItems:8,memoryReferences:6,contextBytes:24000});
/** Fixed allowlist, never a user-supplied collection of overridable resource limits. */
export const EXECUTION_PROFILES:Readonly<Record<string,Readonly<ExecutionProfile>>>=Object.freeze(Object.fromEntries(([50,100] as const).flatMap(agents=>([160,320,672] as const).map(steps=>{
 const id=`multi-day-${agents}-${steps}-v1`,decisions=agents===50?350:700;
 return [id,Object.freeze({id,version:1 as const,steps,agents,modelAgents:agents===50?35 as const:70 as const,decisions,decisionsPerTick:agents===50?6 as const:12 as const,maxPerAgent:16 as const,softAllowance:10 as const,cooldownTicks:4 as const,perThreadBurst:4 as const,proactiveLimit:2 as const,urgentBorrow:agents===50?2 as const:4 as const,availabilityPolicy:'seeded-rest-v1' as const,pacingPolicy:'grant-release-v1' as const,routinePolicy:'availability-routine-v1' as const,memoryPolicy:'episodic-topic-v2' as const,publicSchema,tickMinutes:15 as const,calendar,limits,replayIterations:steps+decisions+32})];
}))));
export function executionProfile(id:string):Readonly<ExecutionProfile>{ensure(Object.hasOwn(EXECUTION_PROFILES,id),'Unknown execution profile.');return EXECUTION_PROFILES[id];}
export function getExecutionProfile(value:SocietyInput|SocietyWorld):Readonly<ExecutionProfile>|null{
 const input='genesis' in value?value.genesis.input:value,selector=input.swarm?.multiDay;return selector?executionProfile(selector.profileId):null;
}
/** Shared creation, transition, replay, storage and projection bounds; legacy values stay scoped. */
export function executionLimits(value:SocietyInput|SocietyWorld){
 const input='genesis' in value?value.genesis.input:value,p=getExecutionProfile(value),deep=input.swarm?.deep;
 if(p)return {...p.limits,agents:p.agents,steps:p.steps,decisions:p.decisions,replayIterations:p.replayIterations};
 return {...SOCIETY_LIMITS,groups:8,groupMembers:8,ancestry:deep?64:12,episodicEntries:32,decisions:deep?.maxDecisions??(input.swarm?128:16),replayIterations:(deep?.maxDecisions??128)+(input.config?.steps??80)+32,journalBytes:deep?128*1024*1024:64*1024*1024,rowBytes:deep?4*1024*1024:2*1024*1024,checkpointBytes:deep?32*1024*1024:8*1024*1024,savedBytes:deep?32*1024*1024:8000000,contextItems:8,memoryReferences:6,contextBytes:24000};
}
