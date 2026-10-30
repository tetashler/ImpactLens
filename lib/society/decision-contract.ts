import type {InferenceCallRecord} from '../server/inference/deepseek.ts';
import type {Platform,SocialKind} from './contract.ts';
import type {SocietyBriefing} from './contract.ts';
export interface HybridConfig {selectedAgents:number;maxCalls:number;reservedTokens:number;costUsd:number}
export const HYBRID_DEFAULTS:HybridConfig=Object.freeze({selectedAgents:4,maxCalls:8,reservedTokens:200000,costUsd:0.2});
export const DECISION_LIMITS=Object.freeze({contextBytes:24000,outputTokens:600,unknownCostUsd:0.02,items:8,memories:6,timeoutMs:30000});
export interface DecisionContext {version:1;id:string;runId:string;tick:number;actor:{id:string;label:string;goal:string;position:number;resistance:number;priorities:string[];demographic:unknown};platform:Platform;question:string;connections:{id:string;handle:string}[];items:{id:string;actorId:string;platform:Platform;parentId:string|null;text:string;media:string}[];memories:{eventId:string;itemIds:string[];platform:Platform;kind:string;text:string}[];actions:string[];assumptions:string[];sharedBriefing?:SocietyBriefing;blockedTargets?:{action:string;targetId:string}[];recentDecisions?:{tick:number;platform:Platform;action:string;targetId:string|null;motivation:string}[]}
export interface SocialDecision {action:SocialKind;platform:Platform;targetId:string|null;text:string|null;memoryIds:string[];stance:{target:number;exposureId:string}|null;motivation:string}
export interface SocialDecisionRecord {version:1;id:string;context:DecisionContext;status:'accepted'|'failed'|'reserved';decision:SocialDecision|null;usage:InferenceCallRecord|null;error:string|null;reservedTokens:number;reservedCostUsd:number}
export interface HybridState {records:SocialDecisionRecord[];pending:DecisionContext|null}
