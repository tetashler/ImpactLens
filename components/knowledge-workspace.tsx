'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {KnowledgeGraph,KnowledgeProvenance,KnowledgeNode,KnowledgeEdge} from '../lib/knowledge-graph/contract';
import type {WorldInspectionV1} from '../lib/world-graph/projection';
import type {PublicExplore} from '../lib/society/public-contract';
import type {GraphRenderer} from '../lib/knowledge-graph/renderer';
import {graphEntityTypes,knowledgeEntityType,knowledgeRelationshipLabel,type GraphAppearance} from '../lib/knowledge-graph/display';
import {searchKnowledgeNodes} from '../lib/knowledge-graph/selectors';
import {visibleGraphNodeIds} from '../lib/knowledge-graph/societal-presentation';
import {nodeSummary,type NodeSummaryContext} from '../lib/knowledge-graph/node-summary';
import {useGraphReportSummary} from './use-graph-report-summary';
import type {GraphSummaryClientState} from './use-automatic-graph-summaries';
import './knowledge-workspace.css';
type Selection={kind:'node'|'edge';id:string};
const title=(s:string)=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
const value=(v:unknown,key='')=>v===null?'Unknown':typeof v==='number'?/latitude|longitude|year$/i.test(key)?String(v):v.toLocaleString('en-SG',{maximumFractionDigits:3}):String(v);
const provenanceLabel=(p:KnowledgeProvenance)=>({'user-authored':'User supplied','source-backed':'Linked evidence','model-assumption':'Model assumption',calculated:'Calculated result','planning-only':'Planning context','synthetic-exploratory':'Generated · unverified'}[p.kind]);

const inspectionLabels:Record<WorldInspectionV1['kind'],string>={
  'model-suggested-entity':'Model-suggested entity · Unverified',
  'fictional-agent':'Fictional stakeholder',
  'proposed-relationship':'Proposed relationship · Unverified',
  'source-reported-relationship':'Source-reported relationship · Not independently corroborated',
  'recorded-interaction':'Recorded fictional interaction',
};
const secondaryProperties=new Set(['recordType','worldRecordVersion','entityId','roleId','runId','planId','scenarioIdentity','configurationIdentity','horizonYears','horizon','discussionSummary','themes','arguments','viewpoints','membershipPolicy','historyPolicy','sharingPolicy','discussionTimeline','classificationCoverage','presentationCategory','presentationPrimary']);
function sourceHref(url:string):string|undefined {try{const parsed=new URL(url);return parsed.protocol==='https:'&&!parsed.username&&!parsed.password?url:undefined;}catch{return undefined;}}
const ageLabel=(age:string)=>age==='90andOver'?'90+':age.replace('_','–');

function matchingSummaryArtifact(graph:KnowledgeGraph,state?:GraphSummaryClientState){
  const artifact=state?.artifact;
  return artifact&&graph.executionIdentity===state?.runId&&artifact.runId===state.runId&&state.snapshotKey&&artifact.snapshotKey===state.snapshotKey?artifact:null;
}

