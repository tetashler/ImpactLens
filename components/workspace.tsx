'use client';
import {planConfirmedAnchor} from '../lib/plots/anchor';
import type {HybridExploreOptions} from '../lib/interventions/explore-contract';

import {useSociety} from './use-society';
import {useAutomaticReports} from './use-automatic-reports';
import {useAutomaticGraphSummaries} from './use-automatic-graph-summaries';
import CommunicationReport,{CommunicationStatus} from './communication-report';
import {isArchivedGraphView} from '../lib/knowledge-graph/display';
import {startQuestionWork} from '../lib/dynamic-scenarios/client';
import {projectPrimaryWorldGraph,legacyWorldEntities,worldRunLabel,type WorldInspectionV1} from '../lib/world-graph/projection';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import CitizensPanel from './citizens-panel';
import ImpactPanel from './impact-panel';
import {CitizenCommuteReport} from './citizen-commute-panel';
import ControlledMrtPanel from './controlled-mrt-panel';
import type {CitizenImpactPublic} from '../lib/citizen-grounding/public-contract';
import {appendCitizenCommuteGraph} from '../lib/citizen-grounding/graph';
import { citizenViewPairFixture } from '../lib/citizens/fixtures';
import type { CitizenView, CitizenViewPair } from '../lib/citizens/data';
import type { CitizenStats } from '../lib/citizens/layer';
import {illustrativePedestrianActors,illustrativePedestrianPaths} from '../lib/citizens/pedestrians';
import type { NetworkCatalog, SimulationResponse, MapStation } from '../lib/map-contract';
import { draftToIntervention, type EditorDraft, type DraftStop } from '../lib/editor';
import { illustrativeLine } from '../prototype/mrt/examples/illustrative-line';
import { useAacScenario } from './use-aac-scenario';
import { AacEditor,AacResults } from './eldercare-panel';
import type { AacMapOptions } from '../lib/eldercare/map-layer';
import type { OriginReference } from '../prototype/eldercare/types';
import type { ScenarioResponse } from '../lib/scenarios/contract';
import { useScenarioPlanner } from './use-scenario-planner';
import MapScenarioPanel,{WorkspaceViews} from './map-scenario-panel';
import {mapResultFor} from '../lib/question-simulation/map-view';
import {useScenarioPlot} from './use-scenario-plot';
import type {PlotPoint,PlotPosition} from '../lib/plots/geometry';
import type {PlotMapOptions} from '../lib/plots/map-layer';
import {buildPlottedMrt,buildPlottedAac,type MrtPlotSettings} from '../lib/plots/adapters';
import {acceptsMrtBinding,type MrtExecutionBinding} from '../lib/plots/execution';
import type {CameraCommand} from '../lib/map-camera';
import PlotToolbar from './plot-toolbar';
import {observeMapControlLayout} from './map-control-layout';
import KnowledgeWorkspace from './knowledge-workspace';
import {buildKnowledgeGraph,knowledgeIdentity,type BoundGraphResult} from '../lib/knowledge-graph/adapters';
import type {EldercareApiResponse} from '../lib/eldercare/api-contract';
import type {ImpactResponse} from '../lib/impact/api-contract';
import type {CitizenSimulationPayload} from '../lib/contracts/citizen-simulation';
import GeneralPlotPanel from './general-plot-panel';
import QuestionConsole from './question-console';
import {useQuestionSimulation} from './use-question-simulation';
import {projectQuestionLiveGraph} from '../lib/question-simulation/live';
import ExperimentLab from './experiment-lab';
import {useExperimentLab} from './use-experiment-lab';
import {appendExperimentGraph} from '../lib/experiments/graph';
import type {ScenarioExperimentV1} from '../lib/experiments/index';
import {createScenarioExperimentInput} from '../lib/experiments/index';
import StakeholderWorkspace from './stakeholder-workspace';
import {convertScenarioExperimentInput,stakeholderRoleIdsForFocus,type LinkedStakeholderRunV1} from '../lib/stakeholder-simulation/experiment-bridge';
import {projectLinkedExperimentGraph} from '../lib/stakeholder-simulation/experiment-graph';
import type {KnowledgeGraph} from '../lib/knowledge-graph/contract';
import './scenario-experience.css';
import './general-workspace.css';
import './map-first.css';
import './workspace-polish.css';
import './workspace-colours.css';
import './workspace-light.css';
import './workspace-redesign.css';
import {useDesktopAppearance} from './use-desktop-appearance';
import {reportPreparationTone,commuteTone} from './colour-semantics';
const NO_AAC_ORIGINS:OriginReference[]=[];
// Empty map inputs only while the real catalogue loads; never an executable baseline.
const LOADING_NETWORK:NetworkCatalog={serviceDate:'',stations:[],lines:[],connections:[],quarantinedTrips:0};
const emptyDraft=():EditorDraft=>({id:'HYP_USER_LINE',name:'My proposed line',waitingTimeSeconds:150,stations:[],segments:[]});
const SingaporeMap = dynamic(() => import('./singapore-map'), { ssr: false, loading: () => <div className="map-loading"><span className="spinner" /> Preparing map</div> });

function exampleDraft(): EditorDraft {
  return { id: illustrativeLine.id, name: 'Illustrative North Link', waitingTimeSeconds: illustrativeLine.waitingTimeSeconds!,
    stations: illustrativeLine.stations.map((s, i) => ({ ...s, key: `example-${i}` })),
    segments: illustrativeLine.segments.map(s => ({ runSeconds: s.runSeconds, dwellSeconds: s.dwellSeconds })) };
}
const defaultSegment = () => ({ runSeconds: 300, dwellSeconds: 30 });
function Icon({ name, size = 18 }: { name: 'train' | 'pin' | 'layers' | 'arrow' | 'undo' | 'reset' | 'play' | 'chevron' | 'swap'; size?: number }) {
  const paths = {
    train: <><rect x="5" y="3" width="14" height="15" rx="4" /><path d="M5 10h14M9 3v7m6-7v7M8 18l-2 3m10-3 2 3M8 14h.01M16 14h.01" /></>,
    pin: <><path d="M20 10c0 6-8 11-8 11S4 16 4 10a8 8 0 1 1 16 0Z" /><circle cx="12" cy="10" r="2.5" /></>,
    layers: <><path d="m12 3 9 5-9 5-9-5 9-5Zm-9 9 9 5 9-5M3 16l9 5 9-5" /></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
    undo: <><path d="M3 10h12a6 6 0 0 1 0 12M3 10l6-6m-6 6 6 6" /></>,
    reset: <><path d="M3 10a9 9 0 1 1 1 8M3 4v6h6" /></>,
    play: <path d="m8 4 13 8-13 8V4Z" />,
    chevron: <path d="m9 5 7 7-7 7" />,
    swap: <><path d="M4 7h16l-4-4M20 17H4l4 4" /></>,
  };
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}
function NumberField({ label, value, onChange, step = 1, min = 0 }: { label: string; value: number; onChange: (v: number) => void; step?: number; min?: number }) {
  return <label className="number-field"><span>{label}</span><input type="number" aria-label={label} value={Number.isFinite(value) ? value : ''} step={step} min={min} onChange={e => onChange(e.target.value === '' ? NaN : Number(e.target.value))} /></label>;
}

