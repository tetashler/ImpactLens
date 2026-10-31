import type {DiscussionSummary} from '../lib/society/discussion-contract';
import type {SocietyClockSummary} from '../lib/society/public-contract';

export function DailyChronology({clock}:{clock?:SocietyClockSummary}){
 if(!clock)return null;
 const time=`Day ${clock.day} ${String(clock.hour).padStart(2,'0')}:${String(clock.minute).padStart(2,'0')}`;
 return <section aria-label="Daily fictional chronology"><h2>Daily fictional chronology</h2>
  <p>{time} · {clock.timeZone} · {clock.elapsedMinutes} simulated minutes since {clock.anchor}. These are fictional scenario days, separate from the actual execution date.</p>
  <p>{clock.availabilityAssumption}</p>
  <div className="society-table-wrap"><table><caption>Whole-run activity by fictional calendar day, shared with Graph inspectors</caption><thead><tr><th>Day</th><th>Authored items (public / private)</th><th>Model / rule authored</th><th>Classified decisions</th><th>Follow-ups</th><th>Nonzero state changes</th><th>Opportunities / accepted</th><th>Participating agents</th></tr></thead><tbody>{clock.daily.map(d=><tr key={d.day}><th>Day {d.day}</th><td>{d.authoredItems} ({d.publicAuthoredItems} / {d.privateAuthoredItems})</td><td>{d.modelAuthoredItems} / {d.ruleAuthoredItems}</td><td>{d.classifiedDecisions}</td><td>{d.followups}</td><td>{d.positionChanges}</td><td>{d.opportunities} / {d.acceptedDecisions}</td><td>{d.participatingAgents}</td></tr>)}</tbody></table></div>
  <p>Participating agents count distinct agents with accepted decisions each day, including accepted inactivity. Initial accepted stakeholder seeds have their own provenance and are included in authored totals. Quiet periods and rest assumptions are not measured human behaviour.</p>
 </section>;
}
/** Render only the approved aggregate DTO; never accept an internal world/fact pack. */
export default function DiscussionDetails({facts}:{facts?:DiscussionSummary}){
 if(!facts)return <p>Detailed classifications are unavailable for this historical summary.</p>;
 return <section aria-label="Discussion development">
  <p>{facts.classifiedDecisions} classified model-authored decisions out of {facts.modelAuthoredDecisions} model-authored decisions; {facts.unclassifiedItems} of {facts.authoredItems} authored items have no interpreted argument. Counts describe content, not votes or independent people.</p>
  {facts.stakeholderCategories.length>0&&<p>Recorded fictional stakeholder categories: {facts.stakeholderCategories.join(', ')}.</p>}
  {facts.topicCoverage.length>0&&<p>Explicit topic classifications: {facts.topicCoverage.map(t=>`${t.label} (${t.decisions} decisions)`).join('; ')}.</p>}
  <p>{facts.followups} recorded follow-ups, including {facts.peerReplies} model-to-model replies. Maximum recorded thread depth: {facts.maxDepth}.</p>
  <p>{facts.openIssues} explicitly tagged open issues; {facts.resolvedIssues} author-reported resolutions; {facts.withdrawnIssues} withdrawals. A condition or concern is not an inferred commitment. Missing issue tags mean outcomes remain unknown.</p>
  <table><caption>Development over simulated time</caption><thead><tr><th>Period</th><th>Authored items</th><th>Classified decisions</th><th>Follow-ups</th><th>Nonzero state changes</th></tr></thead><tbody>{facts.timeline.map(t=><tr key={t.period}><th>{t.period}</th><td>{t.authoredItems}</td><td>{t.classifiedDecisions}</td><td>{t.followups}</td><td>{t.positionChanges}</td></tr>)}</tbody></table>
 </section>;
}
