import type {ResearchBriefing} from '../lib/grounding/briefing';

export default function ScenarioResearchBriefing({research}:{research?:ResearchBriefing}) {
 if(!research)return null;
 return <details className="report-technical-details" aria-label="Scenario research briefing">
  <summary>Research used for this scenario ({research.sources.length} sources)</summary>
  <p>{research.assumption}</p>
  <p>{research.reservedCredits} of {research.budgetCredits} Tavily credits reserved across {research.searches} searches. {research.reportedCredits===null?'Reported usage is unavailable; uncertain reservations are retained.':`Reported usage: ${research.reportedCredits} credits.`}</p>
  {research.sources.length===0&&<p>No usable source excerpts were available for this run. The discussion remains exploratory.</p>}
  {research.sources.map(source=><section key={source.id}>
   <h3><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></h3>
   <p>{source.passage}</p>
   <p>{source.publisher} · Published: {source.publishedAt??'Date unavailable'} · Retrieved: {source.retrievedAt}</p>
  </section>)}
  {research.gaps.length>0&&<><h3>Research gaps and limitations</h3><ul>{research.gaps.map((gap,index)=><li key={index}>{gap}</li>)}</ul></>}
 </details>;
}
