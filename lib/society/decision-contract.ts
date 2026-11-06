import type {IssueUpdate,SocialIssue} from './episodic.ts';
import type {InferenceCallRecord} from '../inference/call-record.ts';
import type {Platform,SocialKind} from './contract.ts';
import type {SocietyBriefing} from './contract.ts';
export interface DecisionContext {researchContext?:import('../grounding/briefing.ts').ActorResearchContext}
export interface HybridConfig {selectedAgents:number;maxCalls:number;reservedTokens:number;costUsd:number}
export const HYBRID_DEFAULTS:HybridConfig=Object.freeze({selectedAgents:4,maxCalls:8,reservedTokens:200000,costUsd:0.2});
export const DECISION_LIMITS=Object.freeze({contextBytes:24000,outputTokens:600,unknownCostUsd:0.02,items:8,memories:6,timeoutMs:30000});
export interface DecisionContext {conversation?:import('./deep-context.ts').ConversationWindowMetadata;opportunity?:import('./swarm-scheduler.ts').SwarmTrigger;version:1;policy?:'action-targets-v1'|'action-targets-v2'|'action-menu-v1'|'conversation-menu-v2'|'conversation-menu-v3'|'conversation-menu-v4'|'conversation-menu-v5'|'conversation-menu-v6'|'conversation-menu-v7';id:string;runId:string;tick:number;menu?:import('./decision-menu.ts').DecisionOption[];readableIds?:string[];issues?:SocialIssue[];stateHistory?:{eventId:string;tick:number;from:number;to:number}[];actor:{id:string;label:string;goal:string;position:number;resistance:number;priorities:string[];demographic:unknown};platform:Platform;question:string;connections:{id:string;handle:string}[];items:{id:string;actorId:string;platform:Platform;parentId:string|null;text:string;media:string;groupId?:string|null;tick?:number;counterpartyRole?:string;modelAuthored?:boolean;directToActor?:boolean;conversationWithActor?:boolean}[];diagnostics?:{eligiblePeerReplies:number;includedPeerReplies:number;omittedPeerReplies:number;contextOmittedItems:number;omissionReasons:{menuCapacity:number;contextCapacity:number}};memories:{eventId:string;primaryItemId?:string;itemIds:string[];platform:Platform;kind:string;text:string;origin?:'episodic'|'short-term';tick?:number;importance?:number}[];actions:string[];assumptions:string[];sharedBriefing?:SocietyBriefing;communication?:{canCreateGroup?:boolean;channels:{id:Platform;style:string}[];groups:{id:string;name:string;platform:Platform;member:boolean;canJoin:boolean;canInvite:boolean;canShare:boolean;purposeId?:string}[];purposes:string[];topics:{id:string;label:string}[]};blockedTargets?:{action:string;targetId:string}[];recentDecisions?:{tick:number;platform:Platform;action:string;targetId:string|null;motivation:string}[]}
export interface SocialDecision {issueUpdate?:IssueUpdate|null;action:SocialKind;platform:Platform;targetId:string|null;text:string|null;memoryIds:string[];stance:{target:number;exposureId:string}|null;motivation:string;selection?:{choiceId:string;stanceId:string;recallIds:string[];issueChoiceId?:string|null;issueEvidence?:import('../citizen-grounding/issues.ts').GroundedIssueEvidence|null;factIds?:string[];authoredText?:string|null;issueEvidenceId?:string|null;issueDeclaration?:import('./episodic.ts').IssueDeclaration|null};groupId?:string|null;memberIds?:string[];purposeId?:string|null;discussion?:{topicIds:string[];argument:'concern'|'condition'|'support'|'question'|'disagreement'|'unspecified'}}
export interface SocialDecisionRecord {version:1;id:string;context:DecisionContext;status:'accepted'|'failed'|'reserved'|'skipped';decision:SocialDecision|null;usage:InferenceCallRecord|null;error:string|null;reservedTokens:number;reservedCostUsd:number}
/** Partial usage cannot reduce a new-policy charge below either its reservation or its known token count. */
export function decisionTokenCharge(record:Pick<SocialDecisionRecord,'usage'|'reservedTokens'>,conservativePartial=false){
 const input=record.usage?.inputTokens,output=record.usage?.outputTokens;
 return input!=null&&output!=null?input+output:conservativePartial?Math.max(record.reservedTokens,(input??0)+(output??0)):record.reservedTokens;
}
export interface HybridState {records:SocialDecisionRecord[];pending:DecisionContext|null;tokenBudgetExhausted?:true}
/** Private model context only; never projected into public agent records. */
export interface DecisionContext {
 issueCreationAllowed?:boolean;
 calendar?:{version:1;policy:'multi-day-swarm-v1';profileId:string;pacingTarget:number;day:number;hour:number;minute:number;timeZone:'Asia/Singapore';label:string;elapsedMinutes:number;availability:{available:boolean;restStartMinute:number;restMinutes:number;localMinute:number};assumption:string};
}

/** Explicit new-policy private facts; never included in historical contexts. */
export interface DecisionContext {grounding?:import('../citizen-grounding/social.ts').GroundedActorContext;issueSubjectStates?:{subjectId:string;issueId:string;status:'open'|'resolved'|'withdrawn'}[]}

/** v6-only identifiers derived from the frozen validated scenario, never question text. */
export interface DecisionContext {proseReferences?:{source:'validated-hybrid-binding';stationCodes:string[]}}
