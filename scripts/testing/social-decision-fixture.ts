/** Explicit semantic fixtures, never imported by production inference. */
import type {DecisionContext} from '../../lib/society/decision-contract.ts';
export function socialDecisionFixture(c:DecisionContext){
 const target=c.items.find(i=>i.platform===c.platform&&i.parentId&&i.actorId!==c.actor.id)??c.items.find(i=>i.platform===c.platform&&!i.parentId&&i.actorId!==c.actor.id)??c.items.find(i=>i.platform===c.platform)!;
 const memory=c.memories.find(m=>m.kind==='exposure'&&m.itemIds.includes(target.id))!;
 const other=c.memories.find(m=>m.platform!==c.platform&&m.kind==='exposure');
 const wage=/wage|income|employee/i.test(c.actor.label+' '+c.actor.goal),text=wage?'Protecting monthly pay should be separate from overtime: a shorter week should not quietly become longer unpaid shifts.':'Service coverage needs a staggered roster rather than assuming every business closes on the same day. Staffing costs should be discussed alongside wage protection.';
 return {action:target.parentId?'reply':'comment',platform:c.platform,targetId:target.id,text:`${text} ${other?`The earlier ${other.platform} discussion raised: ${other.text.slice(0,90)}. `:''}Responding to: ${target.text.slice(0,100)}`,memoryIds:[...new Set([memory.eventId,...(other?[other.eventId]:[])])],stance:null,motivation:`Fictional fixture decision shaped by: ${c.actor.goal.slice(0,150)}`};
}
