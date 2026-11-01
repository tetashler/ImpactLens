import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {observePublicSociety,controlPublicSociety,controlSelectedPublicSociety} from '../../question-simulation/job.ts';
import {continuePublicSociety} from '../../question-simulation/continuation.ts';import {parsePublicExplore} from '../../question-simulation/public-session.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
const historical=():PublicExplore=>({version:3,kind:'summary-execution',runId:'run-frozen-client',attemptId:'frozen',requestIdentity:'frozen',planId:null,question:'Fictional frozen question',status:'completed',request:null,graph:{version:1,scenarioIdentity:'frozen',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:2,actionCalls:8,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'frozen-session',token:'frozen-token',revision:0},society:null,job:{version:1,id:'frozen-job',status:'running',tick:0,totalSteps:80,acceptedDecisions:0,participatingAgents:0,capacity:350,admittedCalls:70,remainingCalls:70,reason:null,revision:0},storage:{version:1,policy:'storage-admission-v1',disposition:'historical-read-only'}});
test('frozen public disposition prevents observation and control dispatch from restored browser state',async()=>{
 const p=historical();let requests=0;const fetcher:typeof fetch=async()=>{requests++;throw Error('FROZEN_DISPATCH');};
 assert.deepEqual(await observePublicSociety(p,{signal:new AbortController().signal,accept:()=>{},fetcher}),p);
 assert.equal(await controlSelectedPublicSociety(p,p.runId,'pause',{isCurrent:()=>true,fetcher}),null);
 await assert.rejects(()=>controlPublicSociety(p,'resume',undefined,fetcher),/SOCIETY_ARCHIVED_READ_ONLY/);
 assert.deepEqual(await continuePublicSociety(p,{signal:new AbortController().signal,accept:()=>{},fetcher}),p);assert.equal(requests,0);
});
test('storage disposition rejects paths, claims and unknown policy values at the public parser',()=>{
 for(const storage of [{...historical().storage,path:'PRIVATE_PATH'},{...historical().storage,claim:'PRIVATE_CLAIM'},{...historical().storage,policy:'future-untrusted'},{...historical().storage,disposition:'writable-legacy'}])assert.throws(()=>parsePublicExplore({...historical(),storage}));
 parsePublicExplore(historical());
});
