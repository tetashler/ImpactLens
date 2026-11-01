/** Small exact-reference relevance bonus, not a semantic or causal memory-use evaluator. */
import type {SocietyWorld,SocialEvent,SocialItem} from '../society/contract.ts';
import {canAccessItem} from '../society/communication.ts';
import {threadPath} from '../society/exposure.ts';
import {presentCitizenGrounding} from './social.ts';
const authored=new Set(['post','comment','reply','message','group-reply']);
const indexes=new WeakMap<SocietyWorld,{items:Map<string,SocialItem>;events:Map<string,SocialEvent>}>();
function index(w:SocietyWorld){let value=indexes.get(w);if(!value){value={items:new Map(w.items.map(i=>[i.id,i])),events:new Map(w.events.map(e=>[e.id,e]))};indexes.set(w,value);}return value;}

/** The caller still owns experienced-memory/ancestry admission; this function never supplies a source body. */
export function groundedMemoryBonus(w:SocietyWorld,actorId:string,queryItemId:string,candidateItemId:string):number{
 const grounding=w.genesis.input.citizenGrounding,actor=w.agents.find(a=>a.id===actorId);
 if(grounding?.policy!=='citizen-grounded-v1'||!actor||queryItemId===candidateItemId||!grounding.profiles.some(p=>p.citizen.id===actorId))return 0;
 const state=index(w),actual=(id:string,own=true)=>{
  const item=state.items.get(id),event=state.events.get(id);
  return item&&event&&(!own||item.actorId===actorId&&event.actorId===actorId&&event.source==='social-model')&&event.actorId===item.actorId&&authored.has(event.type)&&event.tick===item.tick&&event.platform===item.platform&&event.text===item.text&&canAccessItem(w,actorId,item)?{item,event}:null;
 };
 const query=actual(queryItemId,false),candidate=actual(candidateItemId);if(!query||!candidate)return 0;
 const path=threadPath(w,queryItemId);if(!path.length||!path.every((id,i)=>{const item=state.items.get(id),previous=i?state.items.get(path[i-1]):null;return item&&canAccessItem(w,actorId,item)&&(!previous||item.platform===previous.platform&&item.groupId===previous.groupId);}))return 0;
 // Peer-authored metadata is never evidence about this actor. Only actual own model-authored
 // ancestors may supply an exact anchor for a reply in the same authorised conversation.
 const anchors=path.map(id=>actual(id)).filter((a):a is NonNullable<typeof a>=>a!==null);
 const context=presentCitizenGrounding(grounding,actorId,w.genesis.input.citizenSelection?.policy),factIds=new Set(context.facts.filter(f=>f.value!==null).map(f=>f.id));
 const links=(event:SocialEvent)=>new Set((event.citizenEvidence?.factLinks??[]).filter(link=>link.citizenId===actorId&&link.scenarioFingerprint===grounding.scenarioFingerprint&&factIds.has(link.factId)).map(link=>link.factId));
 const queryLinks=new Set(anchors.flatMap(a=>[...links(a.event)])),candidateLinks=links(candidate.event),factBonus=[...queryLinks].some(id=>candidateLinks.has(id))?1:0;
 const subjectId=candidate.event.citizenEvidence?.issueSubjectId;
 let issueBonus=0;
 if(subjectId&&anchors.some(a=>a.event.citizenEvidence?.issueSubjectId===subjectId)&&context.subjects.some(s=>s.id===subjectId)){
  const issues=new Map([...(actor.issueHistory??[]),...(actor.issues??[])].map(issue=>[issue.id,issue]));
  if([...issues.values()].some(issue=>issue.status==='open'&&issue.grounding?.subjectId===subjectId&&actual(issue.sourceEventId)?.event.citizenEvidence?.issueSubjectId===subjectId))issueBonus=0.5;
 }
 return Math.min(1.5,factBonus+issueBonus);
}
