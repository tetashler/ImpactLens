/** Browser-only experiment/research lifecycle. Does not execute a simulation. */
import { createDefaultConfiguration, parseConfiguration, createGeometryContext, scenarioIdentityFor,
  createExperiment, exportExperiments, importExperiments, EXPERIMENT_LIMITS, EXPERIMENT_STORAGE_KEY as STORAGE_KEY,
  type ExperimentConfigurationV1, type ExperimentGeometryContextV1, type ScenarioExperimentV1 } from './index.ts';
import { parseScenarioGeometry, type ScenarioGeometry } from '../plots/geometry.ts';
import type { ScenarioIntent } from '../scenarios/contract.ts';
import { parseResearchRequest, parseResearchResponse } from '../evidence/contract.ts';
import type {EvidenceBundleV1,ResearchRequestV1} from '../evidence/types.ts';
import {canonical} from './validation.ts';

export interface ExperimentContext {question:string;intent?:ScenarioIntent;geometry:ScenarioGeometry;geometryRevision:number}
export interface LabSnapshot {
  contextKey:string;question:string;configuration:ExperimentConfigurationV1|null;
  geometryContext:ExperimentGeometryContextV1|null;scenarioIdentity:string|null;
  evidence:EvidenceBundleV1|null;busy:boolean;preparing:boolean;error:string|null;notice:string|null;dirty:boolean;
  records:ScenarioExperimentV1[];selectedId:string|null;comparisonIds:[string|null,string|null];
}
export const EXPERIMENT_STORAGE_KEY=STORAGE_KEY;
const initial=():LabSnapshot=>({contextKey:'',question:'',configuration:null,geometryContext:null,scenarioIdentity:null,evidence:null,busy:false,preparing:false,error:null,notice:null,dirty:false,records:[],selectedId:null,comparisonIds:[null,null]});
export function experimentContextKey(context:ExperimentContext):string {return JSON.stringify({question:context.question,intent:context.intent??null,geometry:context.geometry,revision:context.geometryRevision});}

