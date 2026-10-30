import type {GeographyIndex} from './geography.ts';
import type {PopulationView,Resident} from '../population/contract.ts';
import type {DynamicAgent} from '../dynamic-scenarios/plan.ts';
export type Platform='reddit'|'instagram';
export type SocialKind='post'|'read'|'comment'|'reply'|'like'|'upvote'|'downvote'|'follow'|'unfollow'|'share'|'opinion'|'activity'|'inactive'|'moderate';
export const SOCIETY_LIMITS=Object.freeze({agents:64,steps:144,events:8192,items:2048,memory:12,seen:64,edges:2048,activePerStep:16,renderAgents:64,savedBytes:8000000});
export interface SocietyConfig {agents:number;steps:number;activation:number;influence:number;activePerStep:number}
export interface SocietyInput {runId:string;question:string;seed:string;population:PopulationView;roles:DynamicAgent[];jurisdictions:{id:string;label:string}[];geography?:GeographyIndex;sharePolicy?:'source-position-v1';acceptedActions:{id:string;roleId:string;statement:string;position:string}[];config?:Partial<SocietyConfig>}
export interface Memory {eventId:string;itemId:string;platform:Platform;kind:'exposure'|'authored';exposedIds:string[]}
export interface SocialAgent {id:string;label:string;handle:string;resident:Resident|null;role:DynamicAgent|null;affiliation:string|null;goal:string;initialOpinion:number;opinion:number;resistance:number;actions:number;turns:number;memory:Memory[];seen:string[];notifications:string[];community:string;activity:'residential-context'|'community-context';behaviour:'observe'|'discuss'}
export interface SocialTie {source:string;target:string;kind:'neighbourhood-assumption'|'fictional-friendship'|'online-follow';assumed:true}
export interface SocialItem {id:string;actorId:string;platform:Platform;parentId:string|null;community:string;text:string;position:number;tick:number;media:'none'|'synthetic-card';votes:number;likes:number;hidden:boolean;sharedFrom:string|null}
export interface SocialEvent {id:string;actorId:string;type:SocialKind;platform:Platform|null;tick:number;minute:number;targetId:string|null;parentId:string|null;text:string|null;position:number|null;previousPosition:number|null;causes:string[];source:'deterministic-rule'|'accepted-model-action';sourceEventId:string|null;location:'residential-context'|'community-context'|null}
export interface SocietyGenesis {version:1|2|3;id:string;input:SocietyInput;config:SocietyConfig;bindings:Record<string,string>;assumptions:string[]}
export interface SocietyWorld {version:1;genesis:SocietyGenesis;tick:number;agents:SocialAgent[];ties:SocialTie[];items:SocialItem[];events:SocialEvent[];status:'ready'|'complete'|'event-limit'}
export interface Action {actorId:string;type:SocialKind;platform?:Platform;targetId?:string;parentId?:string;text?:string;position?:number;sourceEventId?:string;location?:SocialAgent['activity']}
export function randomFor(text:string){let n=2166136261;for(const c of text)n=Math.imul(n^c.charCodeAt(0),16777619);return (n>>>0)/4294967296;}
