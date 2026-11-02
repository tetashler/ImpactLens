import '../../../scripts/testing/offline-network.mjs';
import test, {type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {PublicExplore} from '../../society/public-contract.ts';
import type {GraphSummaryWriterEvidence} from '../../server/graph-summary-evidence.ts';
import * as implementation from '../../server/graph-node-summaries.ts';

const token='a'.repeat(64),runId='graph-summary-test';
function run(count=25):PublicExplore {
  return {version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId,planId:null,question:'How would access change?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:runId,nodes:Array.from({length:count},(_,i)=>({id:`node-${i}`,label:`Context ${i}`,category:'population',description:'Fictional scenario context.',provenance:{kind:'synthetic-exploratory',reference:'scenario'},properties:{},limitations:[]})),edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:null,actionCalls:null,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'session',token,revision:1},society:null};
}
async function setup(t:TestContext,count=25) {
  const directory=mkdtempSync(join(tmpdir(),'graph-node-summaries-'));
  t.after(()=>rmSync(directory,{recursive:true,force:true}));
  let current=run(count),calls=0,sourceReads=0,snapshotReads=0;
  const readSnapshot=async(id:string,provided:string)=>{snapshotReads++;if(id!==runId||provided!==token)throw Error('PUBLIC_ACCESS');return structuredClone(current);};
  const readEvidence=async(snapshot:PublicExplore,_token:string,nodeIds:string[]):Promise<GraphSummaryWriterEvidence>=>{
    sourceReads++;
    const {projectGraphSummaryContext}=await import('../../graph-summary/evidence.ts');
    return {...projectGraphSummaryContext(snapshot),nodes:projectGraphSummaryContext(snapshot).nodes.filter(n=>nodeIds.includes(n.nodeId)),publicDiscussion:{version:1,scope:'Public statements only',initialStatements:0,followupStatements:0,omitted:0,statements:[{id:'public-1',actor:'Resident',nodeIds:[nodeIds[0]],phase:'initial',text:'SERVER_ONLY_PUBLIC_EVIDENCE'}],nodes:[]}};
  };
  const generate=async(evidence:GraphSummaryWriterEvidence)=>{calls++;return evidence.nodes.map(n=>({nodeId:n.nodeId,summary:`${n.label} is part of the fictional access scenario. Its public statements do not establish a measured effect.`}));};
  const service=implementation!.createGraphNodeSummaryService({storeDirectory:directory,readSnapshot,readEvidence,generate});
  return {directory,service,readSnapshot,readEvidence,generate,get current(){return current;},set current(v:PublicExplore){current=v;},get calls(){return calls;},get sourceReads(){return sourceReads;},get snapshotReads(){return snapshotReads;}};
}

test('authenticated reads are passive and each request adds only the next missing batch across all nodes',async t=>{
  const d=await setup(t),before=await d.service.read(runId,token);
  assert.equal(before.artifact,null);assert.equal(before.totalNodes,25);assert.equal(before.complete,false);assert.equal(d.calls,0);assert.equal(d.sourceReads,0);
  const first=await d.service.generate(runId,token,before.snapshotKey);
  assert.equal(first.artifact!.summaries.length,12);assert.equal(first.complete,false);
  assert.deepEqual(first.artifact!.summaries.map(n=>n.nodeId),Array.from({length:12},(_,i)=>`node-${i}`));
  const reopened=implementation!.createGraphNodeSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readEvidence:d.readEvidence,generate:d.generate});
  assert.deepEqual((await reopened.read(runId,token)).artifact,first.artifact);
  const second=await reopened.generate(runId,token,before.snapshotKey);assert.equal(second.artifact!.summaries.length,24);
  const last=await reopened.generate(runId,token,before.snapshotKey);assert.equal(last.artifact!.summaries.length,25);assert.equal(last.complete,true);
  assert.deepEqual(await reopened.generate(runId,token,before.snapshotKey),last);assert.equal(d.calls,3);assert.equal(d.sourceReads,3);
  const saved=readFileSync(join(d.directory,readdirSync(d.directory).find(p=>p.endsWith('.json'))!),'utf8');
  assert.ok(!saved.includes(token));assert.ok(!saved.includes('SERVER_ONLY_PUBLIC_EVIDENCE'));assert.ok(!saved.includes('session'));
  await assert.rejects(()=>reopened.read(runId,'b'.repeat(64)),/PUBLIC_ACCESS/);
  await assert.rejects(()=>reopened.generate(runId,'b'.repeat(64),before.snapshotKey),/PUBLIC_ACCESS/);
});

test('maximum graph size remains eligible and oversized graphs fail before evidence or inference',async t=>{
  const d=await setup(t,1500),before=await d.service.read(runId,token);
  assert.equal(before.totalNodes,1500);assert.equal((await d.service.generate(runId,token,before.snapshotKey)).artifact!.summaries.length,12);
  d.current=run(1501);await assert.rejects(()=>d.service.read(runId,token));assert.equal(d.calls,1);assert.equal(d.sourceReads,1);
});

