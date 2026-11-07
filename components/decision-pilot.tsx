'use client';

import {useEffect,useRef,useState,type ChangeEvent} from 'react';
import {parsePilotReviews,type PilotReview,type ReviewerPacket} from '../lib/decision-pilot/core';
import {buildPilotReview,emptyReviewDraft,exportPilotReviews,MAX_REVIEW_MILLISECONDS,newReviewTimer,pauseReviewTimer,readPacketUpload,reviewElapsed,reviewWallElapsed,startReviewTimer,type ReviewDraft,type ReviewTimer} from '../lib/decision-pilot/reviewer';
import './decision-pilot.css';

type PacketItem=ReviewerPacket['items'][number];

export function PilotPacketView({item,onOpenSource}:{item:PacketItem;onOpenSource?:()=>void}){
  return <article className="pilot-material" aria-label="Case material">
    <h2>{item.question}</h2>
    <section className="pilot-decision-question"><h3>Your decision to assess</h3><p>{item.decisionQuestion}</p></section>
    <section><h3>Brief</h3><p className="pilot-preserve">{item.brief}</p></section>
    <section><h3>Sources</h3><p className="pilot-muted">Use the printed IDs when referencing a source. Opening a source pauses active time; elapsed time continues.</p>
      <ol className="pilot-evidence">{item.sources.map(source=><li key={source.id}><code>{source.id}</code><a href={source.url} target="_blank" rel="noopener noreferrer" onClick={onOpenSource}>{source.title} ↗</a><p>{source.summary}</p><small>{source.publisher} · Accessed {source.accessedAt}</small></li>)}</ol>
    </section>
    {item.discussion.length>0&&<section><h3>Recorded synthetic discussion</h3><p className="pilot-notice">These are fictional AI-generated speakers, not interviews or resident evidence. Excerpts may omit issues from the full run; an absent issue is not evidence that it was absent from that run.</p><ol className="pilot-evidence">{item.discussion.map(entry=><li key={entry.id}><code>{entry.id}</code><strong>{entry.actorLabel}</strong><p className="pilot-preserve">{entry.text}</p></li>)}</ol></section>}
  </article>;
}

function formatTime(milliseconds:number){const seconds=Math.floor(milliseconds/1000);return `${Math.floor(seconds/60).toString().padStart(2,'0')}:${(seconds%60).toString().padStart(2,'0')}`;}

export function PilotCompletionNotice({completed}:{completed:number}){
  return <p>{completed===6?'All six cases are complete.':`${completed} of 6 cases saved. Unsaved cases remain missing.`} Export your responses and share the file with the study organiser as agreed.</p>;
}

