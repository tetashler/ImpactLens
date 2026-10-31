import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {observePublicSociety} from '../../question-simulation/job.ts';
import type {PublicExplore} from '../../society/public-contract.ts';
import {parseSocietyJob,parsePublicExplore} from '../../question-simulation/public-session.ts';
import {createSociety} from '../../society/engine.ts';
import {multiDaySwarmPolicy,swarmHybrid,SWARM_INTELLIGENCE} from '../../society/swarm.ts';
import {publicSociety} from '../../server/society/summary.ts';
import {phase4dWorld} from './phase4d-fixture.ts';

const job=()=>({version:1,id:'job-multi-day',profileId:'multi-day-50-320-v1',status:'capacity-limited',tick:200,totalSteps:320,acceptedDecisions:100,participatingAgents:35,capacity:350,admittedCalls:70,remainingCalls:0,reason:'EVENT_CAPACITY',revision:300});
test('new job DTO uses an allowlisted execution profile while preserving historical job bounds',()=>{
 assert.equal(parseSocietyJob(job()).totalSteps,320);
 for(const patch of [{profileId:'unbounded-browser-profile'},{profileId:['multi-day-50-320-v1']},{totalSteps:672},{capacity:700},{capacity:1},{acceptedDecisions:9999},{participatingAgents:70},{rawWorld:'RAW_PRIVATE_SENTINEL'},{reason:'RAW_PRIVATE_SENTINEL'}])assert.throws(()=>parseSocietyJob({...job(),...patch}));
 const old={...job(),tick:20,totalSteps:80,status:'paused',reason:null};delete (old as Partial<typeof old>).profileId;assert.equal(parseSocietyJob(old).totalSteps,80);assert.throws(()=>parseSocietyJob({...old,totalSteps:320}));
});

test('observer fetches each changed public revision once while repeated compact polls remain passive',async()=>{
 const snapshot=(revision=0,status='running')=>({version:3,kind:'summary-execution',runId:'run-observer-cached',attemptId:'observer',requestIdentity:'observer',planId:null,question:'Fictional question',status:'completed',request:null,graph:{version:1,scenarioIdentity:'observer',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:2,actionCalls:8,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:{id:'session',token:'observer-token',revision},society:null,job:{...job(),status,reason:null,tick:revision,revision}});
 let polls=0,reads=0;const initial=snapshot() as PublicExplore;
 const result=await observePublicSociety(initial,{signal:new AbortController().signal,accept:()=>{},intervalMs:0,projectionIntervalMs:0,fetcher:async(url,init)=>{assert.ok(!init?.method||init.method==='GET');if(String(url).includes('operation=status')){polls++;return Response.json({version:1,kind:'society-job-status',runId:initial.runId,job:snapshot(1,polls===4?'paused':'running').job});}reads++;return Response.json(snapshot(1,polls===4?'paused':'running'));}});
 assert.equal(result.job?.status,'paused');assert.equal(polls,4);assert.equal(reads,2,'one changed projection plus one terminal projection');
});

test('the160-step profile accepts its exact Day3 midnight boundary and rejects future daily rows',()=>{
 const p=multiDaySwarmPolicy(50,0,160),world=createSociety({...phase4dWorld().genesis.input,swarm:p,hybrid:swarmHybrid(p),intelligence:SWARM_INTELLIGENCE,config:{agents:50,steps:160,activation:0}}),society=publicSociety({...world,tick:160});
 const value={version:3,kind:'summary-execution',runId:society.runId,attemptId:'clock-boundary',requestIdentity:'clock-boundary',planId:null,question:'Fictional question',status:'completed',request:null,graph:{version:1,scenarioIdentity:'clock-boundary',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{},demographics:null,session:null,society};
 const withJob={...value,job:{...job(),profileId:p.multiDay!.profileId,totalSteps:160,tick:160}};assert.equal(parsePublicExplore(withJob).job?.profileId,p.multiDay!.profileId);assert.throws(()=>parsePublicExplore({...withJob,job:{...withJob.job,profileId:'multi-day-50-320-v1',totalSteps:320}}));
 assert.equal(parsePublicExplore(value).society?.clock?.day,3);assert.equal(society.clock?.hour,0);assert.equal(society.clock?.daily.length,3);
 const future=structuredClone(value);future.society.clock!.daily[2].day=8;assert.throws(()=>parsePublicExplore(future));
});
