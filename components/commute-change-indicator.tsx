import {commuteTone} from './colour-semantics';

/** Displays an existing server estimate. The scale is a visual domain, not a new calculation. */
export default function CommuteChangeIndicator({minutesSaved}:{minutesSaved:number|null}) {
 const tone=commuteTone(minutesSaved);
 const format=(value:number)=>value.toLocaleString('en-SG',{maximumFractionDigits:2});
 if(tone==='unknown')return <figure className="commute-change" data-journey-tone="unknown"><figcaption>Mean modelled commute change · comparable rail subset</figcaption><p>Not assessed</p></figure>;
 const value=minutesSaved!,limit=Math.max(5,Math.ceil(Math.abs(value)/5)*5),width=Math.abs(value)/limit*50;
 return <figure className="commute-change" data-journey-tone={tone}>
  <figcaption>Mean modelled commute change · comparable rail subset</figcaption>
  <p>{value===0?'No estimated time change':`${format(Math.abs(value))} minutes ${value>0?'saved':'added'}`}</p>
  <div className="commute-change-track" aria-hidden="true"><span className="commute-change-mark" style={{left:`${value<0?50-width:50}%`,width:`${width}%`}}/><span className="commute-change-zero"/></div>
  <div className="commute-change-axis"><span>{format(limit)} min added</span><span>0</span><span>{format(limit)} min saved</span></div>
 </figure>;
}
