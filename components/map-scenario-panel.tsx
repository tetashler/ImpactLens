'use client';
import type {QuestionSimulationSnapshot} from '../lib/question-simulation/client';
import {questionRunErrorMessage} from '../lib/question-simulation/errors';

export function WorkspaceViews({current,onMap,onGraph,onReport,onSocial}:{current:'map'|'knowledge'|'report'|'social';onSocial?:()=>void;onMap:()=>void;onGraph:()=>void;onReport:()=>void}){
 return <nav className="general-tabs" aria-label="Workspace views"><button type="button" aria-current={current==='map'?'page':undefined} onClick={onMap}>Map</button><button type="button" aria-current={current==='knowledge'?'page':undefined} onClick={onGraph}>Knowledge Graph</button><button type="button" aria-current={current==='report'?'page':undefined} onClick={onReport}>Report</button>{onSocial&&<button type="button" aria-current={current==='social'?'page':undefined} onClick={onSocial}>Social Simulation</button>}</nav>;
}
export default function MapScenarioPanel({question,state,toolsOpen,result,onQuestion,onExplore,onCancel,onToggleTools,onGraph,onReport,onArchive}:{question:string;state:QuestionSimulationSnapshot;toolsOpen:boolean;result:'completed'|'partial'|null;onQuestion:(q:string)=>void;onExplore:()=>void;onCancel:()=>void;onToggleTools:()=>void;onGraph:()=>void;onReport:()=>void;onArchive:(id:string|null)=>void}){
 const current=state.question===question,busy=current&&['interpreting','preparing','executing'].includes(state.phase);
 const error=current?(state.run?.error?questionRunErrorMessage(state.run):state.error):null;
 return <section className="map-scenario-panel" aria-label="Scenario exploration">
  <h1>What if…?</h1>
  <form onSubmit={e=>{e.preventDefault();onExplore();}}>
   <label htmlFor="map-question">Your scenario question</label>
   <textarea id="map-question" value={question} maxLength={2000} rows={4} onChange={e=>onQuestion(e.target.value)} placeholder="What would you like to explore?"/>
   <div className="map-question-actions"><button type="button" aria-expanded={toolsOpen} aria-controls="map-plot-controls" onClick={onToggleTools}>Plot Tools</button><button className="map-explore-button" disabled={!question.trim()||busy} type="submit">Explore</button></div>
  </form>
  <div className="map-exploration-status" role="status" aria-live="polite">{busy?<><span className="spinner"/> Exploring…</>:result==='completed'?<>Exploration complete <span>{state.run?.events.length} accepted turns</span></>:result==='partial'?<>Exploration interrupted <span>{state.run?.events.length} accepted turns retained</span></>:current&&state.phase==='cancelled'?'Exploration cancelled':error?'Exploration could not complete':null}</div>
  {busy&&<button type="button" className="map-cancel-button" onClick={onCancel}>Cancel</button>}
  {error&&<p className="map-exploration-error" role="alert">{error}</p>}
  {result&&<div className="map-result-links"><button type="button" onClick={onGraph}>{result==='completed'?'View Knowledge Graph':'Inspect partial Knowledge Graph'}</button><button type="button" onClick={onReport}>{result==='completed'?'View Report':'Inspect partial Report'}</button></div>}
  {!!state.history.length&&<details className="map-history"><summary>Recorded explorations</summary><label>Inspect a recorded run<select aria-label="Recorded explorations" value="" onChange={e=>{if(e.target.value)onArchive(e.target.value);}}><option value="">Choose a run</option>{state.history.map(h=><option key={h.id} value={h.id}>{h.question} · {h.phase}</option>)}</select></label></details>}
  <details className="map-diagnostics"><summary>Diagnostics</summary>{current&&state.dynamicFailure?.error.diagnostic&&<p>Failure stage: {state.dynamicFailure.error.diagnostic.stage}; category: {state.dynamicFailure.error.diagnostic.reason}; elapsed: {state.dynamicFailure.error.diagnostic.elapsedMs} ms.</p>}{current&&state.dynamicFailure?.error.validation&&<p>Validation rule: {state.dynamicFailure.error.validation.rule}; path: {state.dynamicFailure.error.validation.path}; category: {state.dynamicFailure.error.validation.category}.</p>}{current&&state.dynamicFailure?.retrieval&&<p>Retrieval: {state.dynamicFailure.retrieval.status}; source candidates: {state.dynamicFailure.retrieval.sourceCount}; elapsed: {state.dynamicFailure.retrieval.durationMs} ms; credits: {state.dynamicFailure.retrieval.credits??'unknown'}. Retrieval does not establish source truth.</p>}<p>Live inference: {state.inferenceStatus?.enabled?'enabled':'unavailable or not loaded'}. DeepSeek through OpenRouter; DigitalOcean only.</p><p>Dialogue is synthetic. Numerical MRT/AAC calculations require separately confirmed inputs.</p></details>
 </section>;
}
