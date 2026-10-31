/** Private hash-chained format2 journal. Legacy records and semantics stay unchanged. */
import {replacePrivateCheckpoint} from './storage.ts';
import {deepLimits,isDeep} from '../../society/deep-policy.ts';
import {openSync,writeSync,fsyncSync,closeSync,existsSync,readFileSync,statSync,writeFileSync,ftruncateSync} from 'node:fs';
import {join,dirname,basename} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {canonical,ensure} from '../../experiments/validation.ts';
import type {SocietyWorld,SocietyInput} from '../../society/contract.ts';
import type {DecisionContext,SocialDecisionRecord} from '../../society/decision-contract.ts';

export interface ProviderAdmission {maxCalls:number;reservedTokens:number;costUsd:number;deadlineMs?:number}
export interface SwarmJournalState {id:string;runId:string;revision:number;world:SocietyWorld;reservation:DecisionContext|null;journalRecords?:number;journalHead?:string;providerAdmission?:ProviderAdmission}
export interface JournalFrame {offset:number;head:string;revision:number;tick:number;recordCount:number}
const digest=(x:unknown)=>createHash('sha256').update(canonical(x)).digest('hex');
export function swarmStorageLimits(input:SocietyInput){return deepLimits(input);}

function row(s:SwarmJournalState,first:boolean){
 const records=s.world.hybrid!.records,count=s.journalRecords??0;
 ensure(count<=records.length&&records.length<=deepLimits(s.world).decisions,'SOCIAL_JOURNAL_ORDER');
 const body={format:2,id:s.id,runId:s.runId,revision:s.revision,...(first?{input:s.world.genesis.input,...(isDeep(s.world)&&s.providerAdmission?{providerAdmission:s.providerAdmission}:{})}:{}),tick:s.world.tick,recordCount:records.length,records:records.slice(count),pending:s.world.hybrid!.pending,reservation:s.reservation,tokenBudgetExhausted:!!s.world.hybrid!.tokenBudgetExhausted,previous:s.journalHead??null};
 const hash=digest(body);return {hash,line:JSON.stringify({...body,hash})+'\n'};
}

/** Reserve enough space for the reservation plus a bounded completion before dispatch. */
export function assertSwarmJournalAdmission(s:SwarmJournalState,root:string){
 const path=join(root,s.id+'.jsonl'),limits=deepLimits(s.world),existing=existsSync(path)?statSync(path).size:0;
 const {line}=row(s,!existing),bytes=Buffer.byteLength(line);
 ensure(bytes<limits.rowBytes&&existing+bytes+limits.rowBytes<=limits.journalBytes,'SOCIAL_STORAGE_LIMIT');
}

export async function appendSwarmJournal(s:SwarmJournalState,root:string){
 const path=join(root,s.id+'.jsonl'),first=!existsSync(path),existing=first?0:statSync(path).size,limits=deepLimits(s.world),{hash,line}=row(s,first),bytes=Buffer.byteLength(line);
 ensure(bytes<limits.rowBytes&&existing+bytes<=limits.journalBytes,'SOCIAL_STORAGE_LIMIT');
 const fd=openSync(path,first?'wx':'a',0o600);
 try{ensure(writeSync(fd,line)===bytes,'SOCIAL_JOURNAL_WRITE');fsyncSync(fd);}finally{closeSync(fd);}
 s.journalRecords=s.world.hybrid!.records.length;s.journalHead=hash;
 try{await replacePrivateCheckpoint(join(root,s.id+'.checkpoint.json'),JSON.stringify({format:2,id:s.id,revision:s.revision,tick:s.world.tick,recordCount:s.journalRecords,head:hash,journalBytes:existing+bytes}));}
 catch{console.warn('SOCIAL_CHECKPOINT_SAFE',JSON.stringify({code:'RECOVER_FROM_JOURNAL'}));}
}