export default function DecisionPilot(){
  const [packet,setPacket]=useState<ReviewerPacket|null>(null);
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState('');
  const [consent,setConsent]=useState(false);
  const [independent,setIndependent]=useState(false);
  const [index,setIndex]=useState(0);
  const [reviews,setReviews]=useState<PilotReview[]>([]);
  const [draft,setDraft]=useState<ReviewDraft>(emptyReviewDraft);
  const [timer,setTimer]=useState<ReviewTimer>(newReviewTimer);
  const timerRef=useRef(timer);
  const [now,setNow]=useState(0);
  const importSequence=useRef(0);
  const [pauseReason,setPauseReason]=useState('');
  const item=packet?.items[index];
  const saved=item?reviews.find(review=>review.itemId===item.id):undefined;
  const started=timer.firstStartedAt!==null;
  const running=timer.runningSince!==null;
  const active=reviewElapsed(timer,now);
  const elapsed=reviewWallElapsed(timer,now);
  const limitReached=elapsed>=MAX_REVIEW_MILLISECONDS;
  const ready=consent&&independent;
  const processed=index+(saved||limitReached?1:0),skipped=Math.max(0,processed-reviews.length);

  function updateTimer(next:ReviewTimer){timerRef.current=next;setTimer(next);}
  function pause(reason:string){const time=performance.now();updateTimer(pauseReviewTimer(timerRef.current,time));setNow(time);setPauseReason(reason);}
  useEffect(()=>{
    const handleVisibility=()=>{if(document.hidden&&timerRef.current.runningSince!==null)pause('Paused because this tab was hidden. Resume when you are ready.');};
    document.addEventListener('visibilitychange',handleVisibility);
    return ()=>document.removeEventListener('visibilitychange',handleVisibility);
  },[]);
  useEffect(()=>{
    if(!started||saved)return;
    const handle=setInterval(()=>{
      const time=performance.now();setNow(time);
      if(reviewWallElapsed(timerRef.current,time)>=MAX_REVIEW_MILLISECONDS&&timerRef.current.runningSince!==null){updateTimer(pauseReviewTimer(timerRef.current,time));setPauseReason('The two-hour case limit has been reached. This case cannot be saved.');}
    },250);
    return ()=>clearInterval(handle);
  },[started,saved]);
  useEffect(()=>()=>{importSequence.current++;},[]);

  async function importPacket(event:ChangeEvent<HTMLInputElement>){
    const file=event.target.files?.[0];event.target.value='';if(!file)return;
    const sequence=++importSequence.current;
    // Clear immediately, including if the replacement turns out to be invalid.
    setPacket(null);setReviews([]);setIndex(0);setDraft(emptyReviewDraft());updateTimer(newReviewTimer());setNow(0);setConsent(false);setIndependent(false);setPauseReason('');setError('');setLoading(true);
    try{const verified=await readPacketUpload(file);if(sequence===importSequence.current)setPacket(verified);}
    catch(cause){if(sequence===importSequence.current)setError(cause instanceof Error?cause.message:'Unable to read this reviewer packet.');}
    finally{if(sequence===importSequence.current)setLoading(false);}
  }
  function start(){
    if(!ready||saved||document.hidden)return;
    const time=performance.now();updateTimer(startReviewTimer(timerRef.current,time));setNow(time);setPauseReason('');setError('');
  }
  function save(){
    if(!packet||!item||saved||!ready||!started)return;
    const time=performance.now();const stopped=pauseReviewTimer(timerRef.current,time);
    try{
      const review=buildPilotReview(packet,item,draft,reviewElapsed(stopped,time),reviewWallElapsed(stopped,time));
      // Shared contract validates the generated export before freezing a response.
      parsePilotReviews(exportPilotReviews(packet,[...reviews,review]));
      updateTimer(stopped);setNow(time);setReviews([...reviews,review]);setError('');setPauseReason('');
    }catch(cause){setError(cause instanceof Error?cause.message:'Check your response.');}
  }
  function next(){if((!saved&&!limitReached)||!packet||index>=packet.items.length-1)return;setIndex(index+1);setDraft(emptyReviewDraft());updateTimer(newReviewTimer());setNow(0);setPauseReason('');setError('');}
  function download(){
    if(!packet||!reviews.length)return;
    const result=parsePilotReviews(exportPilotReviews(packet,reviews));
    const blob=new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json'});
    const url=URL.createObjectURL(blob);const anchor=document.createElement('a');anchor.href=url;anchor.download=`pilot-reviews-${packet.reviewerId}.json`;anchor.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function textField(key:keyof Omit<ReviewDraft,'decision'>,label:string,hint?:string){
    return <label className="pilot-field" htmlFor={`pilot-${key}`}>{label}{hint&&<small id={`pilot-${key}-hint`}>{hint}</small>}<textarea id={`pilot-${key}`} aria-describedby={hint?`pilot-${key}-hint`:undefined} rows={key.endsWith('References')?2:4} value={draft[key]} maxLength={14_412} onChange={event=>setDraft({...draft,[key]:event.target.value})}/></label>;
  }

  return <main className="decision-pilot">
    <header className="pilot-header"><a href="/" className="pilot-brand">ImpactLens</a><span>Decision usefulness pilot</span><span className="pilot-local">Local reviewer workspace</span></header>
    <div className="pilot-shell">
      <div className="pilot-heading"><div><p className="pilot-kicker">Independent review</p><h1>Review a planning brief</h1></div><button type="button" onClick={download} disabled={!reviews.length}>Export completed responses ({reviews.length}/6)</button></div>
      <section className="pilot-intake" aria-label="Reviewer packet and consent">
        <div><h2>Your reviewer packet</h2><p>Choose the packet supplied by the study organiser. Only your assigned case material is accepted.</p><label className="pilot-file" htmlFor="pilot-upload">Import reviewer packet (.json, max 300 KB)<input id="pilot-upload" type="file" accept=".json,application/json" onChange={importPacket}/></label>{loading&&<p role="status">Verifying packet…</p>}{packet&&<p role="status">Packet verified · Reviewer {packet.reviewerId} · Six cases</p>}</div>
        <div className="pilot-consent"><p>Responses stay in memory in this tab. Nothing is autosaved or submitted. Export before closing or reloading; importing another packet clears all responses. Avoid names, contact details and other personal information.</p>
          <label><input type="checkbox" checked={consent} disabled={!packet||started} onChange={event=>setConsent(event.target.checked)}/>I consent to this pilot and understand that any synthetic dialogue is fictional, not resident evidence.</label>
          <label><input type="checkbox" checked={independent} disabled={!packet||started} onChange={event=>setIndependent(event.target.checked)}/>I will complete the review independently, without AI assistance or other reviewers’ answers.</label>
        </div>
      </section>
      {error&&<p className="pilot-error" role="alert">{error}</p>}
      {packet&&item&&<section className="pilot-case" aria-label={`Case ${index+1} of 6`}>
        <div className="pilot-case-bar"><div><strong>Case {index+1} of 6</strong><span>{reviews.length} saved · {skipped} skipped · {6-processed} not finished</span></div><div className="pilot-time"><span>Active <strong>{formatTime(saved?.activeMilliseconds??active)}</strong></span><span>Elapsed <strong>{formatTime(saved?.elapsedMilliseconds??elapsed)}</strong></span></div><div className="pilot-actions">{!saved&&(!running?<button type="button" className="pilot-primary" disabled={!ready||limitReached} onClick={start}>{started?'Resume review':'Start review'}</button>:<button type="button" onClick={()=>pause('Paused. Resume when you are ready.')}>Pause review</button>)}</div></div>
        <p className="pilot-timer-note">Active time counts while this tab is visible and the review is running. Elapsed time includes source checking, hidden tabs and breaks after Start. Pause before a break; returning does not resume automatically. Two hours maximum per case.</p>
        {pauseReason&&!saved&&<p role="status" className="pilot-notice">{pauseReason}</p>}
        {limitReached&&!saved&&<div className="pilot-notice" role="alert"><strong>This case has expired and cannot be saved.</strong><p>The two-hour elapsed limit was reached. Its response will be omitted, rather than recording a truncated time. Export any completed responses and contact the organiser about the missing case.</p>{index<5&&<button type="button" onClick={next}>Continue without this case</button>}</div>}
        {saved?<div className="pilot-saved" role="status"><h2>Response saved and frozen</h2><p>Case {index+1} is complete. Saved responses cannot be edited in this session.</p>{index<5?<button className="pilot-primary" type="button" onClick={next}>Next case</button>:<><PilotCompletionNotice completed={reviews.length}/><button className="pilot-primary" type="button" onClick={download}>Export responses</button></>}</div>:<>
          {!running?<div className="pilot-paused"><h2>{started?'Review paused':'Ready when you are'}</h2><p>{started?'Case material and editing are hidden while paused. Your draft remains in memory.':'Select both consent statements, then Start review to reveal this case and begin timing.'}</p></div>:<div className="pilot-review-grid"><PilotPacketView item={item} onOpenSource={()=>pause('Paused for source checking. Elapsed time continues; resume when you return.')}/><form className="pilot-response" onSubmit={event=>{event.preventDefault();save();}}><h2>Your response</h2><p className="pilot-muted">One entry per line, up to 12 entries per category; 1,200 characters per entry. Empty categories mean you did not list any items. Do not add blank lines between entries.</p>
            {textField('concerns','Concerns','List the concerns this brief raises for the planning decision.')}
            {textField('concernReferences','Concern reference IDs','One line per concern, in the same order. Separate multiple IDs with commas. Leave that line blank if none.')}
            {textField('stakeholders','Stakeholders','List groups whose needs or perspectives should be considered.')}
            {textField('claims','Packet claims needing verification','Quote or summarise assertions in the packet, not your own conjectures.')}
            {textField('claimReferences','Claim reference IDs','One line per claim, in the same order. Use source or discussion IDs printed in this case; leave blank if none.')}
            {textField('questions','Actionable research questions','What should the team investigate next?')}
            <fieldset><legend>Decision: {item.decisionQuestion}</legend><label><input type="radio" name="pilot-decision" value="supported" checked={draft.decision==='supported'} onChange={()=>setDraft({...draft,decision:'supported'})}/>Yes — evidence is sufficient for the stated decision.</label><label><input type="radio" name="pilot-decision" value="insufficient-evidence" checked={draft.decision==='insufficient-evidence'} onChange={()=>setDraft({...draft,decision:'insufficient-evidence'})}/>No — insufficient evidence for the stated decision.</label></fieldset>
          </form></div>}
          {started&&<div className="pilot-save"><p>Saving freezes this case. You may export after any completed case; an incomplete packet remains valid.</p><button type="button" className="pilot-primary" onClick={save} disabled={!draft.decision||limitReached}>Save and freeze response</button></div>}
        </>}
      </section>}
    </div>
  </main>;
}