/** The same selected content is used by the popup, expanded and full inspectors. */
export function KnowledgeInspectorContent({graph,node,edge,inspection,savedSummary,nodeSummaries,summaryContext,compact=false,full=false,onFocus=()=>{},onInspect=()=>{}}:{graph:KnowledgeGraph;node?:KnowledgeNode;edge?:KnowledgeEdge;inspection?:WorldInspectionV1;savedSummary?:string;nodeSummaries?:GraphSummaryClientState;summaryContext?:NodeSummaryContext;compact?:boolean;full?:boolean;onFocus?:(id:string)=>void;onInspect?:(id:string)=>void}){
  const selected=node??edge;if(!selected)return null;
  const relationships=node?graph.edges.filter(e=>e.source===node.id||e.target===node.id):[];
  const properties=node?Object.entries(node.properties).filter(([key])=>!secondaryProperties.has(key)):[];
  const demographic=inspection?.demographicContext;
  const sources=inspection?.sourceAttribution?.status==='unverified-candidate'?[]:inspection?.sources??[];
  const interactions=[...(inspection?.interactions??[])].sort((a,b)=>a.turnIndex-b.turnIndex);
  const assumptions=[...new Set([...(inspection?.assumptions??[]),...(node?.limitations??[])])].slice(0,12);
  const automaticState=nodeSummaries?.runId===graph.executionIdentity?nodeSummaries:undefined;
  const automaticSummary=matchingSummaryArtifact(graph,nodeSummaries)?.summaries.find(item=>item.nodeId===node?.id)?.summary.trim();
  const summary=node?(nodeSummaries?automaticSummary:savedSummary?.trim()||nodeSummary(node,summaryContext)):null;
  return <>
    {node&&nodeSummaries&&<><h3 className="kg-summary-heading">AI summary</h3>{summary?<p className="kg-node-summary">{summary}</p>:<p className="kg-hint" role="status">{automaticState?.phase==='error'?'This node’s summary is waiting for preparation to resume.':automaticState?.phase==='complete'?'No AI summary is available for this node.':automaticState?.phase==='checking'||automaticState?.phase==='generating'?'This node’s AI summary is being prepared. You can keep exploring.':'This node’s AI summary will be prepared after the simulation finishes.'}</p>}{automaticState?.phase==='error'&&<div role="alert"><p className="kg-hint">{automaticState.error||'AI summary preparation stopped.'}</p><button onClick={automaticState.retry}>Retry summaries</button></div>}</>}
    {summary&&!nodeSummaries&&<><h3 className="kg-summary-heading">{savedSummary&&['communication-platform','fictional-messaging-group'].includes(String(node?.properties.recordType))?'Discussion themes':'What this node means'}</h3><p className="kg-node-summary">{summary}</p></>}
    {node&&node.description.trim()&&!summary?.includes(node.description.trim())&&node.properties.discussionSummary!==node.description&&<details className="kg-original-description"><summary>Original description</summary><p>{node.description}</p></details>}
    {!node&&<p>{inspection?.kind==='recorded-interaction'?'Recorded fictional interaction; dialogue is retained server-side.':selected.description}</p>}
    {edge&&<section><h3>Relationship</h3><p>{knowledgeRelationshipLabel(edge)} · {edge.directed?'Directed':'Undirected'}</p><dl className="kg-properties"><div><dt>Source</dt><dd><button className="kg-related" onClick={()=>onFocus(edge.source)}>{graph.nodes.find(n=>n.id===edge.source)?.label??'Unknown entity'}</button></dd></div><div><dt>Target</dt><dd><button className="kg-related" onClick={()=>onFocus(edge.target)}>{graph.nodes.find(n=>n.id===edge.target)?.label??'Unknown entity'}</button></dd></div></dl></section>}
    <details className="kg-activity-details"><summary>Activity and technical details</summary>
    <span className="kg-provenance">{inspection?inspectionLabels[inspection.kind]:provenanceLabel(selected.provenance)}</span>
    {node&&typeof node.properties.discussionSummary==='string'&&<section aria-label="Recorded communication summary"><h3>Recorded discussion summary</h3><p>{node.properties.discussionSummary}</p><p><strong>Tagged topics:</strong> {String(node.properties.themes??'Unavailable')}</p><p>{String(node.properties.arguments??'Argument detail unavailable')}</p>{node.properties.classificationCoverage&&<p>{String(node.properties.classificationCoverage)}</p>}{node.properties.discussionTimeline&&<p>{String(node.properties.discussionTimeline)}</p>}{node.properties.viewpoints&&<p>{String(node.properties.viewpoints)}</p>}{node.properties.membershipPolicy&&<p>{String(node.properties.membershipPolicy)}. {String(node.properties.historyPolicy)}. {String(node.properties.sharingPolicy)}.</p>}</section>}
    {inspection?.sourceAttribution?.status==='unverified-candidate'&&<p className="kg-hint">Unverified source candidate. The proposed association is withheld from evidence because a literal entity mention or relationship statement was not established. The source remains in the retrieval snapshot.</p>}
    {node&&inspection&&<dl className="kg-properties"><div><dt>Entity type</dt><dd>{knowledgeEntityType(node)}</dd></div><div><dt>Affiliation (model-proposed)</dt><dd>{inspection.affiliation??'Unknown'}</dd></div></dl>}
    {demographic&&<section className="kg-demographics"><h3>Historical demographic context</h3>{demographic.status==='unavailable'?<p className="kg-hint">{demographic.limitation}</p>:<>
      <p>{demographic.national.name} resident aggregates · Census {demographic.referenceYear}</p>
      <p>Leaf-cell sum: <strong>{value(demographic.national.leafPopulation)}</strong>. Separately published national total: {value(demographic.publishedNationalTotal)}; difference: {value(demographic.leafMinusPublished)}.</p>
      {demographic.planningArea&&<p>{demographic.planningArea.name}: {value(demographic.planningArea.leafPopulation)} in detailed leaf cells.</p>}
      <p className="kg-hint">{demographic.grain}</p><a href={sourceHref(demographic.sourceUrl)} target="_blank" rel="noreferrer">Census {demographic.referenceYear} source</a><details className="kg-demographic-profile"><summary>Age-group counts</summary><table><thead><tr><th scope="col">Age group</th><th scope="col">National residents</th>{demographic.planningArea&&<th scope="col">{demographic.planningArea.name} residents</th>}</tr></thead><tbody>{Object.entries(demographic.national.ageGroups).map(([age,count])=><tr key={age}><th scope="row">{ageLabel(age)}</th><td>{value(count)}</td>{demographic.planningArea&&<td>{value(demographic.planningArea.ageGroups[age as keyof typeof demographic.planningArea.ageGroups])}</td>}</tr>)}</tbody></table></details>
      <p className="kg-hint">{demographic.limitation}</p>
    </>}</section>}
      {node?.details&&<p>{node.details}</p>}
      {properties.length>0&&<dl className="kg-properties">{properties.map(([key,v])=><div key={key}><dt>{title(key)}</dt><dd>{value(v,key)}</dd></div>)}</dl>}
      {interactions.length>0&&<details className="kg-interaction-details"><summary>Recorded interactions <span>{interactions.length}</span></summary><p className="kg-hint">Accepted action metadata in logical turn order; conversation content is retained server-side.</p><ol>{interactions.map(event=><li key={event.id}><p><strong>{graph.nodes.find(n=>n.properties.roleId===event.roleId)?.label??'Fictional participant'}</strong> · {title(event.type)}</p><p>Accepted action: {title(event.type)}. Conversation content is withheld.</p><small>Event {event.id} · Turn {event.turnIndex+1} · Round {event.round}</small>{event.previousEventIds.length>0&&<p className="kg-hint">Responds to {event.previousEventIds.join(', ')}</p>}</li>)}</ol></details>}
      <details className="kg-provenance-details"><summary>Provenance</summary><p className="kg-hint">{node?'Node':'Relationship'} ID: <code>{selected.id}</code></p><p>{provenanceLabel(selected.provenance)}. {selected.provenance.reference}</p>{selected.provenance.kind==='synthetic-exploratory'&&<p className="kg-hint">This generated claim has not been independently verified. A source passage does not verify every proposed attribute or relationship.</p>}{selected.provenance.url&&sourceHref(selected.provenance.url)&&<a target="_blank" rel="noreferrer" href={sourceHref(selected.provenance.url)}>Open source reference ↗</a>}</details>
      {compact&&inspection&&<p className="kg-hint">{sources.length} source passage{sources.length===1?'':'s'} available in the expanded inspector.</p>}
    </details>
      {!compact&&inspection&&<details className="kg-source-details"><summary>Source passages <span>{sources.length}</span></summary>{sources.length?sources.map((source,index)=><section key={`${source.url}:${index}`}><h3>{sourceHref(source.url)?<a href={sourceHref(source.url)} target="_blank" rel="noreferrer">{source.title}</a>:source.title}</h3><p className="kg-source-url">{source.url}</p><dl className="kg-properties"><div><dt>Publisher</dt><dd>{source.publisher}</dd></div><div><dt>Publication date</dt><dd>{source.publishedAt??'Unknown'}</dd></div><div><dt>Retrieved</dt><dd>{source.retrievedAt}</dd></div></dl><blockquote>{source.quote}</blockquote><p className="kg-hint">{source.limitation}</p></section>):<p className="kg-hint">No linked source passages are available for this suggestion.</p>}</details>}
      {assumptions.length>0&&<details className="kg-assumptions"><summary>Assumptions and limitations <span>{assumptions.length}</span></summary><ul>{assumptions.map((assumption,index)=><li key={index}>{assumption}</li>)}</ul></details>}
    {!compact&&<>
      {node&&<section><h3>Connected relationships <span>{relationships.length}</span></h3><p className="kg-hint">Connections describe claims and context. A path does not establish cause and effect.</p><div className="kg-relationships">{relationships.map(relationship=>{const other=graph.nodes.find(n=>n.id===(relationship.source===node.id?relationship.target:relationship.source));return <div className="kg-relationship" key={relationship.id}><button className="kg-related" onClick={()=>onFocus(other?.id??node.id)}><span>{relationship.source===node.id?'↗':'↙'} {knowledgeRelationshipLabel(relationship)}</span><strong>{other?.label??'Unknown entity'}</strong></button><button className="kg-edge-detail" onClick={()=>onInspect(relationship.id)} aria-label={`Inspect relationship ${knowledgeRelationshipLabel(relationship)} ${other?.label??'Unknown entity'}`}>Inspect relationship</button>{full&&<><p>{relationship.description}</p><small>{provenanceLabel(relationship.provenance)}</small></>}</div>;})}</div></section>}
    </>}
  </>;
}

