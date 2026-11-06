import type { MetricId, Dimension } from '../dashboard/metrics.ts';
export type { MetricId, Dimension } from '../dashboard/metrics.ts';
export const METRIC_IDS = ['represented','assigned','comparable','unassigned','benefiting','benefitShare','meanSaved','accessChange','transferChange','newlyReachable'] as const;
export const DIMENSIONS = ['ageGroup','sex','planningArea','subzone'] as const;
export const TITLES = ['Who benefits under these assumptions?','Coverage before conclusions','Compare modelled accessibility'] as const;
export const NOTE_IDS = ['assumed-demand','unknown-outcomes','historical-source','no-causality','schematic-geometry'] as const;
export type NoteId = typeof NOTE_IDS[number];
export const NOTES:Record<NoteId,string> = {
  'assumed-demand':'Trips are assumed sensitivity inputs. Equal probabilities across source categories do not establish actual commuting behaviour.',
  'unknown-outcomes':'Unassigned residents have unknown outcomes. Benefits and mean savings describe comparable journeys, not everyone represented.',
  'historical-source':'Demographic categories come from Census 2020; expansion weights represent historical rounded counts, not today’s population.',
  'no-causality':'Calculated accessibility under assumptions is not evidence of causal economic, health or social outcomes.',
  'schematic-geometry':'Station links are schematic. No justified individual trajectories, walking/egress time or observed passenger movement are provided.'
};
export interface DashboardLayout {version:1;title:typeof TITLES[number];kpis:MetricId[];chart:{dimension:Dimension;type:'benefit-bars'|'coverage-bars';sort:'benefit-desc'|'benefit-asc'|'coverage-asc'|'name'};notes:NoteId[]}
export interface ExplanationSelection {version:1;focus:'results'|'coverage'|'limitations';facts:{groupId:string;metricId:MetricId}[];notes:NoteId[]}
export const CHAT_TOPICS=['journey','demographics','weight','source','assumptions','transfers','limits','unsupported'] as const;
export type ChatTopic=typeof CHAT_TOPICS[number];
export interface ChatSelection {version:1;topics:ChatTopic[]}
export interface AiIdentity {requestId:string;runId:string}
export interface ChatMessage {role:'user'|'assistant';content:string}
export function boundChatMessages(history:ChatMessage[],question:string):ChatMessage[]{
  const messages:ChatMessage[]=[...history.slice(-6),{role:'user',content:question}];
  while(messages.length>1&&messages.reduce((n,m)=>n+m.content.length,0)>6000)messages.splice(0,2);
  return messages;
}
export interface AiRequest extends AiIdentity {agentId?:string;messages?:ChatMessage[]}
export type AiKind='dashboard'|'explain'|'citizen-chat';
export interface AiResponse {version:1;kind:AiKind;identity:AiIdentity;agentId:string|null;provider:'gemini'|'openrouter'|'anthropic';model:string;usage:{inputTokens:number|null;outputTokens:number|null;totalTokens:number|null};output:DashboardLayout|ExplanationSelection|ChatSelection}