async function boundedJSON(response:Response):Promise<unknown>{
  if(!response.ok||response.headers.get('content-type')?.split(';')[0]!=='application/json'||!response.body)throw Error();
  const reader=response.body.getReader();let length=0;const chunks:Uint8Array[]=[];
  try{while(true){const next=await reader.read();if(next.done)break;length+=next.value.byteLength;if(length>160_000){await reader.cancel();throw Error();}chunks.push(next.value);}}
  finally{reader.releaseLock();}
  const bytes=new Uint8Array(length);let at=0;for(const chunk of chunks){bytes.set(chunk,at);at+=chunk.length;}return JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(bytes));
}
export function createExperimentLab(options:{fetcher?:typeof fetch;storage?:Pick<Storage,'getItem'|'setItem'>}={}){
  let state=initial(),revision=0,contextGeneration=0,attempt=0,lifetime=0,controller:AbortController|null=null;
  let persistence:Promise<void>=Promise.resolve();
  const listeners=new Set<()=>void>();
  const publish=(patch:Partial<LabSnapshot>)=>{state={...state,...patch};for(const listener of listeners)listener();};
  const abort=()=>{controller?.abort();controller=null;};
  const invalidate=()=>{revision++;abort();publish({evidence:null,busy:false,error:null,notice:null,dirty:!!state.configuration,selectedId:null});};
  async function setContext(context:ExperimentContext){
    const key=experimentContextKey(context);if(key===state.contextKey)return;
    const oldQuestion=state.question,oldConfig=state.configuration,oldGeometry=state.geometryContext;invalidate();const at=++contextGeneration;
    publish({contextKey:key,question:context.question,scenarioIdentity:null,geometryContext:null,preparing:!!context.question.trim()});
    if(!context.question.trim()){publish({configuration:null,preparing:false,dirty:false});return;}
    try{
      const next=createDefaultConfiguration(context.question,context.intent);
      let configuration=oldQuestion===context.question&&oldConfig?.kind===next.kind?oldConfig:next;
      if(oldGeometry&&oldGeometry.canonicalContent!==canonical(context.geometry)){
        if(configuration.kind==='polyclinic')configuration={...configuration,location:null};
        if(configuration.kind==='mrt')configuration={...configuration,routeId:null,stationPointIds:[]};
        if(configuration.kind==='aac')configuration={...configuration,sitePointId:null};
      }
      publish({configuration:parseConfiguration(configuration)});
      const geometryContext=await createGeometryContext(parseScenarioGeometry(context.geometry),context.geometryRevision);
      const scenarioIdentity=await scenarioIdentityFor(context.question,geometryContext);
      if(at===contextGeneration)publish({geometryContext,scenarioIdentity,preparing:false});
    }catch{if(at===contextGeneration)publish({configuration:null,preparing:false,error:'The question or drawing could not be validated for an experiment.'});}
  }
  function setConfiguration(value:unknown){
    try{const configuration=parseConfiguration(value);invalidate();publish({configuration,dirty:true});}
    catch(error){publish({error:error instanceof Error?error.message:'Check the experiment assumptions.'});}
  }
  async function research(){
    if(!state.scenarioIdentity||!state.configuration||state.preparing){publish({error:'Enter a question and wait for its experiment context to be ready.'});return;}
    abort();const current=new AbortController();controller=current;const at=revision,id=++attempt;
    const accepts=()=>revision===at&&attempt===id&&controller===current&&!current.signal.aborted;
    publish({busy:true,error:null,notice:null,evidence:null,selectedId:null});
    const timer=setTimeout(()=>{if(accepts()){current.abort();publish({busy:false,error:'Evidence preparation timed out. Try again.'});}},15_000);
    try{
      const request:ResearchRequestV1=parseResearchRequest({version:1,clientRequestId:crypto.randomUUID(),scenarioIdentity:state.scenarioIdentity,question:state.question,topic:state.configuration.kind});
      const response=await(options.fetcher??fetch)('/api/evidence/research',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/json'},body:JSON.stringify(request),signal:current.signal,credentials:'same-origin',cache:'no-store'});
      const parsed=await parseResearchResponse(await boundedJSON(response),request);
      if(accepts())publish({evidence:parsed.evidence,busy:false,dirty:true,notice:'Verified-source replay loaded. No live retrieval or stakeholder simulation was performed.'});
    }catch{if(accepts())publish({busy:false,error:'Evidence could not be completed or validated. Retry, or save with the evidence gap recorded.'});}
    finally{clearTimeout(timer);if(controller===current)controller=null;}
  }
  function cancelResearch(){revision++;abort();publish({busy:false,notice:'Research cancelled. Existing saved experiments are unchanged.'});}
  async function persist(){
    if(!options.storage){publish({notice:'Saved in this session only. Browser storage is unavailable; export JSON to retain the record.'});return;}
    const records=[...state.records],atLifetime=lifetime;
    persistence=persistence.then(async()=>{try{const json=await exportExperiments(records);if(atLifetime===lifetime)options.storage!.setItem(EXPERIMENT_STORAGE_KEY,json);}
      catch{if(atLifetime===lifetime)publish({notice:'Saved in this session only. Browser storage is unavailable or full; export JSON to retain the record.'});}});
    await persistence;
  }
  async function saveSnapshot():Promise<ScenarioExperimentV1|null>{
    if(!state.configuration||!state.scenarioIdentity||!state.geometryContext||state.preparing||state.busy){publish({error:'Finish configuration and evidence preparation before saving.'});return null;}
    const at=revision;try{
      const record=await createExperiment({question:state.question,configuration:state.configuration,evidence:state.evidence,geometryContext:state.geometryContext});
      if(at!==revision)return null;
      if(state.records.length>=EXPERIMENT_LIMITS.records)throw Error(`The local experiment limit is ${EXPERIMENT_LIMITS.records}. Export your records before starting another collection.`);
      const records=[...state.records,record];
      publish({records,dirty:false,error:null,selectedId:record.experimentId,comparisonIds:[state.comparisonIds[0]??record.experimentId,records.length>1?record.experimentId:null],notice:'Immutable experiment saved. Stakeholder simulation not yet available.'});
      await persist();return record;
    }catch(error){publish({error:error instanceof Error?error.message:'The experiment could not be saved.'});return null;}
  }
  async function importJSON(json:string){
    const atLifetime=lifetime;
    try{const imported=await importExperiments(json);if(atLifetime!==lifetime)return;const ids=new Set(state.records.map(record=>record.experimentId));
      if(imported.some(record=>ids.has(record.experimentId)))throw Error('An experiment ID already exists. Import does not overwrite saved records.');
      if(state.records.length+imported.length>EXPERIMENT_LIMITS.records)throw Error(`The local experiment limit is ${EXPERIMENT_LIMITS.records}.`);
      publish({records:[...state.records,...imported],error:null,notice:'Validated imported records are archived snapshots, not current calculated outcomes.'});await persist();
    }catch(error){if(atLifetime===lifetime)publish({error:error instanceof Error?error.message:'The experiment file could not be validated.'});}
  }
  async function loadSaved(){
    const atLifetime=lifetime;
    try{const json=options.storage?.getItem(EXPERIMENT_STORAGE_KEY);if(json){const loaded=await importExperiments(json);if(atLifetime!==lifetime)return;
      const byId=new Map(state.records.map(record=>[record.experimentId,record]));
      for(const record of loaded){const existing=byId.get(record.experimentId);if(existing&&JSON.stringify(existing)!==JSON.stringify(record))throw Error('Conflicting saved identity');if(!existing)byId.set(record.experimentId,record);}
      if(byId.size>EXPERIMENT_LIMITS.records)throw Error('Too many saved records');
      publish({records:[...byId.values()],notice:'Local archived experiments restored. Current scenario results were not restored.'});
      if(state.records.length!==loaded.length)await persist();}}
    catch{if(atLifetime===lifetime)publish({error:'Stored experiments are corrupt or incompatible. They were not imported or overwritten. Export any valid current records before clearing browser storage.'});}
  }
  function restoreConfiguration(id:string){const record=state.records.find(item=>item.experimentId===id);if(!record)return;
    const emptyMap=!record.geometryContext&&state.geometryContext&&JSON.parse(state.geometryContext.canonicalContent).features.length===0;
    if(record.question!==state.question||(!emptyMap&&record.geometryContext?.identity!==state.geometryContext?.identity)){publish({error:'This archive belongs to a different question or drawing. Restore its question and drawing explicitly first.'});return;}
    setConfiguration(record.configuration);publish({notice:'Archived assumptions copied into the active draft. Evidence must be prepared again; no calculation was restored.'});
  }
  return {getSnapshot:()=>state,subscribe:(listener:()=>void)=>{listeners.add(listener);return()=>{listeners.delete(listener);};},setContext,setConfiguration,research,cancelResearch,saveSnapshot,importJSON,loadSaved,restoreConfiguration,
    exportJSON:()=>exportExperiments(state.records),
    inspectRecord:(id:string|null)=>{if(id===null||state.records.some(record=>record.experimentId===id))publish({selectedId:id});},
    setComparison:(side:0|1,id:string|null)=>{if(id!==null&&!state.records.some(record=>record.experimentId===id))return;const comparisonIds:[string|null,string|null]=[...state.comparisonIds];comparisonIds[side]=id;publish({comparisonIds});},
    clearActive:()=>{revision++;contextGeneration++;abort();const records=state.records;state=initial();publish({records});},invalidate,
    dispose:()=>{revision++;contextGeneration++;lifetime++;abort();state={...state,contextKey:''};listeners.clear();},
  };
}
export type ExperimentLabController=ReturnType<typeof createExperimentLab>;
