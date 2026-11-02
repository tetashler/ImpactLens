import type {HybridReview} from '../lib/interventions/explore-contract';

export default function LocationDiscussionContext({context}:{context:HybridReview}) {
  return <section aria-label="Proposed polyclinic discussion context">
    <h2>Fictional discussion about a proposed polyclinic</h2>
    <p>The plotted location is retained for this discussion. The participants are fictional, not measured residents.</p>
    <p className="society-warning">No healthcare outcomes, waiting times or capacity have been calculated.</p>
    {context.locations?.length?<ul>{context.locations.map(location=><li key={location.pointId}>
      <strong>Plotted point {location.pointId}</strong>: {location.coordinate.lat.toFixed(5)}, {location.coordinate.lon.toFixed(5)}.
      {' '}Planning area: {location.planningArea??'Unknown'}. Subzone: {location.subzone??'Unknown'}.
    </li>)}</ul>:<p>Location details are unavailable.</p>}
    {context.limitations.length>0&&<ul>{context.limitations.map((limitation,index)=><li key={index}>{limitation}</li>)}</ul>}
  </section>;
}