test('running and stale snapshots reject before reading evidence, while credentials do not change identity',async t=>{
  const d=await setup(t),key=(await d.service.read(runId,token)).snapshotKey;
  d.current.session!.token='b'.repeat(64);assert.equal((await d.service.read(runId,token)).snapshotKey,key);
  d.current.question='Changed';await assert.rejects(()=>d.service.generate(runId,token,key),{code:'GRAPH_SUMMARY_STALE',status:409});
  d.current.job={version:1,id:'job',status:'running',tick:1,totalSteps:100,acceptedDecisions:0,participatingAgents:0,capacity:100,admittedCalls:0,remainingCalls:10,reason:null,revision:1};
  const next=(await d.service.read(runId,token)).snapshotKey;
  await assert.rejects(()=>d.service.generate(runId,token,next),{code:'GRAPH_SUMMARY_RUNNING',status:409});assert.equal(d.calls,0);assert.equal(d.sourceReads,0);
});

test('successful partial batches survive later failures without retries or unrelated node output',async t=>{
  const d=await setup(t),key=(await d.service.read(runId,token)).snapshotKey,first=await d.service.generate(runId,token,key);
  let failures=0;
  for(const invalid of ['failure','missing','duplicate','unknown']) {
    const service=implementation!.createGraphNodeSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readEvidence:d.readEvidence,generate:async evidence=>{
      failures++;if(invalid==='failure')throw Error('PRIVATE_FAILURE');
      const summaries=evidence.nodes.map(n=>({nodeId:n.nodeId,summary:'This context has no attributed public statement.'}));
      if(invalid==='missing')summaries.pop();if(invalid==='duplicate')summaries[1]=summaries[0];if(invalid==='unknown')summaries[0].nodeId='unknown';return summaries;
    }});
    await assert.rejects(()=>service.generate(runId,token,key));assert.deepEqual((await service.read(runId,token)).artifact,first.artifact);
  }
  assert.equal(failures,4);
});

test('concurrent requests deduplicate the same batch and stale evidence or inference cannot overwrite cache',async t=>{
  const d=await setup(t);let release!:()=>void,entered!:()=>void,calls=0;
  const gate=new Promise<void>(r=>release=r),started=new Promise<void>(r=>entered=r);
  const service=implementation!.createGraphNodeSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readEvidence:d.readEvidence,generate:async evidence=>{calls++;entered();await gate;return d.generate(evidence);}});
  const key=(await service.read(runId,token)).snapshotKey,one=service.generate(runId,token,key),two=service.generate(runId,token,key);
  await started;release();assert.deepEqual(await one,await two);assert.equal(calls,1);
  const saved=readFileSync(join(d.directory,readdirSync(d.directory).find(p=>p.endsWith('.json'))!),'utf8');
  for(const stage of ['evidence','inference']) {
    const unstable=implementation!.createGraphNodeSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readEvidence:async(...args)=>{const evidence=await d.readEvidence(...args);if(stage==='evidence')d.current.session!.revision++;return evidence;},generate:async evidence=>{if(stage==='inference')d.current.session!.revision++;return d.generate(evidence);}});
    const next=(await unstable.read(runId,token)).snapshotKey;await assert.rejects(()=>unstable.generate(runId,token,next),{code:'GRAPH_SUMMARY_STALE'});
    assert.equal(readFileSync(join(d.directory,readdirSync(d.directory).find(p=>p.endsWith('.json'))!),'utf8'),saved);
  }
});

test('prompt versions invalidate independent caches and malformed saved artifacts never become summaries',async t=>{
  const d=await setup(t),key=(await d.service.read(runId,token)).snapshotKey;
  await d.service.generate(runId,token,key);
  const upgraded=implementation!.createGraphNodeSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readEvidence:d.readEvidence,generate:d.generate,promptVersion:'next-version'});
  const next=await upgraded.read(runId,token);assert.notEqual(next.snapshotKey,key);assert.equal(next.artifact,null);
  const path=join(d.directory,readdirSync(d.directory).find(p=>p.endsWith('.json'))!);
  writeFileSync(path,JSON.stringify({version:1,runId,snapshotKey:next.snapshotKey,generatedAt:new Date().toISOString(),totalNodes:25,summaries:[{nodeId:'unknown',summary:'Invalid attribution.'}]}));
  await assert.rejects(()=>upgraded.read(runId,token));
});

