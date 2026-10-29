'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import type {KnowledgeGraph,KnowledgeProvenance} from '../lib/knowledge-graph/contract';
import type {GraphRenderer} from '../lib/knowledge-graph/renderer';
import {entityTypeColour,graphEntityTypes,knowledgeEntityType,knowledgeRelationshipLabel} from '../lib/knowledge-graph/display';
import {searchKnowledgeNodes} from '../lib/knowledge-graph/selectors';
import './knowledge-workspace.css';
type Selection={kind:'node'|'edge';id:string};
const title=(s:string)=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
const value=(v:unknown,key='')=>v===null?'Unknown':typeof v==='number'?/latitude|longitude|year$/i.test(key)?String(v):v.toLocaleString('en-SG',{maximumFractionDigits:3}):String(v);
const provenanceLabel=(p:KnowledgeProvenance)=>({'user-authored':'User supplied','source-backed':'Linked evidence','model-assumption':'Model assumption',calculated:'Calculated result','planning-only':'Planning context','synthetic-exploratory':'Generated · unverified'}[p.kind]);

export default function KnowledgeWorkspace({graph,visible,onReturn,archived=false,resultLabel='Calculated results attached'}:{graph:KnowledgeGraph|null;visible:boolean;onReturn:()=>void;archived?:boolean;resultLabel?:string}){
  const container=useRef<HTMLDivElement>(null),renderer=useRef<GraphRenderer|null>(null),dialog=useRef<HTMLDialogElement>(null),launch=useRef<HTMLButtonElement>(null);
  const [selection,setSelection]=useState<Selection|null>(null),[size,setSize]=useState<'popup'|'expanded'|'full'>('popup');
  const [query,setQuery]=useState(''),[hiddenTypes,setHiddenTypes]=useState<string[]>([]),[status,setStatus]=useState('Preparing relationships…');
  const [edgeLabels,setEdgeLabels]=useState(false);
  const entityTypes=useMemo(()=>graph?graphEntityTypes(graph):[],[graph]);
  const categories=useMemo(()=>entityTypes.filter(t=>!hiddenTypes.includes(t.name)).map(t=>t.name),[entityTypes,hiddenTypes]);
  const graphIdentity=graph?JSON.stringify([graph.scenarioIdentity,graph.executionIdentity??null]):null;
  // Equivalent immutable projections can arrive as fresh objects after a map
  // render. Their renderer, selection, filters and viewport remain intact.
  const graphContents=useMemo(()=>graph?JSON.stringify(graph):null,[graph]);
  const [layoutMs,setLayoutMs]=useState<number|null>(null);
  const latestCategories=useRef(categories);latestCategories.current=categories;
  const latestEdgeLabels=useRef(edgeLabels);latestEdgeLabels.current=edgeLabels;
  const builtGraph=useRef<string|null>(null);
  const selectedGraph=useRef<string|null>(null);
  const currentIdentity=useRef(graphIdentity);
  useEffect(()=>{
    if(currentIdentity.current===graphIdentity)return;
    currentIdentity.current=graphIdentity;selectedGraph.current=null;
    setSelection(null);setSize('popup');setQuery('');setHiddenTypes([]);
  },[graphIdentity]);
  useEffect(()=>{
    if(!graph?.nodes.length){renderer.current?.dispose();renderer.current=null;builtGraph.current=null;setSelection(null);setSize('popup');setStatus('No valid graph is available for the current inputs.');return;}
    if(builtGraph.current===graphContents&&renderer.current){renderer.current.setVisible(visible);if(visible)renderer.current.resize();return;}
    renderer.current?.dispose();renderer.current=null;
    if(!visible||!container.current)return;
    let disposed=false;setStatus('Arranging connected entities…');
    void import('../lib/knowledge-graph/renderer').then(({GraphRenderer})=>{
      if(disposed||!container.current)return;
      const r=new GraphRenderer(container.current,graph,s=>{selectedGraph.current=graphIdentity;setSelection(s);});renderer.current=r;builtGraph.current=graphContents;r.filter(latestCategories.current,'entity-type');r.setEdgeLabels(latestEdgeLabels.current);r.setVisible(true);
      setLayoutMs(r.snapshot().layoutMs);setStatus(`${graph.nodes.length} entities · ${graph.edges.length} relationships`);
    }).catch(()=>{if(!disposed)setStatus('Visual network unavailable. The entity index and details remain usable.');});
    return()=>{disposed=true;};
  },[graphContents,graphIdentity,visible]);
  useEffect(()=>()=>{renderer.current?.dispose();renderer.current=null;},[]);
  useEffect(()=>{if(!container.current||!visible)return;const observer=new ResizeObserver(()=>renderer.current?.resize());observer.observe(container.current);return()=>observer.disconnect();},[visible]);
  useEffect(()=>{if(visible)renderer.current?.resize();},[visible,graph]);
  useEffect(()=>{renderer.current?.filter(categories,'entity-type');},[categories,graph]);
  useEffect(()=>{renderer.current?.setEdgeLabels(edgeLabels);},[edgeLabels]);
  useEffect(()=>{if(size==='full'&&selection&&visible)dialog.current?.showModal();else if(dialog.current?.open)dialog.current.close();},[size,selection,visible]);
  useEffect(()=>{if(!visible)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&size!=='full'){setSelection(null);renderer.current?.select(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[visible,size]);
  const results=useMemo(()=>graph?searchKnowledgeNodes(graph,query).filter(n=>categories.includes(knowledgeEntityType(n))).slice(0,60):[],[graph,query,categories]);
  const node=selectedGraph.current===graphIdentity&&selection?.kind==='node'?graph?.nodes.find(n=>n.id===selection.id):undefined;
  const edge=selectedGraph.current===graphIdentity&&selection?.kind==='edge'?graph?.edges.find(e=>e.id===selection.id):undefined;
  const selected=node??edge,relationships=node?graph?.edges.filter(e=>e.source===node.id||e.target===node.id)??[]:[];
  function focus(id:string){const n=graph?.nodes.find(n=>n.id===id);if(!n)return;const type=knowledgeEntityType(n);if(!categories.includes(type)){renderer.current?.filter([...categories,type],'entity-type');setHiddenTypes(v=>v.filter(t=>t!==type));}selectedGraph.current=graphIdentity;setSelection({kind:'node',id});renderer.current?.focus(id);}
  function close(){setSelection(null);setSize('popup');renderer.current?.select(null);}
  function back(){setSize('expanded');requestAnimationFrame(()=>launch.current?.focus());}
  function details(full:boolean){if(!selected||!graph)return null;return <>
    <span className="kg-provenance">{provenanceLabel(selected.provenance)}</span><p>{selected.description}</p>{'details'in selected&&selected.details&&<p>{selected.details}</p>}
    {node&&<dl className="kg-properties">{Object.entries(node.properties).map(([k,v])=><div key={k}><dt>{title(k)}</dt><dd>{value(v,k)}</dd></div>)}</dl>}
    <section><h3>Provenance</h3><p>{provenanceLabel(selected.provenance)}. {selected.provenance.reference}</p>{selected.provenance.kind==='synthetic-exploratory'&&<p className="kg-hint">This generated claim has not been independently verified. A source link, if present, does not verify the claim.</p>}{selected.provenance.url&&<a target="_blank" rel="noreferrer" href={selected.provenance.url}>Open source reference ↗</a>}</section>
    {node&&node.limitations.length>0&&<section><h3>Assumptions & limitations</h3><ul>{node.limitations.map((s,i)=><li key={i}>{s}</li>)}</ul></section>}
    {edge&&<section><h3>Relationship</h3><p>{knowledgeRelationshipLabel(edge)} · {edge.directed?'Directed':'Undirected'}</p>{[edge.source,edge.target].map(id=><button className="kg-related" key={id} onClick={()=>focus(id)}>{graph.nodes.find(n=>n.id===id)?.label}</button>)}</section>}
    {node&&<section><h3>Connected relationships <span>{relationships.length}</span></h3><p className="kg-hint">Connections describe claims and context. A path does not establish cause and effect; check the provenance of each relationship.</p><div className="kg-relationships">{relationships.map(e=>{const other=graph.nodes.find(n=>n.id===(e.source===node.id?e.target:e.source))!;return <div className="kg-relationship" key={e.id}><button className="kg-related" onClick={()=>focus(other.id)}><span>{e.source===node.id?'↗':'↙'} {knowledgeRelationshipLabel(e)}</span><strong>{other.label}</strong></button><button className="kg-edge-detail" onClick={()=>{selectedGraph.current=graphIdentity;setSelection({kind:'edge',id:e.id});renderer.current?.select(e.id);}} aria-label={`Inspect relationship ${knowledgeRelationshipLabel(e)} ${other.label}`}>Inspect relationship</button>{full&&<><p>{e.description}</p><small>{provenanceLabel(e.provenance)} · {e.provenance.reference}</small></>}</div>;})}</div></section>}
  </>;}
  return <section className="kg-workspace" hidden={!visible} aria-label="Knowledge Graph">
    <header className="kg-header"><div><h1>Knowledge Graph <span>Relationship explorer</span></h1><p>{archived?'Archived experiment snapshot context; unrelated current simulation results are not attached.':'Trace the proposal, the assumptions and the evidence behind each result.'}</p></div><button onClick={onReturn}>Back to Map</button></header>
    <div className="kg-stage"><aside className="kg-explorer" aria-label="Graph exploration">
      <label className="kg-search">Search graph<input type="search" placeholder="Find an entity or source…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <details className="kg-filters" open><summary>Entity types <span>{categories.length}/{entityTypes.length}</span></summary><div>{entityTypes.map(t=><label key={t.name}><input type="checkbox" checked={categories.includes(t.name)} onChange={e=>setHiddenTypes(v=>e.target.checked?v.filter(name=>name!==t.name):[...v,t.name])}/><i style={{background:t.colour}}/><span>{t.name}</span><small>{t.count}</small></label>)}</div></details>
      <div className="kg-entity-index"><h2>{query?'Search results':'Entity index'} <span>{results.length}{results.length===60?'+':''}</span></h2><div className="kg-search-results">{results.map(n=><button key={n.id} onClick={()=>focus(n.id)} aria-pressed={node?.id===n.id}><i style={{background:entityTypeColour(knowledgeEntityType(n))}}/><span>{n.label}<small>{knowledgeEntityType(n)}</small></span></button>)}{!results.length&&<p>No matching entities. Adjust your search or filters.</p>}</div></div>
      <p className="kg-source-note">{archived?'Archived immutable context. Only its linked records are attached; no unrelated current calculation.':graph?.nodes.some(n=>n.id.startsWith('experiment-lab:')&&n.category==='source')?'Historical evidence replay attached. This view does not retrieve documents or execute stakeholder turns.':'Built from current structured inputs. This view does not retrieve documents or execute stakeholder turns.'}</p>
    </aside><div className="kg-canvas-wrap">
      <div className="kg-canvas" ref={container} role="img" aria-label="Interactive relationship network. Use the entity index for keyboard selection." data-layout-ms={layoutMs??''}/>
      <div className="kg-canvas-heading"><span aria-hidden="true">✧</span><div><strong>{graph?.nodes.find(n=>n.category==='scenario'||n.properties.recordType==='run')?.label??'Start an investigation'}</strong><small>{graph?.executionIdentity?resultLabel:'Inputs & planning context'}</small></div></div>
      <div className="kg-map-controls" aria-label="Graph view controls"><button aria-label="Zoom graph in" onClick={()=>renderer.current?.zoomBy(1.3)}>+</button><button aria-label="Zoom graph out" onClick={()=>renderer.current?.zoomBy(1/1.3)}>−</button><button onClick={()=>renderer.current?.fit()} title="Fit all visible entities into the canvas">Fit Graph</button><button onClick={()=>{renderer.current?.resetLayout();setLayoutMs(renderer.current?.snapshot().layoutMs??null);}} title="Recompute entity positions with the force layout">Reset Layout</button><button onClick={()=>renderer.current?.resetView()} title="Reset pan and zoom while keeping entity positions and filters">Reset View</button><button onClick={close}>Reset Focus</button><label className="kg-edge-labels"><input type="checkbox" checked={edgeLabels} onChange={e=>setEdgeLabels(e.target.checked)}/>Edge labels</label></div>
      {(!graph||graph.nodes.length===0)&&<div className="kg-empty"><span>◇</span><h2>Give your question a context.</h2><p>Ask a question or add a drawing on the Map. Relevant inputs, assumptions and calculated results will appear here.</p><button onClick={onReturn}>Open Map</button></div>}
      <div className="kg-status" role="status">{status}<span>Motion settles after release. Drag nodes · Pan background · Scroll to zoom</span></div>
      {selected&&<aside className={`kg-inspector kg-${size==='full'?'expanded':size}`} aria-label={size==='popup'?'Node popup':'Expanded inspector'}><header><div><span>{node?knowledgeEntityType(node):'Relationship'}</span><h2>{node?.label??knowledgeRelationshipLabel(edge!)}</h2></div><button aria-label="Close inspector" onClick={close}>×</button></header>
        {size==='popup'?<><span className="kg-provenance">{provenanceLabel(selected.provenance)}</span><p>{selected.description}</p>{node&&<dl className="kg-properties">{Object.entries(node.properties).slice(0,2).map(([k,v])=><div key={k}><dt>{title(k)}</dt><dd>{value(v,k)}</dd></div>)}</dl>}<p className="kg-hint">{node?`${relationships.length} connected relationships`:'Check provenance before relying on this relationship'}</p><button className="kg-primary" onClick={()=>setSize('expanded')}>Expand inspector</button></>:<><div className="kg-detail-scroll">{details(false)}</div><footer><button onClick={()=>setSize('popup')}>Compact popup</button><button className="kg-primary" ref={launch} onClick={()=>setSize('full')}>Full-window details</button></footer></>}
      </aside>}
    </div></div>
    {graph&&<p className="kg-boundary">{graph.limitations[0]??'Relationships describe model structure and provenance.'} Unknown values remain unknown.</p>}
    <dialog ref={dialog} className="kg-full-dialog" aria-labelledby="kg-full-title" onCancel={e=>{e.preventDefault();back();}}><header><div><span>{node?knowledgeEntityType(node):'Relationship'}</span><h2 id="kg-full-title">{node?.label??(edge?knowledgeRelationshipLabel(edge):'Entity information')}</h2></div><button aria-label="Close full-window details" onClick={back}>×</button></header><div className="kg-full-content">{details(true)}</div><footer><button onClick={back}>Back to inspector</button><span>{archived?'Bound to an archived experiment':'Bound to the current scenario'}</span></footer></dialog>
  </section>;
}