export default function KnowledgeWorkspace({graph,visible,onReturn,archived=false,resultLabel='World entities and fictional stakeholders',inspections,emptyReason,focusAgentId,onMapAgent,reportRun,nodeSummaries,active=true,appearance='dark'}:{reportRun?:PublicExplore|null;nodeSummaries?:GraphSummaryClientState;active?:boolean;focusAgentId?:string|null;onMapAgent?:(id:string)=>void;graph:KnowledgeGraph|null;visible:boolean;onReturn:()=>void;archived?:boolean;resultLabel?:string;inspections?:Record<string,WorldInspectionV1>;emptyReason?:string;appearance?:GraphAppearance}){
  const matchingRun=reportRun&&graph?.executionIdentity===reportRun.runId&&graph.scenarioIdentity===reportRun.graph.scenarioIdentity?reportRun:null;
  const reportSummary=useGraphReportSummary(matchingRun,active&&!nodeSummaries,graph);
  const automaticState=nodeSummaries&&matchingRun&&nodeSummaries.runId===matchingRun.runId?nodeSummaries:undefined;
  const inspectorSummaries=nodeSummaries?(automaticState??{...nodeSummaries,runId:'',artifact:null,phase:'idle' as const,error:''}):undefined;
  const automaticArtifact=graph?matchingSummaryArtifact(graph,automaticState):null;
  const summarizedNodes=new Set(automaticArtifact?.summaries.filter(item=>graph?.nodes.some(node=>node.id===item.nodeId)).map(item=>item.nodeId)).size;
  const summaryContext:NodeSummaryContext|undefined=matchingRun?{question:matchingRun.question,socialCalls:matchingRun.society?.usage.calls,initialStatements:matchingRun.initialActions.length}:undefined;
  const container=useRef<HTMLDivElement>(null),renderer=useRef<GraphRenderer|null>(null),dialog=useRef<HTMLDialogElement>(null),launch=useRef<HTMLButtonElement>(null);
  const [selection,setSelection]=useState<Selection|null>(null),[size,setSize]=useState<'popup'|'expanded'|'full'>('popup');
  const [query,setQuery]=useState(''),[explorerPanel,setExplorerPanel]=useState<'types'|'index'>('index'),[hiddenTypes,setHiddenTypes]=useState<string[]>([]),[status,setStatus]=useState('Preparing relationships…');
  const [edgeLabels,setEdgeLabels]=useState(false);
  const entityTypes=useMemo(()=>graph?graphEntityTypes(graph,appearance):[],[graph,appearance]);
  const typeColours=useMemo(()=>new Map(entityTypes.map(type=>[type.name,type.colour])),[entityTypes]);
  const categories=useMemo(()=>entityTypes.filter(t=>!hiddenTypes.includes(t.name)).map(t=>t.name),[entityTypes,hiddenTypes]);
  const graphIdentity=graph?JSON.stringify([graph.scenarioIdentity,graph.executionIdentity??null]):null;
  // Equivalent immutable projections can arrive as fresh objects after a map
  // render. Their renderer, selection, filters and viewport remain intact.
  const graphContents=useMemo(()=>graph?JSON.stringify(graph):null,[graph]);
  const [layoutMs,setLayoutMs]=useState<number|null>(null);
  const latestCategories=useRef(categories);latestCategories.current=categories;
  const latestEdgeLabels=useRef(edgeLabels);latestEdgeLabels.current=edgeLabels;
  const builtGraph=useRef<string|null>(null);
  const builtAppearance=useRef<GraphAppearance|null>(null);
  const selectedGraph=useRef<string|null>(null);
  const currentIdentity=useRef(graphIdentity);
  const presentationIds=useMemo(()=>{
    if(!graph)return new Set<string>();
    const active=selectedGraph.current===graphIdentity?selection:null;
    const edge=active?.kind==='edge'?graph.edges.find(e=>e.id===active.id):undefined;
    return visibleGraphNodeIds(graph,{query,focusedNodeId:active?.kind==='node'?active.id:null,revealedNodeIds:edge?[edge.source,edge.target]:[]});
  },[graph,graphIdentity,query,selection]);
  const latestPresentation=useRef(presentationIds);latestPresentation.current=presentationIds;
  const searchMatchIds=useMemo(()=>new Set(graph&&query.trim()?searchKnowledgeNodes(graph,query).sort((a,b)=>a.id.localeCompare(b.id)).slice(0,24).map(n=>n.id):[]),[graph,query]);
  const latestSearchMatches=useRef(searchMatchIds);latestSearchMatches.current=searchMatchIds;
  const latestSelection=useRef(selection);latestSelection.current=selection;
  useEffect(()=>{
    if(currentIdentity.current===graphIdentity)return;
    currentIdentity.current=graphIdentity;selectedGraph.current=null;
    setSelection(null);setSize('popup');setQuery('');setHiddenTypes([]);
  },[graphIdentity]);
  useEffect(()=>{
    if(!graph?.nodes.length){renderer.current?.dispose();renderer.current=null;builtGraph.current=null;setSelection(null);setSize('popup');setStatus('No valid graph is available for the current inputs.');return;}
    if(builtGraph.current===graphContents&&builtAppearance.current===appearance&&renderer.current){renderer.current.setVisible(visible);if(visible)renderer.current.resize();return;}
    renderer.current?.dispose();renderer.current=null;
    if(!visible||!container.current)return;
    let disposed=false;setStatus('Arranging connected entities…');
    void import('../lib/knowledge-graph/renderer').then(({GraphRenderer})=>{
      if(disposed||!container.current)return;
      const r=new GraphRenderer(container.current,graph,s=>{selectedGraph.current=graphIdentity;setSelection(s);},appearance);renderer.current=r;builtGraph.current=graphContents;builtAppearance.current=appearance;r.setPresentationVisibility(latestPresentation.current);r.filter(latestCategories.current,'entity-type');r.setEdgeLabels(latestEdgeLabels.current);r.setSearchMatches(latestSearchMatches.current);r.setVisible(true);
      if(selectedGraph.current===graphIdentity&&latestSelection.current)r.select(latestSelection.current.id);
      setLayoutMs(r.snapshot().layoutMs);setStatus(`${graph.nodes.length} entities · ${graph.edges.length} relationships`);
    }).catch(()=>{if(!disposed)setStatus('Visual network unavailable. The entity index and details remain usable.');});
    return()=>{disposed=true;};
  },[graphContents,graphIdentity,visible,appearance]);
  useEffect(()=>()=>{renderer.current?.dispose();renderer.current=null;},[]);
  useEffect(()=>{if(!container.current||!visible)return;const observer=new ResizeObserver(()=>renderer.current?.resize());observer.observe(container.current);return()=>observer.disconnect();},[visible]);
  useEffect(()=>{if(visible)renderer.current?.resize();},[visible,graph]);
  useEffect(()=>{renderer.current?.filter(categories,'entity-type');},[categories,graph]);
  useEffect(()=>{renderer.current?.setPresentationVisibility(presentationIds);},[presentationIds]);
  useEffect(()=>{renderer.current?.setSearchMatches(searchMatchIds);},[searchMatchIds]);
  useEffect(()=>{renderer.current?.setEdgeLabels(edgeLabels);},[edgeLabels]);
  useEffect(()=>{if(size==='full'&&selection&&visible)dialog.current?.showModal();else if(dialog.current?.open)dialog.current.close();},[size,selection,visible]);
  useEffect(()=>{if(!visible)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&size!=='full'){setSelection(null);renderer.current?.select(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[visible,size]);
  // Search includes safe background candidates and filtered types. Selecting a
  // result restores its type and reveals its immediate context in the same core.
  const indexCandidates=useMemo(()=>graph?searchKnowledgeNodes(graph,query).filter(n=>query.trim()||categories.includes(knowledgeEntityType(n))&&n.properties.presentationPrimary!==false):[],[graph,query,categories]);
  const results=indexCandidates.slice(0,60);
  const backgroundPeople=graph?.nodes.filter(n=>n.properties.presentationCategory==='person'&&n.properties.presentationPrimary===false).length??0;
  const hasHierarchy=graph?.nodes.some(n=>typeof n.properties.presentationCategory==='string');
  const visibleNodes=graph?.nodes.filter(n=>presentationIds.has(n.id)&&categories.includes(knowledgeEntityType(n)))??[];
  const visibleIds=new Set(visibleNodes.map(n=>n.id));
  const visibleEdges=graph?.edges.filter(e=>visibleIds.has(e.source)&&visibleIds.has(e.target)).length??0;
  const node=selectedGraph.current===graphIdentity&&selection?.kind==='node'?graph?.nodes.find(n=>n.id===selection.id):undefined;
  const edge=selectedGraph.current===graphIdentity&&selection?.kind==='edge'?graph?.edges.find(e=>e.id===selection.id):undefined;
  const selected=node??edge,relationships=node?graph?.edges.filter(e=>e.source===node.id||e.target===node.id)??[]:[];
  function focus(id:string){const n=graph?.nodes.find(n=>n.id===id);if(!n||!graph)return;renderer.current?.setPresentationVisibility(visibleGraphNodeIds(graph,{query,focusedNodeId:id}));const type=knowledgeEntityType(n);if(!categories.includes(type)){renderer.current?.filter([...categories,type],'entity-type');setHiddenTypes(v=>v.filter(t=>t!==type));}selectedGraph.current=graphIdentity;setSelection({kind:'node',id});renderer.current?.focus(id);}
  useEffect(()=>{if(visible&&focusAgentId&&renderer.current&&graph?.nodes.some(n=>n.id===focusAgentId))focus(focusAgentId);},[focusAgentId,visible,layoutMs,graphIdentity]);
  function close(){setSelection(null);setSize('popup');renderer.current?.select(null);}
  function back(){setSize('expanded');requestAnimationFrame(()=>launch.current?.focus());}
  const inspectEdge=(id:string)=>{selectedGraph.current=graphIdentity;setSelection({kind:'edge',id});renderer.current?.select(id);};
  function details(full:boolean,compact=false){if(!selected||!graph)return null;return <>{node&&typeof node.properties.agentId==='string'&&<div className="kg-social-links">{onMapAgent&&<button onClick={()=>onMapAgent(node.properties.agentId as string)}>Open agent on Map</button>}</div>}<KnowledgeInspectorContent graph={graph} node={node} edge={edge} inspection={inspections?.[selected.id]} savedSummary={reportSummary?.nodeSummaries?.find(item=>item.nodeId===node?.id)?.summary} nodeSummaries={inspectorSummaries} summaryContext={summaryContext} compact={compact} full={full} onFocus={focus} onInspect={inspectEdge}/></>;}
  return <section className="kg-workspace" hidden={!visible} aria-label="Knowledge Graph">
    <header className="kg-header"><div><h1>Knowledge Graph <span>Relationship explorer</span></h1><p>{archived?'Archived experiment snapshot context; unrelated current simulation results are not attached.':'Explore the entities and interactions in this scenario.'}</p></div><button onClick={onReturn}>Back to Map</button></header>
    <div className="kg-stage"><aside className="kg-explorer" aria-label="Graph exploration" data-panel={query?'index':explorerPanel}>
      <label className="kg-search">Search graph<input type="search" placeholder="Find an entity, role or person…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      {automaticState&&<section aria-label="AI summary progress"><p className="kg-hint" role="status">{automaticState.phase==='idle'?'AI summaries will be prepared automatically after the simulation finishes.':automaticState.phase==='checking'?'Checking saved AI summaries…':`${automaticState.phase==='generating'?'Preparing AI summaries':'AI summaries'}: ${summarizedNodes} of ${graph?.nodes.length??0} ready.`}</p>{automaticState.phase==='error'&&<div role="alert"><p className="kg-hint">{automaticState.error||'AI summary preparation stopped.'}</p><button onClick={automaticState.retry}>Retry summaries</button></div>}</section>}
      <div className="kg-explorer-tabs" role="group" aria-label="Explorer view"><button type="button" aria-pressed={query?true:explorerPanel==='index'} onClick={()=>setExplorerPanel('index')}>Entities</button><button type="button" aria-pressed={!query&&explorerPanel==='types'} onClick={()=>{setQuery('');setExplorerPanel('types');}}>Types</button></div>
      {backgroundPeople>0&&<p className="kg-discovery-note">{backgroundPeople} background {backgroundPeople===1?'person':'people'} available through search or connected relationships.</p>}
      <details className="kg-filters" open><summary>Entity types <span>{categories.length}/{entityTypes.length}</span></summary><div>{entityTypes.map(t=><label key={t.name}><input type="checkbox" checked={categories.includes(t.name)} onChange={e=>setHiddenTypes(v=>e.target.checked?v.filter(name=>name!==t.name):[...v,t.name])}/><i style={{background:t.colour}}/><span>{t.name}</span><small>{t.count}</small></label>)}</div></details>
      <div className="kg-entity-index"><h2>{query?'Search results':'Entity index'} <span>{indexCandidates.length}</span></h2><div className="kg-search-results">{results.map(n=><button key={n.id} data-entity-id={n.id} onClick={()=>focus(n.id)} aria-pressed={node?.id===n.id}><i style={{background:typeColours.get(knowledgeEntityType(n))}}/><span>{n.label}<small>{knowledgeEntityType(n)}</small>{query&&n.properties.presentationPrimary===false&&<small className="kg-result-context">Reveal person and connections</small>}{query&&!categories.includes(knowledgeEntityType(n))&&<small className="kg-result-context">Hidden by type filter · select to reveal</small>}</span></button>)}{!results.length&&<p>No matching entities. Adjust your search or filters.</p>}{indexCandidates.length>60&&<p className="kg-index-note">Showing 60 of {indexCandidates.length}. Refine your search to find a specific entity.</p>}</div></div>
      {!archived&&<p className="kg-source-note">{graph?.nodes.some(n=>n.id.startsWith('experiment-lab:')&&n.category==='source')?'Historical evidence replay attached. This view does not retrieve documents or execute stakeholder turns.':'Built from current structured inputs. This view does not retrieve documents or execute stakeholder turns.'}</p>}
    </aside><div className="kg-canvas-wrap">
      <div className="kg-canvas" ref={container} role="img" aria-label="Interactive relationship network. Use the entity index for keyboard selection." data-layout-ms={layoutMs??''}/>
      <div className="kg-canvas-heading"><div><strong>World entities</strong><small>{graph?.executionIdentity?resultLabel:'No generated world available'}</small></div></div>
      {hasHierarchy&&<div className="kg-presentation-key" aria-label="Graph node shapes"><span><i className="kg-shape-entity"/>Entity</span><span><i className="kg-shape-role"/>Role</span><span><i className="kg-shape-person"/>Person</span><span><i className="kg-shape-aggregate"/>Aggregate</span></div>}
      <div className="kg-map-controls" aria-label="Graph view controls"><button onClick={()=>renderer.current?.fit()} title="Fit all visible entities into the canvas">Fit Graph</button><button onClick={()=>{renderer.current?.resetLayout();setLayoutMs(renderer.current?.snapshot().layoutMs??null);}} title="Recompute entity positions with the force layout">Reset Layout</button><label className="kg-edge-labels"><input type="checkbox" checked={edgeLabels} onChange={e=>setEdgeLabels(e.target.checked)}/>Edge labels</label></div>
      {(!graph||graph.nodes.length===0)&&<div className="kg-empty"><h2>World entities are not available</h2><p>{emptyReason??'Choose Explore on the Map to generate a scenario world.'}</p><button onClick={onReturn}>Back to Map</button></div>}
      <div className="kg-status" role="status">{layoutMs===null?status:`${visibleNodes.length} of ${graph?.nodes.length??0} entities · ${visibleEdges} relationships shown`}<span>Motion settles after release. Drag nodes · Pan background · Scroll to zoom</span></div>
      {selected&&<aside className={`kg-inspector kg-${size==='full'?'expanded':size}`} aria-label={size==='popup'?'Node popup':'Expanded inspector'}><header><div><span>{node?knowledgeEntityType(node):'Relationship'}</span><h2>{node?.label??knowledgeRelationshipLabel(edge!)}</h2></div><button aria-label="Close inspector" onClick={close}>×</button></header>
        {size==='popup'?<>{details(false,true)}<button className="kg-primary" onClick={()=>setSize('expanded')}>Expand inspector</button></>:<><div className="kg-detail-scroll">{details(false)}</div><footer><button onClick={()=>setSize('popup')}>Compact popup</button><button className="kg-primary" ref={launch} onClick={()=>setSize('full')}>Full-window details</button></footer></>}
      </aside>}
    </div></div>
    {graph&&<p className="kg-boundary">{graph.limitations[0]??'Relationships describe model structure and provenance.'} Unknown values remain unknown.</p>}
    <dialog ref={dialog} className="kg-full-dialog" aria-labelledby="kg-full-title" onCancel={e=>{e.preventDefault();back();}}><header><div><span>{node?knowledgeEntityType(node):'Relationship'}</span><h2 id="kg-full-title">{node?.label??(edge?knowledgeRelationshipLabel(edge):'Entity information')}</h2></div><button aria-label="Close full-window details" onClick={back}>×</button></header><div className="kg-full-content">{details(true)}</div><footer><button onClick={back}>Back to inspector</button><span>{archived?'Bound to an archived experiment':'Bound to the current scenario'}</span></footer></dialog>
  </section>;
}
