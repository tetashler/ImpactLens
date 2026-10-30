import type {DiscussionSummary} from '../lib/society/discussion-contract';
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
