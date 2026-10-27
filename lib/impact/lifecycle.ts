import type { CitizenJourneyOutcome } from '../contracts/citizen-simulation.ts';
export interface ImpactTicket { revision:number; key:string; controller:AbortController }
/** Cancellation saves client work; revision + current-key checks also reject uncancellable late responses. */
export class ImpactRevisionGate {
  private revision=0;
  private current:ImpactTicket|null=null;
  invalidate():void {this.current?.controller.abort();this.current=null;this.revision++;}
  begin(key:string):ImpactTicket {this.invalidate();return this.current={revision:this.revision,key,controller:new AbortController()};}
  accepts(ticket:ImpactTicket,currentKey:string):boolean {return this.current===ticket&&ticket.revision===this.revision&&ticket.key===currentKey&&!ticket.controller.signal.aborted;}
}
/** Select stored engine results for presentation. No metrics, coordinates or view-pair payloads are created. */
export function journeySide(journey:CitizenJourneyOutcome|null,view:'baseline'|'scenario'):{status:string;minutes:number|null} {
  if(!journey||journey.assignment==='unassigned')return {status:'unassigned',minutes:null};
  return {status:journey.comparison[view==='baseline'?'baselineStatus':'scenarioStatus'],minutes:journey.comparison[view==='baseline'?'baselineMinutes':'scenarioMinutes']};
}
