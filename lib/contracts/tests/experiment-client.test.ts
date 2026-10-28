import test from 'node:test';
import assert from 'node:assert/strict';
import { createExperimentLab } from '../../experiments/client.ts';
import { createReplayEvidence } from '../../evidence/replay.ts';
import {createDefaultConfiguration,createExperiment} from '../../experiments/index.ts';

const geometry={version:1 as const,scenarioId:'test-drawing',features:[]};
function delayed(){const pending:Array<{body:any;resolve:(response:Response)=>void}>=[];return {pending,fetcher:((_url,init)=>new Promise<Response>(resolve=>pending.push({body:JSON.parse(String(init?.body)),resolve}))) as typeof fetch};}
async function answer(item:ReturnType<typeof delayed>['pending'][number]){const evidence=await createReplayEvidence({scenarioIdentity:item.body.scenarioIdentity,researchAttemptId:item.body.clientRequestId,question:item.body.question,topic:item.body.topic});item.resolve(Response.json({version:1,clientRequestId:item.body.clientRequestId,scenarioIdentity:item.body.scenarioIdentity,researchAttemptId:item.body.clientRequestId,evidence}));}

test('research is on demand, retry rejects a delayed previous attempt',async()=>{
  const network=delayed(),lab=createExperimentLab({fetcher:network.fetcher});
  await lab.setContext({question:'What if Singapore left ASEAN?',geometry,geometryRevision:0});
  assert.equal(network.pending.length,0);
  const first=lab.research(),second=lab.research();
  await answer(network.pending[1]);await second;
  const current=lab.getSnapshot().evidence?.researchAttemptId;
  await answer(network.pending[0]);await first;
  assert.equal(lab.getSnapshot().evidence?.researchAttemptId,current);
  assert.notEqual(network.pending[0].body.clientRequestId,current);
});

test('A → B → A, geometry edits and reset cannot accept an old response',async()=>{
  const network=delayed(),lab=createExperimentLab({fetcher:network.fetcher});
  const a={question:'What if Singapore left ASEAN?',geometry,geometryRevision:0};
  await lab.setContext(a);const old=lab.research();
  await lab.setContext({...a,question:'What if a new polyclinic opened?'});await lab.setContext(a);
  await answer(network.pending[0]);await old;assert.equal(lab.getSnapshot().evidence,null);
  const moved=lab.research();await lab.setContext({...a,geometryRevision:1});await answer(network.pending[1]);await moved;
  assert.equal(lab.getSnapshot().evidence,null);
  const reset=lab.research();lab.clearActive();await answer(network.pending[2]);await reset;
  assert.equal(lab.getSnapshot().evidence,null);assert.equal(lab.getSnapshot().question,'');
});

test('assumption changes and cancellation invalidate research, saved records remain immutable',async()=>{
  const network=delayed(),lab=createExperimentLab({fetcher:network.fetcher});
  await lab.setContext({question:'What if Singapore left ASEAN?',geometry,geometryRevision:0});
  const first=await lab.saveSnapshot();assert.ok(first);assert.equal(first.configuration.kind,'asean');
  const pending=lab.research();const config=lab.getSnapshot().configuration!;
  lab.setConfiguration({...config,horizonYears:10});await answer(network.pending[0]);await pending;
  assert.equal(lab.getSnapshot().evidence,null);assert.equal(first.configuration.horizonYears,5);
  assert.equal(lab.getSnapshot().dirty,true);
  const again=lab.research();lab.cancelResearch();await answer(network.pending[1]);await again;
  assert.equal(lab.getSnapshot().evidence,null);assert.equal(lab.getSnapshot().busy,false);
  lab.inspectRecord(first.experimentId);assert.equal(lab.getSnapshot().selectedId,first.experimentId);
  assert.equal(lab.getSnapshot().configuration?.horizonYears,10);
  lab.restoreConfiguration(first.experimentId);assert.equal(lab.getSnapshot().configuration?.horizonYears,5);
});

test('invalid responses fail safely and imported experiments never overwrite existing records',async()=>{
  const lab=createExperimentLab({fetcher:async()=>Response.json({error:'secret stack path'})});
  await lab.setContext({question:'What if Singapore left ASEAN?',geometry,geometryRevision:0});
  await lab.research();assert.match(lab.getSnapshot().error??'',/validated|complete/);assert.doesNotMatch(lab.getSnapshot().error??'',/secret/);
  const record=await lab.saveSnapshot();assert.ok(record);
  const json=await lab.exportJSON();await lab.importJSON(json);
  assert.equal(lab.getSnapshot().records.length,1);
  assert.match(lab.getSnapshot().error??'',/already|duplicate/i);
});

test('an assumption edit during asynchronous context preparation does not strand the draft',async()=>{
  const lab=createExperimentLab();
  const pending=lab.setContext({question:'What if Singapore left ASEAN?',geometry,geometryRevision:0});
  lab.setConfiguration({...lab.getSnapshot().configuration!,horizonYears:10});await pending;
  assert.equal(lab.getSnapshot().preparing,false);assert.ok(lab.getSnapshot().scenarioIdentity);
  assert.equal(lab.getSnapshot().configuration?.horizonYears,10);
});

test('explicit restoration of an imported non-geographic archive copies assumptions after an empty map context',async()=>{
  const lab=createExperimentLab();const record=await createExperiment({question:'What if Singapore left ASEAN?',configuration:{...createDefaultConfiguration('What if Singapore left ASEAN?'),horizonYears:10},evidence:null});
  await lab.importJSON(JSON.stringify({version:1,experiments:[record]}));
  await lab.setContext({question:record.question,geometry,geometryRevision:1});
  lab.restoreConfiguration(record.experimentId);
  assert.equal(lab.getSnapshot().configuration?.horizonYears,10);assert.equal(lab.getSnapshot().error,null);
});

test('moving geometry clears a selected planning site until it is explicitly confirmed again',async()=>{
  const lab=createExperimentLab();const drawing={...geometry,features:[{kind:'point' as const,id:'site',label:'Site',coordinate:{lat:1.39,lon:103.89},role:'site' as const,provenance:'user-drawn' as const}]};
  await lab.setContext({question:'What if a new polyclinic opened?',geometry:drawing,geometryRevision:1});
  lab.setConfiguration({...lab.getSnapshot().configuration!,location:drawing.features[0].coordinate});
  await lab.setContext({question:'What if a new polyclinic opened?',geometry:{...drawing,features:[{...drawing.features[0],coordinate:{lat:1.4,lon:103.9}}]},geometryRevision:2});
  const config=lab.getSnapshot().configuration!;assert.equal(config.kind,'polyclinic');if(config.kind==='polyclinic')assert.equal(config.location,null);
});

test('saving without browser storage clearly warns that the archive is session-only',async()=>{
  const lab=createExperimentLab();await lab.setContext({question:'What if Singapore left ASEAN?',geometry,geometryRevision:0});
  assert.ok(await lab.saveSnapshot());assert.match(lab.getSnapshot().notice??'',/session only|session-only/i);
});
