'use client';

export default function KnowledgeWorkspace({question,pointCount,lineCount,onReturn}:{question:string;pointCount:number;lineCount:number;onReturn:()=>void}){
  return <section className="knowledge-workspace" aria-labelledby="knowledge-title">
    <div className="knowledge-context"><span>Current scenario</span><p>{question||'No question yet. Start with a question or draw in General.'}</p><p>{pointCount} user-drawn points · {lineCount} user-drawn lines preserved</p></div>
    <div className="knowledge-empty"><span className="knowledge-symbol" aria-hidden="true">◇</span><h1 id="knowledge-title">Knowledge Graph</h1><h2>Evidence needs connections.</h2><p>No source-backed entity graph has been constructed for this scenario. Your question, drawing and valid calculations are kept in General.</p><span className="knowledge-status">Graph exploration planned for Phase 7G</span><button type="button" onClick={onReturn}>Return to General</button></div>
    <div className="knowledge-roadmap"><h3>What the future graph will support</h3><ul><li>Search and filter source-backed entities</li><li>Pan and zoom through relationships</li><li>Inspect a node, its neighbours and provenance</li><li>Expand details into an inspector or full window</li></ul><p>This view contains no generated entities, relationships, polling results or executed stakeholder agents.</p></div>
  </section>;
}