export function readSwarmJournal(path:string,options:{allowIncompleteDeepTail?:boolean}={}){
 const raw=readFileSync(path),lastNewline=raw.lastIndexOf(10),complete=lastNewline===raw.length-1;
 ensure(lastNewline>=0,'SOCIAL_STORAGE_INCOMPLETE');
 const prefix=raw.subarray(0,lastNewline+1).toString('utf8');
 let head:string|null=null,input:SocietyInput|undefined,last:any,records:SocialDecisionRecord[]=[],providerAdmission:ProviderAdmission|undefined;
 const frames:JournalFrame[]=[];let offset=0;
 for(const line of prefix.trimEnd().split('\n')){
  let value:any;try{value=JSON.parse(line);}catch{throw Error('SOCIAL_JOURNAL_HASH');}
  const {hash,...body}=value;
  ensure(body.format===2&&body.previous===head&&digest(body)===hash,'SOCIAL_JOURNAL_HASH');
  if(input===undefined){ensure(body.input?.swarm,'SOCIAL_JOURNAL_HEADER');input=body.input;providerAdmission=body.providerAdmission;}
  else ensure(body.input===undefined&&body.providerAdmission===undefined,'SOCIAL_JOURNAL_HEADER');
  ensure(body.id===last?.id||last===undefined,'SOCIAL_JOURNAL_ID');
  ensure(body.runId===(last?.runId??body.runId)&&body.revision>=(last?.revision??0)&&body.tick>=(last?.tick??0),'SOCIAL_JOURNAL_ORDER');
  ensure(Array.isArray(body.records),'SOCIAL_JOURNAL_ORDER');records.push(...body.records);
  ensure(records.length===body.recordCount&&records.length<=deepLimits(input!).decisions,'SOCIAL_JOURNAL_ORDER');
  ensure(Buffer.byteLength(line)+1<deepLimits(input!).rowBytes,'SOCIAL_STORAGE_LIMIT');
  head=hash;last=body;offset+=Buffer.byteLength(line)+1;frames.push({offset,head:hash,revision:body.revision,tick:body.tick,recordCount:body.recordCount});
 }
 ensure(last&&input,'SOCIAL_JOURNAL_HEADER');
 ensure(raw.length<=deepLimits(input).journalBytes,'SOCIAL_STORAGE_LIMIT');
 if(!complete){
  ensure(raw.length-offset<deepLimits(input).rowBytes,'SOCIAL_STORAGE_LIMIT');
  // A complete JSON record with a missing delimiter is not a torn partial append.
  // In particular, do not conceal a complete bad-hash record by calling it a tail.
  let final:any;try{final=JSON.parse(raw.subarray(offset).toString('utf8'));}catch{/* A syntactically unfinished final append may be recovered below. */}
  if(final!==undefined){const {hash,...body}=final;ensure(body.format===2&&body.previous===head&&digest(body)===hash,'SOCIAL_JOURNAL_HASH');throw Error('SOCIAL_STORAGE_INCOMPLETE');}
 }
 ensure(complete||options.allowIncompleteDeepTail&&isDeep(input),'SOCIAL_STORAGE_INCOMPLETE');
 return {id:last.id,runId:last.runId,revision:last.revision,input:input as SocietyInput&{swarm:NonNullable<SocietyInput['swarm']>},tick:last.tick,hybrid:{records,pending:last.pending as DecisionContext|null,...(last.tokenBudgetExhausted?{tokenBudgetExhausted:true as const}:{})},reservation:last.reservation as DecisionContext|null,journalRecords:records.length,journalHead:head!,providerAdmission,frames,journalBytes:offset,incompleteBytes:raw.length-offset};
}

/** Called only while holding the session owner. Preserves incomplete private evidence. */
export async function recoverIncompleteSwarmTail(path:string){
 const verified=readSwarmJournal(path,{allowIncompleteDeepTail:true});
 if(!verified.incompleteBytes)return {...verified,evidencePath:null};
 const original=readFileSync(path),evidencePath=join(dirname(path),basename(path)+'.incomplete-'+randomUUID()+'.private');
 const evidence=openSync(evidencePath,'wx',0o600);
 try{writeFileSync(evidence,original.subarray(verified.journalBytes));fsyncSync(evidence);}finally{closeSync(evidence);}
 ensure(readFileSync(path).equals(original),'SOCIAL_JOURNAL_ORDER');
 const fd=openSync(path,'r+');try{ftruncateSync(fd,verified.journalBytes);fsyncSync(fd);}finally{closeSync(fd);}
 return {...verified,evidencePath};
}
