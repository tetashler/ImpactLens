'use client';

import { useEffect, useId, useRef } from 'react';
import type { ScenarioResponse } from '../lib/scenarios/contract';
import { SCENARIO_LIMITS } from '../lib/scenarios/contract';
import { SCENARIO_EXAMPLES } from '../lib/scenarios/client';
import type { useScenarioPlanner } from './use-scenario-planner';
import ScenarioPlanView from './scenario-plan-view';

type Props = {
  planner: ReturnType<typeof useScenarioPlanner>;
  onConfigure: (mode:'mrt'|'aac', response:ScenarioResponse)=>void;
  resume?:{label:string;onResume:()=>void};
  compact?:boolean;
};

export default function ScenarioComposer({planner:p,onConfigure,resume,compact=false}:Props) {
  const questionId=useId(),hintId=useId();
  const input=useRef<HTMLTextAreaElement>(null),conversation=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(p.submittedQuestion)conversation.current?.scrollTo({top:conversation.current.scrollHeight,behavior:'instant'});},[p.submittedQuestion,p.busy]);
  const examples=<div className="scenario-examples">{SCENARIO_EXAMPLES.map(example=><button type="button" className="scenario-example" key={example.id} aria-label={example.question} onClick={()=>{p.setQuestion(example.question);p.setCategory(example.category);input.current?.focus({preventScroll:true});}}><span>{example.label}</span><span>{example.question}</span></button>)}</div>;
  return <section className={`scenario-composer${compact?' compact-composer':''}`} aria-label="Scenario composer">
    <header className="composer-intro">{compact?<h2>Your scenario</h2>:<><div className="composer-mark" aria-hidden="true">◇</div><h1>What if...?</h1><p>Explore how possible changes could affect Singapore.</p></>}</header>
    <div ref={conversation} className="scenario-conversation" aria-live="polite" aria-busy={p.busy}>
      {resume&&<div className="scenario-resume"><p>Your configuration is kept. Recalculate after reviewing it. Editing the question starts a different plan.</p><button type="button" onClick={resume.onResume}>{resume.label}</button></div>}
      {!p.submittedQuestion&&!p.response&&!p.busy&&(compact?<p className="composer-welcome">Draw first or ask a question. Your plot will stay while the plan is interpreted.</p>:<><p className="composer-welcome">Start with a possibility. We’ll identify what can be modelled, what’s missing and where to go next.</p>{examples}<p className="composer-boundary">MRT and limited AAC accessibility can be calculated. Other questions receive a research plan, not a prediction.</p></>)}
      {p.submittedQuestion&&<div className="scenario-user-message"><span>Your question</span><p>{p.submittedQuestion}</p></div>}
      {p.busy&&<p className="scenario-interpreting" role="status"><span className="spinner"/> Interpreting your scenario…</p>}
      {p.error&&<div className="scenario-planner-error" role="alert"><strong>Interpretation unavailable</strong><p>{p.error}</p><p>Edit your question or try again. Nothing has been simulated.</p></div>}
      {p.response&&(compact?<details className="compact-plan"><summary>{p.response.plan.title}</summary><ScenarioPlanView response={p.response} onConfigure={mode=>onConfigure(mode,p.response!)} onRevise={()=>input.current?.focus({preventScroll:true})}/></details>:<ScenarioPlanView response={p.response} onConfigure={mode=>onConfigure(mode,p.response!)} onRevise={()=>input.current?.focus({preventScroll:true})}/>)}
    </div>
    <form className="scenario-input-form" onSubmit={event=>{event.preventDefault();void p.submit();}}>
      <label htmlFor={questionId}>Your what-if question</label>
      <textarea ref={input} id={questionId} aria-describedby={hintId} value={p.question} placeholder="What if a new MRT line connected…" maxLength={SCENARIO_LIMITS.questionCharacters} rows={3} onChange={event=>p.setQuestion(event.target.value)} onKeyDown={event=>{if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();event.currentTarget.form?.requestSubmit();}}}/>
      <div className="scenario-input-actions"><span id={hintId}>Plan first. Calculate after review.</span><button type="submit" disabled={!p.question.trim()||p.busy} aria-label="Interpret scenario">{p.busy?'Interpreting…':<>Explore <span aria-hidden="true">↗</span></>}</button></div>
    </form>
  </section>;
}
