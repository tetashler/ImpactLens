import {parseStakeholderInput,parseStakeholderRun,STAKEHOLDER_LIMITS,type StakeholderSimulationInputV1,type StakeholderSimulationRunV1} from './contract.ts';
import {inputFingerprints,verifyStakeholderRun,canonicalStakeholder} from './identities.ts';

export interface StakeholderTicket {attemptId:string;key:string;generation:number;controller:AbortController}
/** Content identity plus a monotonic attempt: cancellation alone is insufficient. */
export class StakeholderRequestGate {
  private key='';private generation=0;private active:StakeholderTicket|null=null;
  setContext(key:string){if(key!==this.key){this.cancel();this.key=key;}}
  begin(key:string):StakeholderTicket {this.setContext(key);this.cancel();const ticket={attemptId:`attempt-${this.generation}-${crypto.randomUUID()}`,key,generation:this.generation,controller:new AbortController()};this.active=ticket;return ticket;}
  protected owns(ticket:StakeholderTicket,key:string){return this.active===ticket&&this.key===key&&ticket.key===key&&ticket.generation===this.generation;}
  accepts(ticket:StakeholderTicket,key:string){return this.owns(ticket,key)&&!ticket.controller.signal.aborted;}
  cancel(){this.generation++;this.active?.controller.abort();this.active=null;}
}
export class StakeholderRequestSession extends StakeholderRequestGate {
  async execute(value:StakeholderSimulationInputV1,key:string,fetcher:typeof fetch=fetch,timeoutMs=15_000):Promise<StakeholderSimulationRunV1|null>{
    if(!Number.isSafeInteger(timeoutMs)||timeoutMs<1||timeoutMs>120_000)throw new Error('Stakeholder request timeout must be an integer from 1 to 120000 milliseconds.');
    const input=parseStakeholderInput(value),ticket=this.begin(key),timeoutError=new Error('Stakeholder request timed out. Try again.');
    let timedOut=false,rejectInterrupt!:(reason:unknown)=>void;
    const interrupted=new Promise<never>((_,reject)=>{rejectInterrupt=reject;});
    const interrupt=()=>rejectInterrupt(timedOut?timeoutError:new Error('Stakeholder request cancelled.'));
    ticket.controller.signal.addEventListener('abort',interrupt,{once:true});
    const timer=setTimeout(()=>{if(this.accepts(ticket,key)){timedOut=true;ticket.controller.abort();}},timeoutMs);
    const executeRequest=async()=>{
      const expected=await inputFingerprints(input);
      if(!this.accepts(ticket,key))return null;
      const response=await fetcher('/api/stakeholder-simulate',{method:'POST',signal:ticket.controller.signal,headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:ticket.attemptId,input})});
      if(!this.accepts(ticket,key)){await response.body?.cancel().catch(()=>{});return null;}
      const reader=response.body?.getReader();if(!reader)throw new Error('Empty stakeholder response.');
      const abortReader=()=>{void reader.cancel().catch(()=>{});};ticket.controller.signal.addEventListener('abort',abortReader,{once:true});if(ticket.controller.signal.aborted)abortReader();
      const chunks:Uint8Array[]=[];let bytes=0;
      try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>STAKEHOLDER_LIMITS.runBytes+1024){await reader.cancel();throw new Error('Stakeholder response exceeds the supported size.');}chunks.push(value);}}finally{ticket.controller.signal.removeEventListener('abort',abortReader);reader.releaseLock();}
      if(!this.accepts(ticket,key))return null;
      const data=new Uint8Array(bytes);let offset=0;for(const c of chunks){data.set(c,offset);offset+=c.length;}
      const body=JSON.parse(new TextDecoder().decode(data));
      if(!response.ok)throw new Error(typeof body.error==='string'&&body.error.length<400?body.error:'Stakeholder execution could not complete.');
      if(body.version!==1||body.attemptId!==ticket.attemptId||Object.keys(body).sort().join(',')!=='attemptId,run,version')throw new Error('Stakeholder response identity mismatch.');
      const run=await verifyStakeholderRun(body.run);
      if(run.attemptId!==ticket.attemptId||run.inputFingerprint!==expected.inputFingerprint||run.evidenceFingerprint!==expected.evidenceFingerprint)throw new Error('Stakeholder snapshot does not match the submitted experiment.');
      return this.accepts(ticket,key)?run:null;
    };
    try{return await Promise.race([executeRequest(),interrupted]);}
    catch(error){if(timedOut&&this.owns(ticket,key))throw timeoutError;if(!this.accepts(ticket,key))return null;throw error;}
    finally{clearTimeout(timer);ticket.controller.signal.removeEventListener('abort',interrupt);}
  }
}
/** Session-local bounded history; archived records never become current automatically. */
export function addStakeholderHistory(history:StakeholderSimulationRunV1[],value:unknown):StakeholderSimulationRunV1[]{const run=parseStakeholderRun(value),existing=history.find(r=>r.runId===run.runId);if(existing&&canonicalStakeholder(existing)!==canonicalStakeholder(run))throw new Error('Conflicting records reuse an immutable run identity.');return [run,...history.filter(r=>r.runId!==run.runId)].slice(0,4);}