test('HTTP boundary rejects untrusted evidence, targets, origins and oversized bodies without dispatch',async t=>{
  const d=await setup(t),url='http://localhost/api/knowledge-graph/summaries',headers={authorization:`Bearer ${token}`,'content-type':'application/json'};
  assert.equal((await implementation!.handleGraphNodeSummaries(new Request(url+'?runId='+runId),d.service)).status,403);assert.equal(d.snapshotReads,0);
  const key=(await d.service.read(runId,token)).snapshotKey;
  for(const body of [{runId,snapshotKey:key,evidence:{}},{runId,snapshotKey:key,nodeIds:['node-1']},{runId:'../private',snapshotKey:key},{runId,snapshotKey:'x'.repeat(1100)}])assert.ok((await implementation!.handleGraphNodeSummaries(new Request(url,{method:'POST',headers,body:JSON.stringify(body)}),d.service)).status>=400);
  for(const query of [`?runId=${runId}&runId=${runId}`,`?runId=${runId}&nodeId=node-1`])assert.equal((await implementation!.handleGraphNodeSummaries(new Request(url+query,{headers}),d.service)).status,400);
  assert.equal((await implementation!.handleGraphNodeSummaries(new Request(url+'?runId='+runId,{headers:{...headers,host:'localhost',origin:'https://elsewhere.invalid','x-forwarded-host':'elsewhere.invalid'}}),d.service)).status,403);
  const get=await implementation!.handleGraphNodeSummaries(new Request(url+'?runId='+runId,{headers}),d.service);
  assert.equal(get.status,200);assert.equal(get.headers.get('cache-control'),'no-store');assert.equal(get.headers.get('vary'),'Authorization');assert.deepEqual(Object.keys(await get.json()).sort(),['artifact','complete','snapshotKey','totalNodes']);assert.equal(d.calls,0);
  const post=await implementation!.handleGraphNodeSummaries(new Request(url,{method:'POST',headers:{...headers,host:'127.0.0.1',origin:'http://127.0.0.1'},body:JSON.stringify({runId,snapshotKey:key})}),d.service);
  assert.equal(post.status,200);assert.equal((await post.json()).artifact.summaries.length,12);
  const failing=implementation!.createGraphNodeSummaryService({storeDirectory:d.directory,readSnapshot:d.readSnapshot,readEvidence:d.readEvidence,generate:async()=>{throw Error('PRIVATE_SECRET');}});
  const failure=await implementation!.handleGraphNodeSummaries(new Request(url,{method:'POST',headers,body:JSON.stringify({runId,snapshotKey:key})}),failing);
  assert.equal(failure.status,503);assert.ok(!(await failure.text()).includes('PRIVATE_SECRET'));
});

test('conversation writer receives explicit recap instructions rather than a platform definition',async t=>{
  const d=await setup(t),evidence=await d.readEvidence(d.current,token,['node-0']);
  const {MODEL}=await import('../../server/inference/deepseek.ts');
  const generator=implementation.createGraphNodeSummaryGenerator({key:'mock-key',fetcher:async(_url,init)=>{
    const body=JSON.parse(String(init?.body)),system=body.messages[0].content;
    assert.match(system,/Conversation recap rules/);
    assert.match(system,/Do not open with a definition of Reddit or WhatsApp/i);
    assert.match(system,/not.*majority.*scores/i);
    return Response.json({id:'mock-conversation',model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify({summaries:[{nodeId:'node-0',summary:'One participant requested subsidised follow-ups. Another asked whether the clinic would preserve continuity of care; that question remained unanswered.'}]})}}],usage:{}});
  }});
  assert.match((await generator(evidence))[0].summary,/remained unanswered/);
});

test('generator uses bounded configured transport and rejects truncated or mismatched batches without retry',async t=>{
  const d=await setup(t),evidence=await d.readEvidence(d.current,token,['node-0','node-1']);
  const {MODEL,PROVIDER}=await import('../../server/inference/deepseek.ts');let calls=0;
  const generator=implementation!.createGraphNodeSummaryGenerator({key:'mock-key',timeoutMs:45000,fetcher:async(url,init)=>{
    calls++;assert.equal(String(url),'https://openrouter.ai/api/v1/chat/completions');
    const body=JSON.parse(String(init?.body));assert.equal(body.model,MODEL);assert.deepEqual(body.provider,{only:[PROVIDER],allow_fallbacks:false,require_parameters:true});assert.ok(body.max_tokens<=6000);assert.deepEqual(JSON.parse(body.messages[1].content),evidence);
    return Response.json({id:'mock-graph',model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:'stop',message:{content:JSON.stringify({summaries:[{nodeId:'node-0',summary:'First public context.'},{nodeId:'node-1',summary:'Second public context.'}]})}}],usage:{}});
  }});
  assert.deepEqual((await generator(evidence)).map(n=>n.nodeId),['node-0','node-1']);assert.equal(calls,1);
  for(const variant of ['length','missing']) {
    let attempts=0;const invalid=implementation!.createGraphNodeSummaryGenerator({key:'mock-key',fetcher:async()=>{attempts++;return Response.json({id:'mock-bad',model:MODEL,provider:'DigitalOcean',choices:[{finish_reason:variant==='length'?'length':'stop',message:{content:JSON.stringify({summaries:[{nodeId:'node-0',summary:'Only one.'}]})}}],usage:{}});}});
    await assert.rejects(()=>invalid(evidence));assert.equal(attempts,1);
  }
  let dispatches=0;const bounded=implementation!.createGraphNodeSummaryGenerator({key:'mock-key',fetcher:async()=>{dispatches++;throw Error('Must not dispatch');}});
  evidence.publicDiscussion.statements[0].text='界'.repeat(90000);await assert.rejects(()=>bounded(evidence),{code:'GRAPH_SUMMARY_INPUT',status:413});assert.equal(dispatches,0);
});
