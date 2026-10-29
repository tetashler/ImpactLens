'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {NODE_CATEGORIES,type KnowledgeGraph} from '../lib/knowledge-graph/contract';
import type {GraphRenderer} from '../lib/knowledge-graph/renderer';
import {CATEGORY_COLOURS as colours} from '../lib/knowledge-graph/palette';
import {searchKnowledgeNodes} from '../lib/knowledge-graph/selectors';
import './knowledge-workspace.css';
type Selection={kind:'node'|'edge';id:string};
const title=(s:string)=>s.replace(/([a-z])([A-Z])/g,'$1 $2').replaceAll('-',' ').replace(/\b\w/g,c=>c.toUpperCase());
const value=(v:unknown,key='')=>v===null?'Unknown':typeof v==='number'?/latitude|longitude|year$/i.test(key)?String(v):v.toLocaleString('en-SG',{maximumFractionDigits:3}):String(v);

export default function KnowledgeWorkspace({graph,visible,onReturn,archived=false,resultLabel='Calculated results attached'}:{graph:KnowledgeGraph|null;visible:boolean;onReturn:()=>void;archived?:boolean;resultLabel?:string}){
  const container=useRef<HTMLDivElement>(null),renderer=useRef<GraphRenderer|null>(null),dialog=useRef<HTMLDialogElement>(null),launch=useRef<HTMLButtonElement>(null);
  const [selection,setSelection]=useState<Selection|null>(null),[size,setSize]=useState<'popup'|'expanded'|'full'>('popup');
  const [query,setQuery]=useState(''),[categories,setCategories]=useState<string[]>([...NODE_CATEGORIES]),[status,setStatus]=useState('Preparing relationships…');
  const [layoutMs,setLayoutMs]=useState<number|null>(null);
  const latestCategories=useRef(categories);latestCategories.current=categories;
  const builtGraph=useRef<KnowledgeGraph|null>(null);
  const selectedGraph=useRef<KnowledgeGraph|null>(null);
  useEffect(()=>{
    if(!graph?.nodes.length){renderer.current?.dispose();renderer.current=null;builtGraph.current=null;setSelection(null);setSize('popup');setStatus('No valid graph is available for the current inputs.');return;}
    if(!visible||!container.current)return;
    if(builtGraph.current===graph&&renderer.current){renderer.current.resize();return;}
    renderer.current?.dispose();renderer.current=null;
    let disposed=false;setStatus('Arranging connected entities…');setSelection(null);setSize('popup');
    void import('../lib/knowledge-graph/renderer').then(({GraphRenderer})=>{
      if(disposed||!container.current)return;
      const r=new GraphRenderer(container.current,graph,s=>{selectedGraph.current=graph;setSelection(s);});renderer.current=r;builtGraph.current=graph;r.filter(latestCategories.current);
      setLayoutMs(r.snapshot().layoutMs);setStatus(`${graph.nodes.length} entities · ${graph.edges.length} documented relationships`);
    }).catch(()=>{if(!disposed)setStatus('Visual network unavailable. The entity index and details remain usable.');});
    return()=>{disposed=true;};
  },[graph,visible]);
  useEffect(()=>()=>{renderer.current?.dispose();renderer.current=null;},[]);
  useEffect(()=>{if(!container.current)return;const observer=new ResizeObserver(()=>renderer.current?.resize());observer.observe(container.current);return()=>observer.disconnect();},[]);
  useEffect(()=>{if(visible)renderer.current?.resize();},[visible,graph]);
  useEffect(()=>{renderer.current?.filter(categories);},[categories,graph]);
  useEffect(()=>{if(size==='full'&&selection&&visible)dialog.current?.showModal();else if(dialog.current?.open)dialog.current.close();},[size,selection,visible]);
  useEffect(()=>{if(!visible)return;const key=(e:KeyboardEvent)=>{if(e.key==='Escape'&&size!=='full'){setSelection(null);renderer.current?.select(null);}};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[visible,size]);
  const results=useMemo(()=>graph?searchKnowledgeNodes(graph,query).filter(n=>categories.includes(n.category)).slice(0,60):[],[graph,query,categories]);
  const node=selectedGraph.current===graph&&selection?.kind==='node'?graph?.nodes.find(n=>n.id===selection.id):undefined;
  const edge=selectedGraph.current===graph&&selection?.kind==='edge'?graph?.edges.find(e=>e.id===selection.id):undefined;
  const selected=node??edge,relationships=node?graph?.edges.filter(e=>e.source===node.id||e.target===node.id)??[]:[];
  function focus(id:string){const n=graph?.nodes.find(n=>n.id===id);if(!n)return;if(!categories.includes(n.category)){const next=[...categories,n.category];renderer.current?.filter(next);setCategories(next);}selectedGraph.current=graph;setSelection({kind:'node',id});renderer.current?.focus(id);}
  function close(){setSelection(null);setSize('popup');renderer.current?.select(null);}
  function back(){setSize('expanded');requestAnimationFrame(()=>launch.current?.focus());}
  function details(full:boolean){if(!selected||!graph)return null;return <>
    <span className="kg-provenance">{title(selected.provenance.kind)}</span><p>{selected.description}</p>{'details'in selected&&selected.details&&<p>{selected.details}</p>}
    {node&&<dl className="kg-properties">{Object.entries(node.properties).map(([k,v])=><div key={k}><dt>{title(k)}</dt><dd>{value(v,k)}</dd></div>)}</dl>}
    <section><h3>Provenance</h3><p>{selected.provenance.reference}</p>{selected.provenance.url&&<a target="_blank" rel="noreferrer" href={selected.provenance.url}>Open source reference ↗</a>}</section>
    {node&&node.limitations.length>0&&<section><h3>Assumptions & limitations</h3><ul>{node.limitations.map((s,i)=><li key={i}>{s}</li>)}</ul></section>}
    {edge&&<section><h3>Relationship</h3><p>{title(edge.relationship)} · {edge.directed?'Directed':'Undirected'}</p>{[edge.source,edge.target].map(id=><button className="kg-related" key={id} onClick={()=>focus(id)}>{graph.nodes.find(n=>n.id===id)?.label}</button>)}</section>}
    {node&&<section><h3>Connected relationships <span>{relationships.length}</span></h3><p className="kg-hint">Connections describe data and model lineage. A path is not proof of cause and effect.</p><div className="kg-relationships">{relationships.map(e=>{const other=graph.nodes.find(n=>n.id===(e.source===node.id?e.target:e.source))!;return <div className="kg-relationship" key={e.id}><button className="kg-related" onClick={()=>focus(other.id)}><span>{e.source===node.id?'↗':'↙'} {title(e.relationship)}</span><strong>{other.label}</strong></button><button className="kg-edge-detail" onClick={()=>{setSelection({kind:'edge',id:e.id});renderer.current?.select(e.id);}} aria-label={`Inspect relationship ${e.relationship} ${other.label}`}>Inspect relationship</button>{full&&<><p>{e.description}</p><small>{title(e.provenance.kind)} · {e.provenance.reference}</small></>}</div>;})}</div></section>}
  </>;}
  return <section className="kg-workspace" hidden={!visible} aria-label="Knowledge Graph">
    <header className="kg-header"><div><h1>Knowledge Graph <span>Relationship explorer</span></h1><p>{archived?'Archived experiment snapshot context; unrelated current simulation results are not attached.':'Trace the proposal, the assumptions and the evidence behind each result.'}</p></div><button onClick={onReturn}>Back to Map</button></header>
    <div className="kg-stage"><aside className="kg-explorer" aria-label="Graph exploration">
      <label className="kg-search">Search graph<input type="search" placeholder="Find an entity or source…" value={query} onChange={e=>setQuery(e.target.value)}/></label>
      <details className="kg-filters" open><summary>Entity types <span>{categories.length}/{NODE_CATEGORIES.length}</span></summary><div>{NODE_CATEGORIES.map(c=><label key={c}><input type="checkbox" checked={categories.includes(c)} onChange={e=>setCategories(v=>e.target.checked?[...v,c]:v.filter(x=>x!==c))}/><i style={{background:colours[c]}}/><span>{title(c)}</span><small>{graph?.nodes.filter(n=>n.category===c).length??0}</small></label>)}</div></details>
      <div className="kg-entity-index"><h2>{query?'Search results':'Entity index'} <span>{results.length}{results.length===60?'+':''}</span></h2><div className="kg-search-results">{results.map(n=><button key={n.id} onClick={()=>focus(n.id)} aria-pressed={node?.id===n.id}><i style={{background:colours[n.category]}}/><span>{n.label}<small>{title(n.category)}</small></span></button>)}{!results.length&&<p>No matching entities. Adjust your search or filters.</p>}</div></div>
      <p className="kg-source-note">{archived?'Archived immutable context. Only its linked records are attached; no unrelated current calculation.':graph?.nodes.some(n=>n.id.startsWith('experiment-lab:')&&n.category==='source')?'Historical evidence replay attached. This view does not retrieve documents or execute stakeholder turns.':'Built from current structured inputs. This view does not retrieve documents or execute stakeholder turns.'}</p>
    </aside><div className="kg-canvas-wrap">
      <div className="kg-canvas" ref={container} role="img" aria-label="Interactive relationship network. Use the entity index for keyboard selection." data-layout-ms={layoutMs??''}/>
      <div className="kg-canvas-heading"><span aria-hidden="true">✧</span><div><strong>{graph?.nodes.find(n=>n.category==='scenario'||n.properties.recordType==='run')?.label??'Start an investigation'}</strong><small>{graph?.executionIdentity?resultLabel:'Inputs & planning context'}</small></div></div>
      <div className="kg-map-controls" aria-label="Graph view controls"><button aria-label="Zoom graph in" onClick={()=>renderer.current?.zoomBy(1.3)}>+</button><button aria-label="Zoom graph out" onClick={()=>renderer.current?.zoomBy(1/1.3)}>−</button><button onClick={()=>renderer.current?.fit()}>Fit graph</button><button onClick={()=>{close();setQuery('');setCategories([...NODE_CATEGORIES]);renderer.current?.filter(NODE_CATEGORIES);renderer.current?.fit();}}>Reset view</button><button onClick={close}>Reset focus</button></div>
      {(!graph||graph.nodes.length===0)&&<div className="kg-empty"><span>◇</span><h2>Give your question a context.</h2><p>Ask a question or add a drawing on the Map. Relevant inputs, assumptions and calculated results will appear here.</p><button onClick={onReturn}>Open Map</button></div>}
      <div className="kg-status" role="status">{status}<span>Drag to pan · Scroll or pinch to zoom · Select to inspect</span></div>
      {selected&&<aside className={`kg-inspector kg-${size==='full'?'expanded':size}`} aria-label={size==='popup'?'Node popup':'Expanded inspector'}><header><div><span>{node?title(node.category):'Relationship'}</span><h2>{node?.label??title(edge!.relationship)}</h2></div><button aria-label="Close inspector" onClick={close}>×</button></header>
        {size==='popup'?<><span className="kg-provenance">{title(selected.provenance.kind)}</span><p>{selected.description}</p>{node&&<dl className="kg-properties">{Object.entries(node.properties).slice(0,2).map(([k,v])=><div key={k}><dt>{title(k)}</dt><dd>{value(v,k)}</dd></div>)}</dl>}<p className="kg-hint">{node?`${relationships.length} connected relationships`:'A documented relationship'}</p><button className="kg-primary" onClick={()=>setSize('expanded')}>Expand inspector</button></>:<><div className="kg-detail-scroll">{details(false)}</div><footer><button onClick={()=>setSize('popup')}>Compact popup</button><button className="kg-primary" ref={launch} onClick={()=>setSize('full')}>Full-window details</button></footer></>}
      </aside>}
    </div></div>
    {graph&&<p className="kg-boundary">{graph.limitations[0]??'Relationships describe model structure and provenance.'} Unknown values remain unknown.</p>}
    <dialog ref={dialog} className="kg-full-dialog" aria-labelledby="kg-full-title" onCancel={e=>{e.preventDefault();back();}}><header><div><span>{node?title(node.category):'Relationship'}</span><h2 id="kg-full-title">{node?.label??(edge?title(edge.relationship):'Entity information')}</h2></div><button aria-label="Close full-window details" onClick={back}>×</button></header><div className="kg-full-content">{details(true)}</div><footer><button onClick={back}>Back to inspector</button><span>{archived?'Bound to an archived experiment':'Bound to the current scenario'}</span></footer></dialog>
  </section>;
}
