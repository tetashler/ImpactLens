'use client';
import {useEffect,useRef,useState} from 'react';
import type {AssumptionDecision,AssumptionReview,AssumptionReviewDraft} from '../lib/assumption-review/contract';
import './assumption-review-panel.css';

export default function AssumptionReviewPanel({draft,onStart,onRevise,onCancel}:{draft:AssumptionReviewDraft;onStart:(decisions:AssumptionDecision[])=>void;onRevise:()=>void;onCancel:()=>void}){
 const [choices,setChoices]=useState<Record<string,AssumptionDecision['decision']>>({});
 const [submitted,setSubmitted]=useState(false),[expired,setExpired]=useState(()=>Date.now()>=Date.parse(draft.expiresAt));
 const heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>{
  setChoices({});setSubmitted(false);const remaining=Date.parse(draft.expiresAt)-Date.now();setExpired(remaining<=0);
  heading.current?.focus();const timer=setTimeout(()=>setExpired(true),Math.max(0,Math.min(remaining,2_147_483_647)));
  return()=>clearTimeout(timer);
 },[draft.draftId,draft.expiresAt]);
 const answered=draft.assumptions.filter(a=>choices[a.id]!==undefined).length;
 const complete=answered===draft.assumptions.length;
 function start(){
  if(!complete||submitted||expired||Date.now()>=Date.parse(draft.expiresAt)){if(Date.now()>=Date.parse(draft.expiresAt))setExpired(true);return;}
  setSubmitted(true);onStart(draft.assumptions.map(a=>({assumptionId:a.id,decision:choices[a.id]})));
 }
 return <div className="assumption-review-panel" aria-label="Simulation assumption review">
  <h2 ref={heading} tabIndex={-1}>Review simulation assumptions</h2>
  <p className="assumption-review-question"><strong>Given in your question</strong><span>{draft.question}</span></p>
  <p className="assumption-review-interpretation"><strong>AI draft interpretation</strong>{draft.description}</p>
  <p className="assumption-review-help">Allow assumptions you want this hypothetical simulation to use. “Do not allow” leaves the matter unknown; it does not mean the opposite is true. AI responses remain fictional and may make mistakes.</p>
  {draft.assumptions.length?<>
   <p className="assumption-review-count" role="status" aria-live="polite">{answered} of {draft.assumptions.length} assumptions reviewed</p>
   <div className="assumption-review-items">{draft.assumptions.map((a,index)=><fieldset key={a.id} disabled={submitted||expired}>
    <legend><span>{index+1}.</span> {a.text}</legend>
    <div className="assumption-review-choices">{(['allow','do-not-allow'] as const).map(decision=><label key={decision}><input type="radio" name={`assumption-${a.id}`} value={decision} checked={choices[a.id]===decision} onChange={()=>setChoices(previous=>({...previous,[a.id]:decision}))}/><span>{decision==='allow'?'Allow':'Do not allow'}</span></label>)}</div>
   </fieldset>)}</div>
  </>:<p className="assumption-review-empty">No additional assumptions proposed</p>}
  {expired&&<p className="assumption-review-expired" role="alert">This review is no longer current. Prepare a new review.</p>}
  <div className="assumption-review-actions">
   <button type="button" className="map-explore-button" disabled={!complete||submitted||expired} onClick={start}>{submitted?'Starting simulation…':draft.assumptions.length?'Start simulation':'Continue'}</button>
   <button type="button" onClick={onRevise}>Back to editing</button>
   <button type="button" onClick={onCancel}>Cancel</button>
  </div>
 </div>;
}

export function AssumptionReviewReport({review}:{review:AssumptionReview}){
 return <section className="assumption-review-report" aria-label="Assumption review">
  <h2>Assumption review</h2>
  {review.items.length?<ul>{review.items.map(item=><li key={item.assumptionId}><strong>{item.decision==='allow'?'Allowed':'Not allowed — treated as unknown'}</strong><span>{item.text}</span></li>)}</ul>:<p>No additional assumptions were proposed; user continued.</p>}
  <p>Reviewed <time dateTime={review.reviewedAt}>{review.reviewedAt.replace('T',' ').replace(/\.\d{3}Z$/,' UTC')}</time>.</p>
  <p>These choices define the hypothetical scenario. They do not verify the assumptions or AI responses.</p>
 </section>;
}
