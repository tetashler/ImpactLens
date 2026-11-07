import {verifyReviewerPacket, type ReviewerPacket, type PilotReview, type PilotReviews} from './core.ts';

export const MAX_REVIEW_MILLISECONDS=7_200_000;
export type ReviewTimer={activeMilliseconds:number; firstStartedAt:number|null; runningSince:number|null};
export const newReviewTimer=():ReviewTimer=>({activeMilliseconds:0,firstStartedAt:null,runningSince:null});
export function reviewElapsed(timer:ReviewTimer,now:number):number {
  return Math.round(timer.activeMilliseconds+(timer.runningSince===null?0:Math.max(0,now-timer.runningSince)));
}
export function reviewWallElapsed(timer:ReviewTimer,now:number):number {
  return timer.firstStartedAt===null?0:Math.round(Math.max(0,now-timer.firstStartedAt));
}
export function startReviewTimer(timer:ReviewTimer,now:number):ReviewTimer {
  if(timer.runningSince!==null||reviewWallElapsed(timer,now)>=MAX_REVIEW_MILLISECONDS)return timer;
  return {...timer,firstStartedAt:timer.firstStartedAt??now,runningSince:now};
}
export function pauseReviewTimer(timer:ReviewTimer,now:number):ReviewTimer {
  return {...timer,activeMilliseconds:timer.activeMilliseconds+(timer.runningSince===null?0:Math.max(0,now-timer.runningSince)),runningSince:null};
}

export type ReviewDraft={concerns:string;concernReferences:string;stakeholders:string;claims:string;claimReferences:string;questions:string;decision:''|'insufficient-evidence'|'supported'};
export const emptyReviewDraft=():ReviewDraft=>({concerns:'',concernReferences:'',stakeholders:'',claims:'',claimReferences:'',questions:'',decision:''});

function lines(value:string,label:string):string[]{
  const trimmed=value.trim();
  const items=trimmed?trimmed.split(/\r?\n/).map(s=>s.trim()):[];
  if(items.some(item=>!item))throw new Error(`${label}: remove blank lines between entries so references keep their matching line.`);
  if(items.length>12)throw new Error(`${label}: use at most 12 entries.`);
  if(items.some(item=>item.length>1200))throw new Error(`${label}: each entry must be at most 1,200 characters.`);
  return items;
}
function referencedItems(text:string,refs:string,prefix:string,allowed:Set<string>){
  const texts=lines(text,prefix);
  // Retain blank reference lines: line N belongs to response N.
  const referenceLines=refs.split(/\r?\n/).map(s=>s.trim());
  if(referenceLines.slice(texts.length).some(Boolean))throw new Error(`${prefix}: reference lines need a matching response.`);
  return texts.map((entry,index)=>{
    const referenceIds=[...new Set((referenceLines[index]??'').split(',').map(s=>s.trim()).filter(Boolean))];
    if(referenceIds.some(ref=>!allowed.has(ref)))throw new Error(`${prefix} ${index+1}: unknown reference ID. Use an ID printed in this case.`);
    return {id:`${prefix}-${index+1}`,text:entry,referenceIds};
  });
}
export function buildPilotReview(packet:ReviewerPacket,item:ReviewerPacket['items'][number],draft:ReviewDraft,activeMilliseconds:number,elapsedMilliseconds:number,submittedAt=new Date().toISOString()):PilotReview{
  if(!packet.items.includes(item))throw new Error('This case is not in the current packet.');
  if(!draft.decision)throw new Error('Choose a decision before saving.');
  if(!Number.isInteger(activeMilliseconds)||!Number.isInteger(elapsedMilliseconds)||activeMilliseconds<0||elapsedMilliseconds<activeMilliseconds||elapsedMilliseconds>MAX_REVIEW_MILLISECONDS)throw new Error('Review time is invalid.');
  const allowed=new Set([...item.sources,...item.discussion].map(s=>s.id));
  return {id:`${packet.reviewerId}:${item.caseId}`,studyId:packet.studyId,packetId:packet.id,reviewerId:packet.reviewerId,caseId:item.caseId,itemId:item.id,decision:draft.decision,
    concerns:referencedItems(draft.concerns,draft.concernReferences,'concern',allowed),stakeholders:lines(draft.stakeholders,'Stakeholders'),claims:referencedItems(draft.claims,draft.claimReferences,'claim',allowed),questions:lines(draft.questions,'Questions').map((text,index)=>({id:`question-${index+1}`,text})),activeMilliseconds,elapsedMilliseconds,submittedAt,independent:true};
}
export function exportPilotReviews(packet:ReviewerPacket,reviews:PilotReview[]):PilotReviews{
  return {version:1,kind:'decision-pilot-reviews',studyId:packet.studyId,packetId:packet.id,reviewerId:packet.reviewerId,reviews};
}
export async function readPacketUpload(file:{size:number;text:()=>Promise<string>}):Promise<ReviewerPacket>{
  if(file.size>300*1024)throw new Error('Packet must be no larger than 300 KB.');
  let value:unknown;
  try{value=JSON.parse(await file.text());}catch{throw new Error('Choose a valid JSON reviewer packet.');}
  return verifyReviewerPacket(value);
}