export default function Workspace() {
  const appearance=useDesktopAppearance();
  const rawPlanner=useScenarioPlanner();
  const plot=useScenarioPlot();
  const flow=useQuestionSimulation(rawPlanner.question,plot.geometry,plot.revision);
  const [experienceView,setExperienceView]=useState<'map'|'report'>('map');
  const preparedResponse=useMemo<ScenarioResponse|null>(()=>flow.state.plan&&flow.state.plan.request.question===rawPlanner.question?{version:1,requestId:flow.state.plan.request.clientRequestId,clientRequestId:flow.state.plan.request.clientRequestId,method:'deterministic-fallback',providerStatus:'not-needed',plan:flow.state.plan}:null,[flow.state.plan,rawPlanner.question]);
  const [retainedQuestionPlan,setRetainedQuestionPlan]=useState<ScenarioResponse|null>(null);
  useEffect(()=>{if(preparedResponse)setRetainedQuestionPlan(preparedResponse);},[preparedResponse]);
  const planner={...rawPlanner,response:preparedResponse??(retainedQuestionPlan?.plan.request.question===rawPlanner.question?retainedQuestionPlan:rawPlanner.response)};
  const experiment=useExperimentLab({question:planner.question,intent:planner.response?.plan.interpretation.intent,geometry:plot.geometry,geometryRevision:plot.revision});
  const [labOpen,setLabOpen]=useState(false);
  const [graphScope,setGraphScope]=useState<{kind:'current'}|{kind:'experiment';id:string}|{kind:'run';graph:KnowledgeGraph;inspections?:Record<string,WorldInspectionV1>}>({kind:'current'});
  const [stakeholderOpen,setStakeholderOpen]=useState(false),[executionRecord,setExecutionRecord]=useState<ScenarioExperimentV1|null>(null),[simulationError,setSimulationError]=useState('');
  const graphAttempt=useRef(0),prepareAttempt=useRef(0);
  useEffect(()=>{graphAttempt.current++;setGraphScope({kind:'current'});},[flow.state.attemptId,flow.state.selectedArchiveId,flow.state.revision]);
  const [stage,setStage]=useState<'general'|'configure'|'calculate'|'results'|'workspace'>('general');
  const [tab,setTab]=useState<'general'|'knowledge'>('general');
  const [cameraCommand,setCameraCommand]=useState<CameraCommand>({id:0,target:'landing'}),surface=useRef<'landing'|'general'>('general');
  const [anchors,setAnchors]=useState<Record<string,string>>({}),[pendingAnchor,setPendingAnchor]=useState<{stationId:string;pointId?:string}|null>(null),[plotError,setPlotError]=useState('');
  const [aacBinding,setAacBinding]=useState<{revision:number;pointId:string;planId:string}|null>(null);
  const [hybridSelection,setHybridSelection]=useState<HybridExploreOptions['selection']|null>(null);
  const [hybridTimings,setHybridTimings]=useState<HybridExploreOptions['timings']>({runSeconds:300,dwellSeconds:30,waitingTimeSeconds:150,transferWalkSeconds:180,geometryConfirmed:false,assumptionsConfirmed:false});
  const execution=useRef<MrtExecutionBinding|null>(null);
  const [activePlan,setActivePlan]=useState<ScenarioResponse|null>(null);
  const [canResume,setCanResume]=useState(false);
  const [advanced,setAdvanced]=useState(false),[mapFocus,setMapFocus]=useState(0);
  const exploring=false,guided=stage!=='workspace';
  const [plotToolsOpen,setPlotToolsOpen]=useState(false);
  const mapPanel=useRef<HTMLElement>(null);
  useEffect(()=>{if(mapPanel.current)return observeMapControlLayout(mapPanel.current);},[]);
  const graphArchived=isArchivedGraphView(graphScope,flow.state.publicRun?.runId??flow.state.run?.runId,!!flow.state.selectedArchiveId);
  const openMapView=()=>{setTab('general');setExperienceView('map');};
  const closePlotTools=()=>{setPlotToolsOpen(false);setPendingAnchor(null);if(stage==='workspace'||stage==='configure')setStage('general');};
  // Draft context is an invalidation token, never a replacement for a frozen input identity.
  const stakeholderContext=JSON.stringify([exploring,planner.question,plot.revision,plot.geometry,experiment.contextCurrent,experiment.state.contextKey,experiment.state.configuration,experiment.state.evidence?.snapshotIdentity,experiment.state.selectedId,experiment.state.records.map(r=>r.experimentId)]);
  const latestStakeholderContext=useRef(stakeholderContext);latestStakeholderContext.current=stakeholderContext;
  useEffect(()=>{graphAttempt.current++;prepareAttempt.current++;setGraphScope({kind:'current'});setSimulationError('');},[stakeholderContext]);
  const showStandaloneGraph=useCallback((graph:KnowledgeGraph|null)=>{graphAttempt.current++;if(graph){setGraphScope({kind:'run',graph});setStakeholderOpen(false);setTab('knowledge');}},[]);
  const showLinkedGraph=useCallback(async(linked:LinkedStakeholderRunV1,accepts:()=>boolean=()=>true)=>{
    const at=++graphAttempt.current,context=latestStakeholderContext.current;
    const graph=await projectLinkedExperimentGraph(linked);
    if(at!==graphAttempt.current||context!==latestStakeholderContext.current||!accepts())return;
    setGraphScope({kind:'run',graph});setStakeholderOpen(false);setTab('knowledge');
  },[]);
  async function openStakeholder(record:ScenarioExperimentV1){
    const at=++prepareAttempt.current,context=stakeholderContext;setSimulationError('');
    try{
      const source=await createScenarioExperimentInput(record);
      await convertScenarioExperimentInput(source,{stakeholderRoleIds:stakeholderRoleIdsForFocus(source.stakeholderFocus),simulationOptions:{mode:'deterministic-demo',rounds:3,seed:'phase7d-demo',memoryEvents:6}});
      if(at!==prepareAttempt.current||context!==latestStakeholderContext.current)return;setExecutionRecord(record);setStakeholderOpen(true);
    }
    catch(error){if(at===prepareAttempt.current)setSimulationError(error instanceof Error?error.message:'The saved experiment could not be validated. Save a supported ASEAN snapshot before executing.');}
  }
  const [interventionMode,setInterventionMode]=useState<'mrt'|'aac'>('mrt');
  const aac=useAacScenario(!exploring&&interventionMode==='aac');
  const aacOrigins=aac.report?.result.provenance.originReferences??NO_AAC_ORIGINS;
  const [inspector,setInspector]=useState<'journey'|'citizens'|'impact'|'controlled'>('journey');
  const [impactWide,setImpactWide]=useState(false);
  const [impactView,setImpactView]=useState<'baseline'|'scenario'>('scenario'),[impactRevision,setImpactRevision]=useState(0);
  const [pair,setPair]=useState<CitizenViewPair>(citizenViewPairFixture),[view,setView]=useState<CitizenView>('baseline');
  const [selectedId,setSelectedId]=useState<string|null>(citizenViewPairFixture.baseline.citizens[0].agentId);
  const [pedestrianArea,setPedestrianArea]=useState(illustrativePedestrianPaths[0].areaId);
  const [showPedestrianPath,setShowPedestrianPath]=useState(false);
  const [playing,setPlaying]=useState(false),[speed,setSpeed]=useState(1),[resetKey,setResetKey]=useState(0),[focusKey,setFocusKey]=useState(0),[citizensEnabled,setCitizensEnabled]=useState(false);
  const [citizenStats,setCitizenStats]=useState<CitizenStats>({visible:0,fps:null,drawCalls:0,status:'Zoom in to see citizens',elapsedSeconds:0});
  const focusCitizens=useCallback(()=>{setLabOpen(false);setStage(current=>current==='configure'||current==='general'?'results':current);setInspector('citizens');setMode('anchor');setCitizensEnabled(true);setFocusKey(k=>k+1);},[]);
  const selectCitizen=useCallback((id:string)=>{setSelectedId(id);setInspector('citizens');if(pair===citizenViewPairFixture){const actor=illustrativePedestrianActors.find(a=>a.agentId===id),path=actor&&illustrativePedestrianPaths.find(p=>p.id===actor.pathId);if(path&&path.areaId!==pedestrianArea){setPedestrianArea(path.areaId);setFocusKey(k=>k+1);}}},[pair,pedestrianArea]);
  const togglePlayback=useCallback(()=>setPlaying(p=>!p),[]);
  // Calculated mode has no geographic agents. Fixture mode never overlays the unrelated editable proposal.
  const citizenOptions=useMemo(()=>({pair,view,selectedId,playing,speed,resetKey,focusKey,illustrativePedestrians:pair===citizenViewPairFixture,areaId:pedestrianArea,showPath:pair===citizenViewPairFixture?showPedestrianPath:true,networkView:inspector==='journey'?'editor' as const:inspector==='impact'?impactView:'baseline' as const,enabled:tab==='general'&&!exploring&&interventionMode==='mrt'&&inspector==='citizens'&&citizensEnabled,onStats:setCitizenStats,onSelect:selectCitizen,onFocus:focusCitizens,onPlayPause:togglePlayback}),[tab,exploring,interventionMode,pair,view,selectedId,playing,speed,resetKey,focusKey,pedestrianArea,showPedestrianPath,inspector,impactView,citizensEnabled,selectCitizen,focusCitizens,togglePlayback]);
  const changePedestrianArea=(areaId:string)=>{const path=illustrativePedestrianPaths.find(p=>p.areaId===areaId),actor=path&&illustrativePedestrianActors.find(a=>a.pathId===path.id);if(!path||!actor)return;setPedestrianArea(areaId);setSelectedId(actor.agentId);setFocusKey(k=>k+1);};
  const loadCitizens=(next:CitizenViewPair)=>{setPair(next);setSelectedId(next.baseline.citizens[0]?.agentId??null);if(next===citizenViewPairFixture)setPedestrianArea(illustrativePedestrianPaths[0].areaId);setPlaying(false);setResetKey(k=>k+1);};
  const [catalog, setCatalog] = useState<NetworkCatalog | null>(null), [networkError, setNetworkError] = useState('');
  const [date, setDate] = useState('2026-10-27'), [draft, setDraft] = useState<EditorDraft>(emptyDraft);
  const [mode, setMode] = useState<'anchor' | 'place'>('anchor'), [disabledSegments, setDisabledSegments] = useState<number[]>([]);
  const [history, setHistory] = useState<{ draft: EditorDraft; disabled: number[] }[]>([]), [addId, setAddId] = useState('');
  const [origin, setOrigin] = useState('NS4'), [destination, setDestination] = useState('NE16');
  const [result, setResult] = useState<SimulationResponse | null>(null), [running, setRunning] = useState(false), [error, setError] = useState('');
  const [citizenImpact,setCitizenImpact]=useState<{context:string;result:CitizenImpactPublic}|null>(null);
  const [graphMrt,setGraphMrt]=useState<BoundGraphResult<SimulationResponse>|null>(null);
  const [graphAac,setGraphAac]=useState<BoundGraphResult<EldercareApiResponse>|null>(null);
  const [graphPopulation,setGraphPopulation]=useState<BoundGraphResult<CitizenSimulationPayload>|null>(null);
  const pendingGraphAac=useRef<string|null>(null);
  const [message, setMessage] = useState('Draw and confirm a proposal, or explicitly load the labelled illustrative example.');
  const revision = useRef(0), request = useRef<AbortController | null>(null), nextId = useRef(1);
  const invalidate = () => { revision.current++; request.current?.abort(); setImpactRevision(n=>n+1); setResult(null); setGraphMrt(null);setGraphAac(null);setGraphPopulation(null);pendingGraphAac.current=null; setRunning(false); setError(''); };
  const primary=stage!=='configure'&&stage!=='workspace';
  const points=plot.geometry.features.filter((f):f is PlotPoint=>f.kind==='point');
  const validAnchors=useMemo(()=>Object.fromEntries(Object.entries(anchors).filter(([id,stationId])=>{const point=points.find(p=>p.id===id),station=catalog?.stations.find(s=>s.id===stationId);return !!point&&!!station&&point.coordinate.lat===station.lat&&point.coordinate.lon===station.lon;})),[anchors,plot.geometry,catalog]);
  const hybridOptions=useMemo<HybridExploreOptions>(()=>({version:1,policy:'hybrid-citizen-explore-v1',interpretationPolicy:'hybrid-map-v2',serviceDate:date,anchors:validAnchors,timings:hybridTimings,...(hybridSelection&&hybridSelection.pointIds.length>=2?{selection:hybridSelection}:{})}),[date,validAnchors,hybridTimings,hybridSelection]);
  useEffect(()=>{flow.controller.invalidate({question:rawPlanner.question,geometry:plot.geometry,geometryRevision:plot.revision,...(plot.geometry.features.length?{hybrid:hybridOptions}:{})});},[flow.controller,rawPlanner.question,plot.geometry,plot.revision,hybridOptions]);
  const aacBound=!!aacBinding&&aacBinding.revision===plot.revision&&aacBinding.planId===planner.response?.plan.planId&&points.some(p=>p.id===aacBinding.pointId&&p.coordinate.lat===aac.draft.position?.lat&&p.coordinate.lon===aac.draft.position?.lon);
  const aacOptions=useMemo<AacMapOptions>(()=>({active:tab==='general'&&!exploring&&interventionMode==='aac',placing:primary||!plotToolsOpen?false:aac.placing,position:primary&&!aacBound?null:aac.draft.position,proposedMarker:!primary,autoFocus:false,radiusMetres:aac.draft.thresholdMetres,facilities:aac.facilities,selectedFacility:aac.selectedFacility,origins:aacOrigins,focusKey:aac.focusKey,onPlace:aac.place,onSelect:aac.setSelectedFacility,onDragStart:aac.invalidate,onCancel:aac.cancelPlacement,onStartPlacement:()=>{setPlotToolsOpen(true);aac.setPlacing(true)},onFocus:aac.focus}),[tab,exploring,interventionMode,primary,plotToolsOpen,aacBound,aac.placing,aac.draft.position,aac.draft.thresholdMetres,aac.facilities,aac.selectedFacility,aacOrigins,aac.focusKey,aac.place,aac.setSelectedFacility,aac.invalidate,aac.cancelPlacement,aac.setPlacing,aac.focus]);
  function invalidateResults(){execution.current=null;invalidate();aac.invalidate();setPlotError('');}
  function invalidatePlot(){if(['interpreting','preparing','executing'].includes(flow.controller.getSnapshot().phase))flow.controller.cancel();const current=plot.getSnapshot();flow.controller.invalidate({question:rawPlanner.question,geometry:current.geometry,geometryRevision:current.revision});experiment.lab.invalidate();setGraphScope({kind:'current'});invalidateResults();setAacBinding(null);setPendingAnchor(null);}
  function editPlot(action:()=>unknown){try{invalidatePlot();action();}catch(error){setPlotError((error as Error).message);}}
  function changePlotMode(next:Parameters<typeof plot.setMode>[0]){try{const before=plot.getSnapshot().revision;setPendingAnchor(null);plot.setMode(next);if(plot.getSnapshot().revision!==before)invalidatePlot();}catch(error){setPlotError((error as Error).message);}}
  function enterGeneral(){if(surface.current==='landing'){surface.current='general';setCameraCommand(c=>({id:c.id+1,target:'singapore'}));}setStage('general');setTab('general');setPlaying(false);setInspector('journey');setImpactWide(false);}
  function configureScenario(target:'mrt'|'aac',response:ScenarioResponse){
    if(response!==planner.response||response.plan.execution!=='calculated'||response.plan.capabilityId!==(target==='mrt'?'mrt-accessibility-v1':'aac-accessibility-v1'))return;
    setActivePlan(response);setInterventionMode(target);enterGeneral();
  }
  useEffect(()=>{setActivePlan(planner.response);if(planner.response)setInterventionMode(planner.response.plan.capabilityId==='aac-accessibility-v1'?'aac':'mrt');},[planner.response]);
  useEffect(()=>{if(planner.response)setLabOpen(false);},[planner.response]);
  const lastPlotRevision=useRef(plot.revision);
  useEffect(()=>{if(lastPlotRevision.current!==plot.revision){lastPlotRevision.current=plot.revision;invalidatePlot();}},[plot.revision]);
  useEffect(()=>{if(!plotToolsOpen||tab!=='general')return;const cancel=(event:KeyboardEvent)=>{if(event.key==='Escape'&&!event.defaultPrevented)closePlotTools();};window.addEventListener('keydown',cancel);return()=>window.removeEventListener('keydown',cancel);},[plotToolsOpen,tab,stage]);
  function requestAnchor(stationId:string,pointId?:string){if(!catalog?.stations.some(s=>s.id===stationId))return;setPendingAnchor({stationId,...(pointId?{pointId}:{})});}
  function confirmAnchor(){
    const station=catalog?.stations.find(s=>s.id===pendingAnchor?.stationId);if(!station||!pendingAnchor)return;
    try {
      const current=plot.getSnapshot(),geometry=structuredClone(current.geometry),id=pendingAnchor.pointId??crypto.randomUUID();
      if(!pendingAnchor.pointId)geometry.features.push({kind:'point',id,label:station.name,coordinate:{lat:station.lat,lon:station.lon},role:'station',provenance:'user-drawn'});
      const routes=geometry.features.filter(f=>f.kind==='line');
      const routeId=hybridSelection?.routeId??(routes.length===1?routes[0].id:undefined);
      const proposal=planConfirmedAnchor(geometry,id,{lat:station.lat,lon:station.lon},routeId);
      const point=proposal.geometry.features.find(f=>f.id===id);if(!point||point.kind!=='point')throw Error('Select a station dot before confirming the connection.');
      point.role='station';point.label=`${station.name} (${station.id})`;
      editPlot(()=>{
        // An already-open tab can retain the older store object after Fast Refresh.
        // Its validated load fallback preserves the complete drawing during this upgrade.
        if(typeof plot.applyGeometry==='function')plot.applyGeometry(proposal.geometry);else plot.load(proposal.geometry);
        setAnchors(old=>({...old,[id]:station.id}));plot.select({id});setPendingAnchor(null);plot.setMode('explore');
      });
    }catch(error){setPlotError(error instanceof Error?error.message:'The interchange could not be connected to this route.');}
  }

  const plotting=useMemo<PlotMapOptions&{onMapClick:(position:PlotPosition)=>void;onAnchorPick:(id:string)=>void}>(()=>({active:tab==='general'&&!exploring&&primary&&inspector!=='citizens',geometry:plot.geometry,mode:plotToolsOpen?plot.mode:'explore',selection:plot.selection,anchors:validAnchors,onSelect:plot.select,onMovePoint:(id,p)=>editPlot(()=>plot.movePoint(id,p)),onMoveVertex:(id,index,p)=>editPlot(()=>plot.moveVertex(id,index,p)),onDragStart:invalidatePlot,onMapClick:p=>editPlot(()=>plot.mode==='line'?plot.addVertex(p):plot.addPoint(p,plot.mode==='station'?'station':'unassigned')),onAnchorPick:id=>requestAnchor(id,plot.selection&&points.some(p=>p.id===plot.selection!.id)?plot.selection.id:undefined)}),[tab,exploring,primary,inspector,plotToolsOpen,plot.geometry,plot.mode,plot.selection,validAnchors,catalog]);
  const showMap=()=>document.querySelector('.map-panel')?.scrollIntoView({behavior:'instant',block:'start'});
  useEffect(() => {
    const abort = new AbortController(); setCatalog(null); setNetworkError('');
    fetch(`/api/network?date=${encodeURIComponent(date)}`, { signal: abort.signal }).then(async r => {
      const body = await r.json(); if (!r.ok) throw new Error(body.error ?? 'Network could not load'); return body;
    }).then(setCatalog).catch(e => { if (e.name !== 'AbortError') setNetworkError(e.message); });
    return () => abort.abort();
  }, [date]);

  const change = (next: EditorDraft, disabled = disabledSegments) => {
    setHistory(h => [...h.slice(-19), { draft: structuredClone(draft), disabled: [...disabledSegments] }]);
    setDraft(next); setDisabledSegments(disabled); invalidate();
  };
  const stationName = (s: DraftStop) => s.kind === 'new' ? s.name : catalog?.stations.find(p => p.id === s.stationId)?.name ?? s.stationId;
  const patchStop = (key: string, patch: Record<string, unknown>) => change({ ...draft, stations: draft.stations.map(s => s.key === key ? { ...s, ...patch } as DraftStop : s) });
  const reorder = (index: number, offset: number) => {
    const stations = [...draft.stations], target = index + offset;
    if (target < 0 || target >= stations.length) return;
    [stations[index], stations[target]] = [stations[target], stations[index]];
    change({ ...draft, stations, segments: stations.slice(1).map(defaultSegment) }, []);
    setMessage('Station order changed. Connections now use 300 s run + 30 s dwell; review these assumptions.');
  };
  const addExisting = (id: string) => {
    if (draft.stations.some(s => s.kind === 'existing' && s.stationId === id)) { setMessage('That interchange is already in your line. Use the arrows to change its order.'); return; }
    const stations: DraftStop[] = [...draft.stations, { kind: 'existing', stationId: id, key: `anchor-${id}`, transferWalkSeconds: 180 }];
    change({ ...draft, stations, segments: stations.length > 1 ? [...draft.segments, defaultSegment()] : [] });
    setMessage(`${catalog?.stations.find(s => s.id === id)?.name ?? id} added. New segment: 300 s run + 30 s dwell.`); setAddId('');
  };
  const addPoint = (point: { lat: number; lon: number }) => {
    const n = nextId.current++, id = `HYP_CUSTOM_${n}`;
    const stations: DraftStop[] = [...draft.stations, { kind: 'new', id, key: id, name: `Proposed station ${n}`, ...point, locationNote: 'Hypothetical location selected on the map; no site or engineering assessment.' }];
    change({ ...draft, stations, segments: stations.length > 1 ? [...draft.segments, defaultSegment()] : [] });
    setMessage(`Proposed station ${n} placed. Drag its marker to adjust the location.`);
  };
  const allStations: MapStation[] = [...(catalog?.stations ?? []), ...draft.stations.flatMap(s => s.kind === 'new' ? [{ id: s.id, name: s.name, lat: s.lat, lon: s.lon, lines: [draft.id], kind: 'hypothetical' as const }] : [])];
  const comparison = result?.comparisons[0] ?? null;
  const journeySummary=useRef<HTMLDivElement>(null);
  useEffect(()=>{if(result&&guided)journeySummary.current?.scrollIntoView({block:'start',behavior:'instant'});},[result,guided]);
  useEffect(()=>{if(guided&&interventionMode==='aac'&&stage==='calculate'&&aac.report)setStage('results');},[guided,interventionMode,stage,aac.report]);
  const citizenNotice=pair[view].metadata.resultKind==='illustrative'
    ? 'Illustrative pedestrians — not a calculated journey forecast. Profiles and example outcomes are invented and independent of these hypothetical paths, which are not verified pavements or homes. Baseline/Scenario share the same motion; plotted interventions do not reroute them.'
    : `Imported visualisation: ${pair[view].metadata.scenarioId}, service date ${pair[view].metadata.simulationDate}. This is independent of the calculated impact report and editable MRT proposal, which is hidden here. Positions and paths are supplied visual assumptions.`;
  const boundMrt=acceptsMrtBinding(execution.current,planner.response?.plan,plot);
  // Exact local input equality, not a provider claim or server execution ID.
  const graphKeyFor=(proposal:EditorDraft)=>knowledgeIdentity({question:planner.question,planId:planner.response?.plan.planId??null,geometry:plot.geometry,geometryRevision:plot.revision,draft:proposal,date,origin,destination,aacDraft:aac.draft});
  const graphIdentity=graphKeyFor(draft);
  const onCitizenImpact=useCallback((result:CitizenImpactPublic|null)=>setCitizenImpact(result?{context:graphIdentity,result}:null),[graphIdentity]);
  const currentCitizenImpact=citizenImpact?.context===graphIdentity?citizenImpact.result:null;
  const onGraphPopulation=useCallback((data:ImpactResponse|null,context:string|null)=>{setGraphPopulation(data&&context?{scenarioIdentity:context,executionIdentity:data.identity.runId,result:data.payload}:null);},[]);
  useEffect(()=>{setGraphAac(aac.report&&pendingGraphAac.current===graphIdentity?{scenarioIdentity:graphIdentity,executionIdentity:aac.report.identity.scenarioId,result:aac.report}:null);},[aac.report,graphIdentity]);
  const knowledgeGraph=useMemo(()=>{try{if(!planner.question.trim()&&!plot.geometry.features.length&&!currentCitizenImpact)return null;const base=buildKnowledgeGraph({question:planner.question,plan:planner.response?.plan??null,geometry:plot.geometry,catalog,anchors:validAnchors,scenarioIdentity:graphIdentity,draft:boundMrt?draft:null,mrt:graphMrt,aac:graphAac,facilities:aac.facilities,demographic:graphPopulation});return base;}catch{return null;}},[planner.question,planner.response,plot.geometry,catalog,validAnchors,graphIdentity,boundMrt,draft,graphMrt,graphAac,aac.facilities,graphPopulation,currentCitizenImpact]);
  const experimentGraph=useMemo(()=>{try{
    if(graphScope.kind==='run')return graphScope.graph;
    const archived=graphScope.kind==='experiment'?experiment.state.records.find(record=>record.experimentId===graphScope.id):null;
    if(archived)return appendExperimentGraph(null,{scenarioIdentity:archived.scenarioIdentity,question:archived.question,configuration:archived.configuration,evidence:archived.evidence,experiment:archived,geometryContext:archived.geometryContext,archived:true,executionAvailable:true});
    if(graphScope.kind==='experiment')return null;
    if(!experiment.contextCurrent||!experiment.state.configuration||!experiment.state.scenarioIdentity)return knowledgeGraph;
    return appendExperimentGraph(knowledgeGraph,{scenarioIdentity:knowledgeGraph?.scenarioIdentity??experiment.state.scenarioIdentity,question:experiment.state.question,configuration:experiment.state.configuration,evidence:experiment.state.evidence,experiment:null,geometryContext:experiment.state.geometryContext,evidenceScenarioIdentity:experiment.state.scenarioIdentity,executionAvailable:true});
  }catch{return graphScope.kind!=='current'?null:knowledgeGraph;}},[knowledgeGraph,graphScope,experiment.state,experiment.contextCurrent]);
  async function restoreExperiment(record:ScenarioExperimentV1){
    setStakeholderOpen(false);prepareAttempt.current++;graphAttempt.current++;
    invalidatePlot();planner.reset();planner.setQuestion(record.question);if(record.geometryContext)plot.load(JSON.parse(record.geometryContext.canonicalContent));else plot.startNew();
    setAnchors({});setAacBinding(null);enterGeneral();setLabOpen(true);
    await experiment.lab.setContext({question:record.question,geometry:plot.getSnapshot().geometry,geometryRevision:plot.getSnapshot().revision});experiment.lab.restoreConfiguration(record.experimentId);
  }
  const canRun = boundMrt&&!!catalog && draft.stations.length >= 2 && draft.stations.some(s => s.kind === 'existing') && !disabledSegments.length;
  const simulate = async (proposal:EditorDraft=draft,plotContext?:{revision:number;key:string;routeId:string;pointIds:string[];planId:string}) => {
    const binding=execution.current;
    if(!plotContext&&binding?.kind==='plot')plotContext=binding;
    if(!acceptsMrtBinding(binding,planner.response?.plan,plot.getSnapshot())){setError('Confirm the current plot or an explicitly reviewed advanced MRT proposal before running.');return;}
    if (!catalog||proposal.stations.length<2||!proposal.stations.some(s=>s.kind==='existing')||(!plotContext&&disabledSegments.length)) { setError('Add at least two stations, including an existing interchange, and restore missing segments.'); return; }
    const controller = new AbortController(); request.current?.abort(); request.current = controller;
    const submittedGraphIdentity=graphKeyFor(proposal),graphRunId=`mrt-request-${crypto.randomUUID()}`;
    const atRevision = revision.current; setRunning(true); setError(''); setResult(null);setGraphMrt(null);
    const accepts=()=>revision.current===atRevision&&request.current===controller&&!controller.signal.aborted&&(!plotContext||plot.getSnapshot().revision===plotContext.revision&&plot.getSnapshot().key===plotContext.key);
    const intervention=draftToIntervention(proposal);
    if(plotContext)intervention.assumptions.rationale+=` User-confirmed plot ${plot.geometry.scenarioId}; route ${plotContext.routeId}; ordered point references ${plotContext.pointIds.join(', ')}; plan ${plotContext.planId}. Route geometry is visual only and never establishes operating times.`;
    try {
      const response = await fetch('/api/simulate', { method: 'POST', signal: controller.signal, headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serviceDate: date, intervention, journeys: [{ origin, destination }] }) });
      const body = await response.json(); if (!response.ok) throw new Error(body.error ?? 'Simulation could not run');
      if(body?.serviceDate!==date||body?.model!=='static-median-travel-time'||!Array.isArray(body.comparisons)||body.comparisons.length!==1||body.comparisons[0]?.origin!==origin||body.comparisons[0]?.destination!==destination)throw new Error('The MRT response did not match the requested journey. Recalculate.');
      if (accepts()) { setResult(body);setGraphMrt({scenarioIdentity:submittedGraphIdentity,executionIdentity:graphRunId,result:body}); setMessage('Comparison updated using the same service date and existing-line costs.'); if(guided)setStage('results'); }
    } catch (e) { if ((e as Error).name !== 'AbortError' && accepts()) setError((e as Error).message); }
    finally { if (accepts()) setRunning(false); }
  };
  function openAdvancedMrt(){const keep=boundMrt;invalidateResults();if(!keep){setDraft(emptyDraft());setHistory([]);setDisabledSegments([]);}if(planner.response?.plan.capabilityId==='mrt-accessibility-v1')execution.current={kind:'advanced',planId:planner.response.plan.planId};setStage('workspace');setInterventionMode('mrt');setInspector('journey');setAdvanced(true);}
  function runPlottedMrt(settings:MrtPlotSettings){
    try{
      if(planner.response?.plan.capabilityId!=='mrt-accessibility-v1'||!catalog)throw new Error('Interpret an MRT scenario before confirming this drawing.');
      const current=plot.getSnapshot();if(current.activeLineId||current.revision!==plot.revision)throw new Error('Finish the line and review the current drawing before calculating.');const proposal=buildPlottedMrt(current.geometry,settings,catalog);invalidateResults();execution.current={kind:'plot',revision:current.revision,key:current.key,routeId:settings.routeId,pointIds:[...settings.pointIds],planId:planner.response.plan.planId};setDraft(proposal);setHistory([]);setDisabledSegments([]);setInterventionMode('mrt');setInspector('journey');setStage('calculate');plot.setMode('explore');
      void simulate(proposal,{revision:current.revision,key:current.key,routeId:settings.routeId,pointIds:settings.pointIds,planId:planner.response.plan.planId});
    }catch(error){setPlotError((error as Error).message);}
  }
  function confirmPlottedAac(pointId:string){try{
    if(planner.response?.plan.capabilityId!=='aac-accessibility-v1')throw new Error('Interpret an AAC scenario before confirming this point.');
    const submitted=buildPlottedAac(plot.geometry,pointId,aac.draft,'plot-aac-confirmation',true);invalidateResults();aac.update({position:submitted.intervention.position,name:submitted.intervention.name});setAacBinding({revision:plot.revision,pointId,planId:planner.response.plan.planId});
  }catch(error){setPlotError((error as Error).message);}}
  function runPlottedAac(){try{const current=plot.getSnapshot();if(!aacBound||!aacBinding||current.revision!==aacBinding.revision||current.activeLineId||planner.response?.plan.capabilityId!=='aac-accessibility-v1')throw new Error('Confirm the current point as an AAC location first.');const request=buildPlottedAac(current.geometry,aacBinding.pointId,aac.draft,`plot-aac-${crypto.randomUUID()}`,true);plot.setMode('explore');setInterventionMode('aac');setStage('calculate');pendingGraphAac.current=graphIdentity;void aac.calculate(request);}catch(error){setPlotError((error as Error).message);}}
  const primaryPlanner={...planner,setQuestion:(question:string)=>{invalidatePlot();planner.setQuestion(question);},setCategory:(category:Parameters<typeof planner.setCategory>[0])=>{invalidatePlot();planner.setCategory(category);},setMapPoints:(values:Parameters<typeof planner.setMapPoints>[0])=>{invalidatePlot();planner.setMapPoints(values);},submit:()=>rawPlanner.submit()};
  async function startQuestion(mode:'live'|'scripted'='live'){if(canRun||aacBound){invalidate();aac.invalidate();}else invalidateResults();setLabOpen(false);enterGeneral();setExperienceView('map');setPlotToolsOpen(false);flow.controller.invalidate({question:rawPlanner.question,geometry:plot.geometry,geometryRevision:plot.revision,...(mode==='live'&&plot.geometry.features.length?{hybrid:hybridOptions}:{})});await startQuestionWork(()=>flow.controller.start(mode==='live'?'dynamic':mode,canRun),canRun?simulate:undefined,aacBound?runPlottedAac:undefined);}
  function reviewPlotSetup(){
    setLabOpen(false);enterGeneral();setExperienceView('map');setPlotToolsOpen(true);
    requestAnimationFrame(()=>{const heading=document.getElementById('plot-mrt-heading')??document.getElementById('plot-geometry-heading');heading?.scrollIntoView({block:'nearest'});heading?.focus({preventScroll:true});});
  }
  function cancelQuestion(){flow.controller.cancel();invalidate();aac.invalidate();}
  const archive=flow.state.history.find(h=>h.id===flow.state.selectedArchiveId);
  const displayedFlow=archive?{...flow.state,...archive}:flow.state;
  const society=useSociety(displayedFlow.publicRun,flow.state.publicRun?.runId??null,!!archive);
  const automaticReports=useAutomaticReports(society.result??displayedFlow.publicRun,true);
  const graphNodeSummaries=useAutomaticGraphSummaries(society.result??displayedFlow.publicRun,true);
  const automaticReportMessage=automaticReports.stage==='writing-summary'?'Writing your quick summary automatically...':automaticReports.stage==='writing-detailed'?'Writing your detailed report automatically...':['checking-summary','checking-detailed'].includes(automaticReports.stage)?'Checking saved reports...':automaticReports.stage==='complete'?(Object.keys(automaticReports.errors).length?'Automatic report preparation needs attention. Open Report to retry.':automaticReports.summary==='available'&&automaticReports.detailed==='available'?'Your quick summary and detailed report are ready.':'Reports were already attempted. Open Report to check or retry.') : '';
  const editQuestion=(question:string)=>{setStage('general');invalidatePlot();rawPlanner.setQuestion(question);flow.controller.invalidate({question,geometry:plot.geometry,geometryRevision:plot.revision});};
  const openQuestionGraph=async()=>{
    const chosen=archive??flow.state,selection=flow.state.selectedArchiveId,at=++graphAttempt.current,revision=flow.state.revision;
    try{
      if(chosen.publicRun){setGraphScope({kind:'run',graph:society.result?.graph??chosen.publicRun.graph,inspections:chosen.publicRun.inspections});setTab('knowledge');return;}
      const run=chosen.dynamic?.run??chosen.run;
      const world=run?await projectPrimaryWorldGraph(run):null;
      const now=flow.controller.getSnapshot(),still=selection?now.history.find(h=>h.id===selection):now;
      if(at!==graphAttempt.current||now.selectedArchiveId!==selection||now.revision!==revision||still?.dynamic!==chosen.dynamic||still?.run!==chosen.run)return;
      setGraphScope(world?{kind:'run',graph:world.graph,inspections:world.inspections}:{kind:'current'});setTab('knowledge');
    }catch{setGraphScope({kind:'current'});setTab('knowledge');setSimulationError('World entities could not be projected safely. Recorded events remain in Report.');}
  };
  const primaryGraph=useMemo(()=>{const base=displayedFlow.publicRun?(society.result?.graph??displayedFlow.publicRun.graph):experimentGraph?legacyWorldEntities(experimentGraph):null;return !displayedFlow.publicRun&&currentCitizenImpact&&!archive&&!graphArchived?appendCitizenCommuteGraph(base,currentCitizenImpact,base?.scenarioIdentity??graphIdentity):base;},[displayedFlow.publicRun,society.result,experimentGraph,currentCitizenImpact,archive,graphArchived,graphIdentity]);
  const socialInspections=displayedFlow.publicRun?.inspections??(graphScope.kind==='run'?graphScope.inspections:undefined);
  const worldEmptyReason=displayedFlow.dynamicFailure||displayedFlow.phase==='error'?'World entities are not available because scenario planning did not complete. Return to Map to retry Explore.':displayedFlow.run?'This historical run does not contain a world-entity graph. Its original records remain in Report.':'World entities will appear after scenario planning completes. Ask a question and choose Explore on the Map.';

  const mapResult=mapResultFor(flow.state,{question:planner.question,geometry:plot.geometry,geometryRevision:plot.revision});
  const min = (value: number | null | undefined) => value == null ? '—' : value.toFixed(2);

  return <main className={`workspace-shell scenario-experience general-experience map-first impactlens-polish impactlens-light stage-${stage} ${plotToolsOpen?'plot-tools-open':''} ${!exploring&&tab==='general'&&experienceView!=='map'?'report-view':''} ${labOpen&&!exploring&&stage==='general'?'experiment-open':''} ${tab==='knowledge'?'knowledge-active':''} ${guided?'guided-experience':''} ${advanced?'advanced-open':''} ${interventionMode==='aac'?'inspecting-aac':inspector==='citizens'?'inspecting-citizens':(inspector==='impact'||inspector==='controlled')?'inspecting-impact':''} ${inspector==='controlled'?'inspecting-controlled':''} ${interventionMode==='mrt'&&impactWide?'dashboard-wide':''}`}>
    <header className="app-header"><button type="button" onClick={openMapView} className="brand" aria-label="ImpactLens SG map"><span className="brand-symbol"><Icon name="layers" size={24} /></span><strong>ImpactLens<span>SG</span></strong></button>
      <WorkspaceViews current={tab==='knowledge'?'knowledge':experienceView} onMap={openMapView} onGraph={()=>void openQuestionGraph()} onReport={()=>{setTab('general');setExperienceView('report');}}/>
      <a className="workspace-tab" href="/evaluation">Decision pilot</a>
    </header>
    <div className="workspace-heading"><div><div className="breadcrumb">Interventions <Icon name="chevron" size={12} /> {interventionMode==='aac'?'New Active Ageing Centre':'New MRT line'}</div><h1>{interventionMode==='aac'?'Bring care closer.':'Explore a better connection.'}</h1></div><div className="network-summary">{interventionMode==='aac'?<><span><strong>{aac.facilities?.summary.corroboratedAac??'—'}</strong> corroborated AAC records</span><span><strong>{aac.facilities?.summary.unknownServicePoints??'—'}</strong> unclassified historical points</span></>:<><span><strong>{catalog?.stations.length ?? '—'}</strong> existing stations</span><span><strong>{catalog?.quarantinedTrips ?? '—'}</strong> trips quarantined</span><span className="model-tag">Static travel-time model</span></>}</div></div>
    {!exploring&&tab==='general'&&experienceView==='report'&&<div className="question-surface">{automaticReportMessage&&<p role="status" data-ui-tone={reportPreparationTone(automaticReports)}>{automaticReportMessage}</p>}{!displayedFlow.publicRun&&!archive&&currentCitizenImpact&&<CitizenCommuteReport result={currentCitizenImpact}/ >}{displayedFlow.publicRun?<CommunicationReport automaticReports={automaticReports} onPause={society.pause} onCancel={society.cancel} onResume={society.resume} result={society.result??displayedFlow.publicRun}/>:<QuestionConsole question={archive?.question??planner.question} onArchive={id=>{graphAttempt.current++;if(id){invalidate();aac.invalidate();}flow.controller.inspectArchive(id);setExperienceView('report');}} onQuestion={editQuestion} onStart={()=>void startQuestion('live')} onRefreshStatus={()=>void flow.controller.refreshInferenceStatus()} onCancel={cancelQuestion} onMap={()=>{enterGeneral();setExperienceView('map');}} onGraph={()=>void openQuestionGraph()} onReport={()=>setExperienceView('report')} state={displayedFlow} report={experienceView==='report'} mrt={archive?null:result} aac={archive?null:aac.report}/>}</div>}
    <div className="workspace-grid" aria-hidden={tab==='knowledge'||experienceView!=='map'} inert={tab==='knowledge'||experienceView!=='map'}>
      <aside hidden={exploring||interventionMode!=='mrt'||(guided&&stage!=='configure')} className="editor-panel" aria-label="MRT line editor">
        <div className="panel-heading"><div className="panel-title"><span className="small-icon coral"><Icon name="train" /></span><div><h2>Line editor</h2><p>{draft.stations.length} stations · {Math.max(0, draft.stations.length - 1)} segments</p></div></div><div className="icon-actions"><button title="Undo edit" aria-label="Undo edit" disabled={!history.length} onClick={() => { const last = history.at(-1)!; setDraft(last.draft); setDisabledSegments(last.disabled); setHistory(h => h.slice(0, -1)); invalidate(); setMessage('Last edit undone.'); }}><Icon name="undo" size={16} /></button><button title="Reset proposal" aria-label="Reset proposal" onClick={() => { change({ id: 'HYP_USER_LINE', name: 'My proposed line', waitingTimeSeconds: 150, stations: [], segments: [] }, []); setMessage('Start with an existing interchange, then place stations on the map.'); }}><Icon name="reset" size={16} /></button></div></div>
        <div className="editor-scroll">
          {guided&&<div className="guided-editor-intro"><h3>Build your line on the map</h3><p>1. Add an existing interchange.<br/>2. Place new stations and set their order.<br/>3. Review times, then choose a journey.</p><p>New segments start with an assumed 300 s run + 30 s dwell. Transfers start at 180 s; boarding wait is editable. These are modelling defaults, not inferred engineering values.</p><button type="button" aria-expanded={advanced} className="advanced-mrt-toggle" onClick={()=>setAdvanced(v=>!v)}>Advanced MRT settings</button></div>}
          <label className="field-label">Line name<input value={draft.name} onChange={e => change({ ...draft, name: e.target.value })} /></label>
          <div className="tool-switch" role="group" aria-label="Map editing mode"><button aria-pressed={mode === 'anchor'} className={mode === 'anchor' ? 'active' : ''} onClick={() => {setPlotToolsOpen(true);setMode('anchor');}}><Icon name="train" size={15} /> Interchange</button><button aria-pressed={mode === 'place'} className={mode === 'place' ? 'active' : ''} onClick={() => {setPlotToolsOpen(true);setMode('place');}}><Icon name="pin" size={15} /> New station</button></div>
          <p className="tool-hint">{mode === 'anchor' ? 'Click an existing station on the map, or select one below.' : 'Click a location on the map. Proposed markers can be dragged.'}</p>
          <label className="field-label">Add existing station<select aria-label="Add existing station" value={addId} onChange={e => { if (e.target.value) addExisting(e.target.value); }} disabled={!catalog}><option value="">Choose an interchange…</option>{catalog?.stations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label>
          <div className="section-label">Ordered stations <span>{draft.stations.length}/40</span></div>
          {!draft.stations.length && <div className="empty-editor"><Icon name="pin" size={28} /><strong>Your line starts here</strong><span>Select an existing station to connect your proposal.</span></div>}
          <ol className="station-list">{draft.stations.map((s, i) => <li key={s.key}>
            <div className="station-row"><span className={`station-order ${s.kind}`}>{i + 1}</span><div className="station-title"><strong>{stationName(s)}</strong><span>{s.kind === 'existing' ? `${s.stationId} · Interchange` : `${s.id} · Hypothetical`}</span></div><div className="station-actions"><button aria-label={`Move station ${i + 1} up`} disabled={i === 0} onClick={() => reorder(i, -1)}>↑</button><button aria-label={`Move station ${i + 1} down`} disabled={i === draft.stations.length - 1} onClick={() => reorder(i, 1)}>↓</button><button aria-label={`Remove station ${i + 1}`} onClick={() => { const stations = draft.stations.filter(x => x.key !== s.key); change({ ...draft, stations, segments: stations.slice(1).map(defaultSegment) }, []); setMessage('Station removed. Remaining segment assumptions reset to 300 s run + 30 s dwell; review them.'); }}>×</button></div></div>
            <details className="station-details"><summary>Edit {s.kind === 'existing' ? 'transfer' : 'name & location'}</summary>{s.kind === 'existing' ? <NumberField label={`Station ${i + 1} transfer walk (s)`} value={s.transferWalkSeconds} onChange={v => patchStop(s.key, { transferWalkSeconds: v })} /> : <><label className="field-label">Station {i + 1} name<input value={s.name} onChange={e => patchStop(s.key, { name: e.target.value })} /></label><p className="microcopy">Moving a station does not recalculate its assumed travel time.</p></>}</details>
            {i < draft.stations.length - 1 && <div hidden={guided&&!advanced} className={`segment-editor ${disabledSegments.includes(i) ? 'disconnected' : ''}`}><div className="segment-label"><span>Segment {i + 1} · {i + 1} → {i + 2}</span><button aria-label={`${disabledSegments.includes(i) ? 'Restore' : 'Remove'} segment ${i + 1}`} onClick={() => { change(draft, disabledSegments.includes(i) ? disabledSegments.filter(x => x !== i) : [...disabledSegments, i]); }}>{disabledSegments.includes(i) ? 'Restore' : 'Remove link'}</button></div>{disabledSegments.includes(i) ? <p>Disconnected. Restore this segment before running.</p> : <div className="input-pair"><NumberField label={`Segment ${i + 1} run (s)`} value={draft.segments[i]?.runSeconds ?? 300} onChange={v => change({ ...draft, segments: draft.segments.map((x, n) => n === i ? { ...x, runSeconds: v } : x) })} /><NumberField label={`Segment ${i + 1} dwell (s)`} value={draft.segments[i]?.dwellSeconds ?? 30} onChange={v => change({ ...draft, segments: draft.segments.map((x, n) => n === i ? { ...x, dwellSeconds: v } : x) })} /></div>}</div>}
          </li>)}</ol>
          <div hidden={guided&&!advanced} className="service-settings"><h3>Service assumptions</h3><NumberField label="Proposed boarding wait (s)" value={draft.waitingTimeSeconds} onChange={v => change({ ...draft, waitingTimeSeconds: v })} /><p className="microcopy">Symmetric service. Times are entered assumptions, never inferred from map distance.</p></div>
          <button className="text-button" onClick={() => { change(exampleDraft(), []); setOrigin('NS4'); setDestination('NE16'); setMessage('Illustrative North Link loaded. Its new locations and timetable are assumptions.'); }}>Load illustrative example</button>
        </div>
        <div className="editor-footer"><p role="status">{message}</p>{stage==='workspace'&&<button className="run-button" disabled={!canRun} onClick={()=>{setStage('calculate');setInspector('journey');}}>Review journey</button>}{guided&&<button className="run-button" disabled={!canRun} onClick={()=>{setStage('calculate');setInspector('journey');}}>Review journey & calculate</button>}</div>
      </aside>

      <AacEditor state={aac} hidden={exploring||stage==='general'||interventionMode!=='aac'||(guided&&stage!=='configure')} onCalculate={()=>{if(guided)setStage('calculate');pendingGraphAac.current=graphIdentity;void aac.calculate();}}/>
      <section ref={mapPanel} className="map-panel" aria-label="Singapore network map">
        <SingaporeMap appearance={appearance} society={{snapshot:society.result?.society?.map,selected:society.selected,visible:false,onSelect:society.setSelected}} exploring={exploring} editing={!!catalog&&plotToolsOpen&&(stage==='configure'||stage==='workspace')} visible={tab==='general'&&(experienceView==='map'||exploring)} cameraCommand={cameraCommand} plotting={plotting} focusKey={mapFocus} aac={aacOptions} citizens={citizenOptions} catalog={catalog??LOADING_NETWORK} draft={draft} disabledSegments={disabledSegments} mode={mode} comparison={comparison}
          onStation={id => { if (mode === 'anchor') addExisting(id); else setMessage('Use Interchange mode to add an existing station. Click an empty map location for a new station.'); }} onPlace={addPoint} onMove={(key, p) => { patchStop(key, p); setMessage('Hypothetical location updated. Review segment times before rerunning.'); }} />
        {!catalog&&<div className="network-map-status" role="status">{networkError?<><span>MRT catalogue unavailable. Geography remains usable.</span><button onClick={()=>location.reload()}>Retry catalogue</button></>:<><span className="spinner"/> Loading MRT station catalogue…</>}</div>}
        {plotToolsOpen&&plotting.active&&<div id="map-plot-controls"><PlotToolbar mode={plot.mode} onMode={next=>{if(stage!=='general')enterGeneral();changePlotMode(next);}} canUndo={plot.canUndo} canRedo={plot.canRedo} onUndo={()=>editPlot(plot.undo)} onRedo={()=>editPlot(plot.redo)} onClear={()=>editPlot(plot.clear)} drawing={!!plot.activeLineId} onFinish={()=>editPlot(plot.finishLine)} onCancel={()=>editPlot(plot.cancel)}/></div>}
      </section>

      <aside hidden={exploring||stage==='general'||stage==='workspace'||interventionMode!=='mrt'||(guided&&stage==='configure')} className="results-panel" aria-label="Journey comparison">
        <div className="inspector-tabs" role="group" aria-label="Inspector"><button aria-pressed={inspector==='journey'} onClick={()=>setInspector('journey')}>MRT journey</button><button aria-pressed={inspector==='impact'} onClick={()=>setInspector('impact')}>Calculated impact</button><button aria-pressed={inspector==='controlled'} onClick={()=>setInspector('controlled')}>Controlled options</button></div>
        <div className="impact-slot" hidden={inspector!=='impact'}><ImpactPanel intervention={draftToIntervention(draft)} serviceDate={date} proposalRevision={impactRevision} canRun={canRun} view={impactView} onView={setImpactView} expanded={impactWide} onExpand={()=>setImpactWide(v=>!v)} resultContext={graphIdentity} onResult={onGraphPopulation} onCitizenResult={onCitizenImpact}/></div>
        <div className="impact-slot" hidden={inspector!=='controlled'}><div className="results-scroll"><button type="button" className="run-button secondary" aria-expanded={impactWide} onClick={()=>setImpactWide(v=>!v)}>{impactWide?'Compact comparison':'Expand comparison'}</button><ControlledMrtPanel intervention={draftToIntervention(draft)} serviceDate={date} revision={impactRevision} canRun={canRun}/></div></div>
        {inspector==='citizens'?<div className="results-scroll citizen-inspector"><p className="citizen-disclaimer">{citizenNotice}</p><CitizensPanel pair={pair} view={view} onView={setView} selectedId={selectedId} onSelect={selectCitizen} playing={playing} onPlayPause={togglePlayback} onReset={()=>{setPlaying(false);setResetKey(k=>k+1);setCitizenStats(s=>({...s,elapsedSeconds:0}));}} speed={speed} onSpeed={setSpeed} elapsedSeconds={citizenStats.elapsedSeconds} enabled={citizensEnabled} onEnabled={setCitizensEnabled} onFocus={focusCitizens} stats={citizenStats} pedestrianArea={pair===citizenViewPairFixture?{id:pedestrianArea,onChange:changePedestrianArea}:undefined} showPath={pair===citizenViewPairFixture?{value:showPedestrianPath,onChange:setShowPedestrianPath}:undefined} onImport={loadCitizens} onRestoreFixture={()=>loadCitizens(citizenViewPairFixture)} /></div>:inspector==='journey'?<>
        <div className="panel-heading"><div><button type="button" className="native-back-button" onClick={openAdvancedMrt}>Edit MRT settings</button><h2>Journey comparison</h2><p>One journey. Two networks.</p></div><span className="small-icon teal"><Icon name="arrow" /></span></div>
        <div className="results-scroll">
          <label className="field-label">Service date<input type="date" min="2026-01-01" max="2026-12-31" value={date} onChange={e => { invalidate(); setDate(e.target.value); }} /></label>
          <label className="field-label">Origin<select aria-label="Origin station" value={origin} onChange={e => { invalidate(); setOrigin(e.target.value); }}>{!allStations.some(s => s.id === origin) && <option value={origin}>{origin} ? unavailable</option>}{allStations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label>
          <div className="journey-connector"><span /><button aria-label="Swap origin and destination" onClick={() => { setOrigin(destination); setDestination(origin); invalidate(); }}><Icon name="swap" size={14} /></button></div>
          <label className="field-label">Destination<select aria-label="Destination station" value={destination} onChange={e => { invalidate(); setDestination(e.target.value); }}>{!allStations.some(s => s.id === destination) && <option value={destination}>{destination} ? unavailable</option>}{allStations.map(s => <option key={s.id} value={s.id}>{s.name} ({s.id})</option>)}</select></label>
          <button className="run-button" onClick={()=>void simulate()} disabled={running || !canRun}>{running ? <span className="spinner" /> : <Icon name="play" size={16} />}{running ? 'Calculating journeys…' : 'Run simulation'}</button>
          {!canRun && catalog && <p className="validation-hint">Add two stations, including an existing interchange. Every segment must be connected.</p>}
          {error && <div className="error-box" role="alert"><strong>Check your proposal</strong><p>{error}</p></div>}
          {comparison ? <div ref={journeySummary} className="comparison-results" aria-live="polite">
            <button className="run-button demographic-next" onClick={()=>{setInspector('impact');if(guided)setStage('results');}}>Explore demographic impact</button>
            <div className="results-label">Calculated comparison <span>{result?.serviceDate}</span></div>
            <div className="duration-block baseline"><span><i /> Existing network</span><div><strong>{min(comparison.baselineMinutes)}</strong><span>min</span></div><small>{comparison.baselineStatus === 'reachable' ? `${comparison.baselineTransfers} transfers` : comparison.baselineStatus.replaceAll('-', ' ')}</small></div>
            <div className="duration-block scenario"><span><i /> With your proposed line</span><div><strong>{min(comparison.scenarioMinutes)}</strong><span>min</span></div><small>{comparison.scenarioStatus === 'reachable' ? `${comparison.scenarioTransfers} transfers` : comparison.scenarioStatus.replaceAll('-', ' ')}</small></div>
            <div className="savings-card" data-journey-tone={commuteTone(comparison.minutesSaved)}><span>Modelled time saved</span><div><strong>{min(comparison.minutesSaved)}</strong><span>minutes</span></div><p>{comparison.percentageChange == null ? 'Percentage change is undefined for an unavailable or zero baseline.' : `${Math.abs(comparison.percentageChange).toFixed(1)}% ${comparison.percentageChange <= 0 ? 'shorter' : 'longer'} journey duration`}</p></div>
            <dl className="result-facts"><div><dt>Uses proposed line</dt><dd>{comparison.usedProposedLine == null ? 'Unavailable' : comparison.usedProposedLine ? 'Yes' : 'No'}</dd></div><div><dt>Change in transfers</dt><dd>{comparison.transferChange == null ? 'Undefined' : comparison.transferChange > 0 ? `+${comparison.transferChange}` : comparison.transferChange}</dd></div><div><dt>Journey status</dt><dd>{comparison.status.replaceAll('-', ' ')}</dd></div></dl>
            {comparison.scenarioRoute && <details className="route-details"><summary>View calculated station sequence</summary><ol>{comparison.scenarioRoute.stationIds.map((id, i) => <li key={`${id}-${i}`}><strong>{allStations.find(s => s.id === id)?.name ?? id}</strong><span>{id}</span></li>)}</ol></details>}
          </div> : <div className="result-empty"><span className="empty-route"><Icon name="train" size={24} /><Icon name="arrow" size={20} /><Icon name="pin" size={24} /></span><h3>What changes with your line?</h3><p>Choose a journey and run the simulation to compare routes, travel time and transfers.</p></div>}
          <div className="assumption-note"><strong>Estimates, with context.</strong><p>Static median travel times. Existing boarding wait: 120 s. Existing line changes: 180 s walk + 120 s wait. Your line uses the assumptions in the editor.</p><p>No departure-time timetable or ridership forecast. Calculated impact uses separately declared hypothetical demand.</p><a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Street tiles: © OpenStreetMap contributors</a></div>
        </div>
        </>:null}
      </aside>
      <AacResults state={aac} hidden={exploring||stage==='general'||interventionMode!=='aac'||(guided&&stage==='configure')}/>
      <aside className="map-scenario-sidebar" aria-label="Scenario panel">
        {(flow.historyRestore.loading||flow.historyRestore.error)&&<div className="society-map-controls" role="status"><p>{flow.historyRestore.loading?'Restoring saved reports…':flow.historyRestore.error}</p>{flow.historyRestore.error&&<button type="button" onClick={flow.retryHistory}>Retry loading saved reports</button>}</div>}
        <MapScenarioPanel active={tab==='general'&&experienceView==='map'&&!labOpen} onReviewPlot={reviewPlotSetup} question={planner.question} state={flow.state} toolsOpen={plotToolsOpen} result={mapResult} onQuestion={editQuestion} onExplore={()=>void startQuestion('live')} onStartReviewed={decisions=>void flow.controller.startReviewed(decisions)} onReviseReview={()=>flow.controller.reviseReview()} onCancel={cancelQuestion} onToggleTools={()=>{if(plotToolsOpen)closePlotTools();else{enterGeneral();setPlotToolsOpen(true);}}} onGraph={()=>void openQuestionGraph()} onReport={()=>{setTab('general');setExperienceView('report');}} onArchive={id=>{flow.controller.inspectArchive(id);setTab('general');setExperienceView('report');}}/>
        {displayedFlow.publicRun&&<>{automaticReportMessage&&<p role="status" className="society-map-controls" data-ui-tone={reportPreparationTone(automaticReports)}>{automaticReportMessage}</p>}<CommunicationStatus onPause={society.pause} onCancel={society.cancel} onResume={society.resume} result={society.result??displayedFlow.publicRun} error={society.error}/></>}

      <GeneralPlotPanel hidden={!plotToolsOpen||stage!=='general'||labOpen} planner={primaryPlanner} plot={plot} catalog={catalog} anchors={validAnchors} pendingAnchor={pendingAnchor} onEdit={editPlot} onInvalidate={invalidateResults} onRequestAnchor={requestAnchor} onConfirmAnchor={confirmAnchor} onDisconnect={id=>{invalidateResults();setAnchors(old=>Object.fromEntries(Object.entries(old).filter(([key])=>key!==id)));}} onRunMrt={runPlottedMrt} onHybridTimings={setHybridTimings} onHybridSelection={setHybridSelection} onAdvancedMrt={openAdvancedMrt} aac={aac} aacBound={aacBound} onConfirmAac={confirmPlottedAac} onRunAac={runPlottedAac} onAdvancedAac={()=>{const keep=aacBound;invalidateResults();if(!keep)aac.reset();setStage('configure');setInterventionMode('aac');}} onShowResults={()=>{setStage('results');setInspector('journey');}} hasResults={!!result||!!aac.report} error={plotError} onResetSimulation={invalidateResults} onUsePlan={configureScenario}/>
        {plotToolsOpen&&<details className="native-model-tools"><summary>Quantitative model controls</summary><p>Confirmed geographic inputs are required for the separate MRT/AAC calculators.</p><button type="button" onClick={()=>void rawPlanner.submit()}>Interpret drawing for a calculator</button></details>}
      </aside>
      <ExperimentLab state={experiment.state} lab={experiment.lab} current={experiment.contextCurrent} visible={labOpen&&!exploring&&stage==='general'} geometry={plot.geometry} plan={planner.response?.plan??null} onClose={()=>setLabOpen(false)} executionAvailable onSimulate={record=>void openStakeholder(record)} simulationError={simulationError} onGraph={()=>{setGraphScope(experiment.state.selectedId?{kind:'experiment',id:experiment.state.selectedId}:{kind:'current'});setTab('knowledge');}} onRestore={record=>void restoreExperiment(record)}/>
    </div>
    <StakeholderWorkspace open={stakeholderOpen&&!exploring} experiment={executionRecord} experiments={experiment.state.records} contextToken={stakeholderContext} question={planner.question} scenarioIdentity={experiment.state.scenarioIdentity??''} onClose={()=>{graphAttempt.current++;prepareAttempt.current++;setStakeholderOpen(false);}} onUseExample={()=>{}} onGraph={showStandaloneGraph} onLinkedGraph={showLinkedGraph}/>


    {tab==='knowledge'&&<p className="world-context-note">Entity types follow this scenario. Model suggestions and fictional interactions remain distinct from retrieved source passages; check each relationship's provenance. Missing evidence does not mean zero relevant entities.</p>}
    <KnowledgeWorkspace appearance={appearance} nodeSummaries={graphNodeSummaries} reportRun={society.result??displayedFlow.publicRun??null} active={tab==='knowledge'} focusAgentId={society.selected} onMapAgent={id=>{society.setSelected(id);openMapView();}} graph={primaryGraph} inspections={socialInspections} emptyReason={worldEmptyReason} archived={graphArchived} resultLabel={graphScope.kind==='run'?displayedFlow.publicRun?`Summary-only synthetic run; ${displayedFlow.publicRun.initialActions.length} accepted stakeholder actions`:worldRunLabel(displayedFlow.run,graphScope.graph.executionIdentity):undefined} visible={tab==='knowledge'} onReturn={openMapView}/>
    <footer className="app-footer"><span><span className="live-dot" /> Evidence-informed scenario modelling</span><span>Pre-hackathon prototype · Proposed infrastructure is hypothetical</span><span>ImpactLens SG / MRT + AAC</span></footer>
  </main>;
}
