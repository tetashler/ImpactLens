import type { EldercareApiRequest,EldercareApiResponse } from './api-contract.ts';
import { parseEldercareApiRequest,parseEldercareApiResponse } from './api-contract.ts';
import { ImpactRevisionGate } from '../impact/lifecycle.ts';
class AacClientError extends Error {}
export class AacRequestSession {
  private active=false;private key='';private contextRevision=0;private gate=new ImpactRevisionGate();
  /** Synchronous guard, with no network side effects; also handles A→B→A edits. */
  setContext(active:boolean,key:string):void {if(active!==this.active||key!==this.key)this.contextRevision++;this.active=active;this.key=key;}
  cancel():void {this.gate.invalidate();}
  async calculate(request:EldercareApiRequest,key:string,fetcher:typeof fetch=fetch):Promise<EldercareApiResponse|null>{
    if(!this.active||key!==this.key)return null;
    const expected=parseEldercareApiRequest(structuredClone(request)),revision=this.contextRevision,ticket=this.gate.begin(key);
    const accepts=()=>this.active&&revision===this.contextRevision&&this.gate.accepts(ticket,this.key);
    try{
      const response=await fetcher('/api/eldercare/simulate',{method:'POST',headers:{'Content-Type':'application/json'},signal:ticket.controller.signal,body:JSON.stringify(expected)});
      let body;try{body=await response.json();}catch{throw new AacClientError('The eldercare response could not be read. Retry the calculation.');}
      if(!response.ok)throw new AacClientError(body?.version===1&&typeof body?.error?.message==='string'?body.error.message:'The local eldercare calculation is unavailable. Retry.');
      let result;try{result=await parseEldercareApiResponse(body,expected);}catch{throw new AacClientError('An invalid or outdated response was ignored. Recalculate for the current centre and settings.');}
      return accepts()?result:null;
    }catch(error){if(!accepts())return null;if(error instanceof AacClientError)throw error;throw new AacClientError('Cannot reach the local eldercare API. Check the server and retry.');}
  }
}
