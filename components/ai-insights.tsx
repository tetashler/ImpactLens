'use client';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import type { ImpactResponse } from '../lib/impact/api-contract';
import type { CitizenProfileResponse } from '../lib/contracts/citizen-simulation';
import { ImpactRevisionGate } from '../lib/impact/lifecycle';
import { parseAiResponse,boundChatMessages,type AiResponse,type AiKind,type DashboardLayout,type ExplanationSelection,type ChatSelection,type ChatMessage } from '../lib/ai/contracts';
import { evidenceGroupIds,renderExplanation,renderCitizenAnswer } from '../lib/ai/grounding';
import './ai.css';

export type AiAvailability={available:true;provider:'gemini'|'openrouter';model:string}|{available:false;reason:string};
export function useAiAvailability():AiAvailability {
  const [state,setState]=useState<AiAvailability>({available:false,reason:'Checking local AI configuration…'});
  useEffect(()=>{const controller=new AbortController();fetch('/api/ai/status',{signal:controller.signal,cache:'no-store'}).then(r=>r.json()).then(v=>{
    if(v?.available===true&&(v.provider==='gemini'||v.provider==='openrouter')&&typeof v.model==='string'&&v.model.length<=256)setState(v);
    else setState({available:false,reason:typeof v?.reason==='string'?v.reason:'AI is unavailable. The calculated dashboard works without it.'});
  }).catch(()=>{if(!controller.signal.aborted)setState({available:false,reason:'AI configuration is unavailable. Core calculations remain usable.'});});return ()=>controller.abort();},[]);
  return state;
}
function useAiRequest(report:ImpactResponse){
  const gate=useRef(new ImpactRevisionGate()),pending=useRef(false),sequence=useRef(0);
  const [busy,setBusy]=useState(false),[error,setError]=useState(''),[metadata,setMetadata]=useState<AiResponse|null>(null);
  const key=`${report.identity.runId}:${report.identity.requestId}`,current=useRef(key);current.current=key;
  useEffect(()=>{const g=gate.current;return ()=>{sequence.current++;pending.current=false;g.invalidate();};},[key]);
  function cancel(){sequence.current++;pending.current=false;gate.current.invalidate();setBusy(false);setError('');}
  async function request(kind:AiKind,agentId?:string,messages?:ChatMessage[]):Promise<AiResponse|null>{
    if(pending.current)return null;pending.current=true;const atSequence=++sequence.current;setBusy(true);setError('');
    const ticket=gate.current.begin(key);
    try{
      const response=await fetch(`/api/ai/${kind}`,{method:'POST',headers:{'Content-Type':'application/json'},signal:ticket.controller.signal,body:JSON.stringify({requestId:report.identity.requestId,runId:report.identity.runId,...(agentId?{agentId,messages}:{})})});
      let body;try{body=await response.json();}catch{throw new Error('AI returned an unreadable response. Retry later; the calculated dashboard remains available.');}
      if(!response.ok)throw new Error(typeof body?.error==='string'?body.error:'AI request failed. The deterministic dashboard remains available.');
      const value=parseAiResponse(body,kind,report.identity,evidenceGroupIds(report),agentId);
      if(gate.current.accepts(ticket,current.current)){setMetadata(value);return value;}
    }catch(e){if((e as Error).name!=='AbortError'&&gate.current.accepts(ticket,current.current))setError((e as Error).message);}
    finally{if(atSequence===sequence.current){pending.current=false;if(gate.current.accepts(ticket,current.current))setBusy(false);}}
    return null;
  }
  return {request,busy,error,metadata,cancel};
}
function Usage({value}:{value:AiResponse|null}){return value?<p className="ai-usage">{value.provider} · {value.model} · tokens in {value.usage.inputTokens??'unavailable'} / out {value.usage.outputTokens??'unavailable'}. No price estimate.</p>:null;}
export function AiDashboardTools({report,availability,onLayout,onReset}:{report:ImpactResponse;availability:AiAvailability;onLayout:(layout:DashboardLayout)=>void;onReset:()=>void}){
  const ai=useAiRequest(report),[explanation,setExplanation]=useState<ExplanationSelection|null>(null);
  useEffect(()=>{if(ai.error)onReset();},[ai.error]);
  return <section className="ai-tools" aria-label="AI presentation assistant">
    <div className="ai-heading"><span className="ai-symbol" aria-hidden="true">✦</span><div><h3>Evidence, explained.</h3><p>AI selects the presentation. The model owns the numbers.</p></div><span className="ai-status">{availability.available?availability.provider:'Optional AI'}</span></div>
    <p className="ai-context">{availability.available?`${availability.model} · on demand only`:availability.reason}</p>
    <div className="ai-actions"><button disabled={!availability.available||ai.busy} onClick={async()=>{const r=await ai.request('explain');if(r)setExplanation(r.output as ExplanationSelection);}}>Explain this scenario</button><button disabled={!availability.available||ai.busy} onClick={async()=>{const r=await ai.request('dashboard');if(r)onLayout(r.output as DashboardLayout);}}>Arrange dashboard with AI</button></div>
    <button className="ai-reset" onClick={()=>{ai.cancel();onReset();}}>Use deterministic layout</button>
    {ai.busy&&<p role="status"><span className="spinner"/> Selecting grounded presentation…</p>}
    {ai.error&&<p className="ai-error" role="alert">{ai.error}</p>}
    {explanation&&<div className="ai-explanation" aria-label="Grounded scenario explanation"><span className="ai-eyebrow">AI-selected evidence · application-rendered facts</span>{renderExplanation(explanation,report).map((line,i)=><p key={i}>{line}</p>)}<p className="ai-context">Census {report.payload.metadata.demographicReferenceYear} · service {report.payload.metadata.simulationDate}. This explanation belongs only to the current calculated run.</p></div>}
    <Usage value={ai.metadata}/>
  </section>;
}
export function CitizenChat({report,profile,availability}:{report:ImpactResponse;profile:CitizenProfileResponse;availability:AiAvailability}){
  const [open,setOpen]=useState(false),[question,setQuestion]=useState(''),[history,setHistory]=useState<ChatMessage[]>([]);
  const ai=useAiRequest(report);
  async function submit(event:FormEvent){event.preventDefault();if(!question.trim()||question.length>600||ai.busy)return;
    const messages=boundChatMessages(history,question.trim());
    const value=await ai.request('citizen-chat',profile.citizen.agentId,messages);
    if(value){setHistory([...messages,{role:'assistant' as const,content:renderCitizenAnswer(value.output as ChatSelection,profile)}].slice(-6));setQuestion('');}
  }
  return <section className="citizen-chat" aria-label="Synthetic citizen conversation">
    <button className="citizens-button chat-open" disabled={!availability.available} onClick={()=>setOpen(v=>!v)} aria-expanded={open}>Talk to citizen</button>
    <p className="ai-context">Synthetic persona, using this calculated profile and assumed journey. {availability.available?'A new citizen or scenario starts a fresh conversation.':availability.reason}</p>
    {open&&<><div className="chat-log" role="log" aria-label="Conversation with synthetic citizen" aria-live="polite">{history.length?history.map((m,i)=><div key={i} className={`chat-message ${m.role}`}><strong>{m.role==='user'?'You':'Synthetic citizen'}</strong><p>{m.content}</p></div>):<p className="ai-context">Ask about the assigned journey, transfers, expansion weight or data assumptions. Exact homes, jobs and health details are unavailable.</p>}</div>
      <form onSubmit={submit}><label>Question for this synthetic citizen<textarea aria-label="Question for synthetic citizen" value={question} onChange={e=>setQuestion(e.target.value)} maxLength={600} rows={3} placeholder="How does this proposal change your modelled journey?"/></label><div className="chat-submit"><span>{question.length}/600 · up to 3 exchanges retained</span><button disabled={ai.busy||!question.trim()} type="submit">{ai.busy?'Preparing grounded answer…':'Ask citizen'}</button></div></form>
      {ai.error&&<p className="ai-error" role="alert">{ai.error}</p>}<Usage value={ai.metadata}/></>}
  </section>;
}
