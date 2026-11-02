import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,writeFileSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve,dirname,basename} from 'node:path';
import {createHash} from 'node:crypto';
import {readPublicReportSnapshot} from '../../server/society/public-service.ts';
import type {PublicExplore} from '../../society/public-contract.ts';

function cleanup(directory:string){
 const target=resolve(directory);assert.equal(dirname(target),resolve(tmpdir()));assert.ok(basename(target).startsWith('impactlens-report-snapshot-'));
 rmSync(target,{recursive:true,force:true});
}

function fixture(historical=false){
 const directory=mkdtempSync(join(tmpdir(),'impactlens-report-snapshot-'));
 const token='a'.repeat(64),runId='report-snapshot-fixture';
 const publicRun:PublicExplore={version:3,kind:'summary-execution',attemptId:'attempt-fixture',requestIdentity:'request-fixture',runId,planId:null,question:'What could this scenario change?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'scenario-fixture',executionIdentity:runId,nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:0,actionCalls:0,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:null,society:null};
 if(historical)publicRun.job={version:1,id:'job-fixture',status:'running',tick:1,totalSteps:320,acceptedDecisions:0,participatingAgents:0,capacity:350,admittedCalls:30,remainingCalls:30,reason:null,revision:0};
 const path=join(directory,createHash('sha256').update(runId).digest('hex')+'.json');
 writeFileSync(path,JSON.stringify({version:1,publicRun,token,sessionId:null,revision:0,execution:{private:'PRIVATE_INTERNAL_EXECUTION'},baseGraph:publicRun.graph}));
 return {directory,path,runId,token,deps:{storeDirectory:directory,directory:join(directory,'sessions'),storageHistorical:historical,fetcher:async()=>{throw Error('Unexpected network call');}}};
}

test('authenticated report snapshots are detached and do not mutate or recover stored runs',async()=>{
 const f=fixture();try{
  const before=readFileSync(f.path,'utf8');
  const first=await readPublicReportSnapshot(f.runId,f.token,f.deps);
  assert.equal(first.runId,f.runId);assert.equal(first.session,null);
  assert.doesNotMatch(JSON.stringify(first),/PRIVATE_INTERNAL_EXECUTION/);
  first.question='Changed locally';first.assumptions.push('Local change');
  const second=await readPublicReportSnapshot(f.runId,f.token,f.deps);
  assert.equal(second.question,'What could this scenario change?');assert.deepEqual(second.assumptions,[]);
  assert.equal(readFileSync(f.path,'utf8'),before);
 }finally{cleanup(f.directory);}
});

test('report snapshot access rejects an incorrect token',async()=>{
 const f=fixture();try{await assert.rejects(()=>readPublicReportSnapshot(f.runId,'b'.repeat(64),f.deps),/PUBLIC_ACCESS/);}finally{cleanup(f.directory);}
});

test('historical report snapshots expose read-only status without rewriting the archive',async()=>{
 const f=fixture(true);try{
  const before=readFileSync(f.path,'utf8'),result=await readPublicReportSnapshot(f.runId,f.token,f.deps);
  assert.equal(result.storage?.disposition,'historical-read-only');assert.equal(result.job?.status,'paused');
  assert.equal(readFileSync(f.path,'utf8'),before);
 }finally{cleanup(f.directory);}
});