export function fallbackLayout():DashboardLayout {return {version:1,title:TITLES[0],kpis:['benefitShare','meanSaved','benefiting','unassigned'],chart:{dimension:'ageGroup',type:'benefit-bars',sort:'name'},notes:['assumed-demand','unknown-outcomes','no-causality']};}
function fail():never {throw new Error('AI response does not match the approved presentation schema.');}
function obj(v:unknown,keys:string[]):Record<string,unknown>{if(!v||typeof v!=='object'||Array.isArray(v))return fail();const o=v as Record<string,unknown>;if(Object.keys(o).length!==keys.length||keys.some(k=>!Object.hasOwn(o,k)))return fail();return o;}
function one<T extends string>(v:unknown,values:readonly T[]):T{if(typeof v!=='string'||!values.includes(v as T))return fail();return v as T;}
function list<T>(v:unknown,min:number,max:number,parse:(v:unknown)=>T):T[]{if(!Array.isArray(v)||v.length<min||v.length>max)return fail();const a=v.map(parse);if(new Set(a.map(x=>JSON.stringify(x))).size!==a.length)return fail();return a;}
function version(o:Record<string,unknown>){if(o.version!==1)fail();}
export function parseDashboardLayout(v:unknown):DashboardLayout{
  const o=obj(v,['version','title','kpis','chart','notes']);version(o);const c=obj(o.chart,['dimension','type','sort']);
  return {version:1,title:one(o.title,TITLES),kpis:list(o.kpis,3,6,x=>one(x,METRIC_IDS)),chart:{dimension:one(c.dimension,DIMENSIONS),type:one(c.type,['benefit-bars','coverage-bars']),sort:one(c.sort,['benefit-desc','benefit-asc','coverage-asc','name'])},notes:list(o.notes,1,5,x=>one(x,NOTE_IDS))};
}
export function parseExplanation(v:unknown,groupIds:readonly string[]):ExplanationSelection{
  const o=obj(v,['version','focus','facts','notes']);version(o);
  return {version:1,focus:one(o.focus,['results','coverage','limitations']),facts:list(o.facts,1,4,v=>{const f=obj(v,['groupId','metricId']);return {groupId:one(f.groupId,groupIds),metricId:one(f.metricId,METRIC_IDS)};}),notes:list(o.notes,1,5,x=>one(x,NOTE_IDS))};
}
export function parseChatSelection(v:unknown):ChatSelection{const o=obj(v,['version','topics']);version(o);return {version:1,topics:list(o.topics,1,3,x=>one(x,CHAT_TOPICS))};}
export function parseAiRequest(v:unknown,kind:AiKind):AiRequest{
  const o=obj(v,kind==='citizen-chat'?['runId','requestId','agentId','messages']:['runId','requestId']);
  if(typeof o.runId!=='string'||!/^impact-[a-f0-9]{24}$/.test(o.runId)||typeof o.requestId!=='string'||!/^[a-f0-9]{64}$/.test(o.requestId))fail();
  const identity={runId:o.runId as string,requestId:o.requestId as string};if(kind!=='citizen-chat')return identity;
  if(typeof o.agentId!=='string'||!/^syn-[a-f0-9]{16}-[1-9]\d*$/.test(o.agentId)||o.agentId.length>80)fail();
  if(!Array.isArray(o.messages)||o.messages.length<1||o.messages.length>7||o.messages.length%2!==1)fail();
  const messages=o.messages.map((v,i)=>{const m=obj(v,['role','content']);if(m.role!==(i%2===0?'user':'assistant')||typeof m.content!=='string'||!m.content.trim()||m.content.length>(m.role==='user'?600:2000))fail();return {role:m.role,content:m.content} as ChatMessage;});
  if(messages.reduce((n,m)=>n+m.content.length,0)>6000)fail();return {...identity,agentId:o.agentId as string,messages};
}
const objectSchema=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
const enumSchema=(values:readonly string[])=>({type:'string',enum:values});
const arraySchema=(items:unknown,minItems:number,maxItems:number)=>({type:'array',items,minItems,maxItems});
export const DASHBOARD_SCHEMA=objectSchema({version:{type:'integer',enum:[1]},title:enumSchema(TITLES),kpis:arraySchema(enumSchema(METRIC_IDS),3,6),chart:objectSchema({dimension:enumSchema(DIMENSIONS),type:enumSchema(['benefit-bars','coverage-bars']),sort:enumSchema(['benefit-desc','benefit-asc','coverage-asc','name'])}),notes:arraySchema(enumSchema(NOTE_IDS),1,5)});
export function explanationSchema(groups:string[]){return objectSchema({version:{type:'integer',enum:[1]},focus:enumSchema(['results','coverage','limitations']),facts:arraySchema(objectSchema({groupId:enumSchema(groups),metricId:enumSchema(METRIC_IDS)}),1,4),notes:arraySchema(enumSchema(NOTE_IDS),1,5)});}
export const CHAT_SCHEMA=objectSchema({version:{type:'integer',enum:[1]},topics:arraySchema(enumSchema(CHAT_TOPICS),1,3)});

/** The browser applies the same finite parser and exact run/profile checks. */
export function parseAiResponse(v:unknown,kind:AiKind,expected:AiIdentity,groups:string[],agentId?:string):AiResponse{
  const o=obj(v,['version','kind','identity','agentId','provider','model','usage','output']);version(o);const i=obj(o.identity,['runId','requestId']);
  if(o.kind!==kind||i.runId!==expected.runId||i.requestId!==expected.requestId||o.agentId!==(agentId??null))fail();
  if(typeof o.model!=='string'||o.model.length<1||o.model.length>256)fail();
  const usage=obj(o.usage,['inputTokens','outputTokens','totalTokens']);for(const v of Object.values(usage))if(v!==null&&(!Number.isSafeInteger(v)||(v as number)<0))fail();
  return {version:1,kind,identity:{runId:expected.runId,requestId:expected.requestId},agentId:agentId??null,provider:one(o.provider,['gemini','openrouter','anthropic']),model:o.model,usage:usage as AiResponse['usage'],output:kind==='dashboard'?parseDashboardLayout(o.output):kind==='explain'?parseExplanation(o.output,groups):parseChatSelection(o.output)};
}
