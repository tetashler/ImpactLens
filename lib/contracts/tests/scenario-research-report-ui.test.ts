import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {renderableCommunicationReport} from './helpers/report-ssr.ts';
import type {PublicExplore} from '../../society/public-contract.ts';

const run:PublicExplore={version:3,kind:'summary-execution',attemptId:'research-ui',requestIdentity:'request',runId:'research-ui',planId:null,question:'Should we add a polyclinic?',status:'completed',request:null,graph:{version:1,scenarioIdentity:'scenario',executionIdentity:'research-ui',nodes:[],edges:[],limitations:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:2,actionCalls:8,inputTokens:null,outputTokens:null,costUsd:null},demographics:null,session:null,society:null};
const research={version:1 as const,bundleId:'g1_0123456789abcdef',status:'retrieved' as const,budgetCredits:30 as const,reservedCredits:3,reportedCredits:null,searches:3,stopReason:'uncertain-usage' as const,assumption:'Published source excerpts are supplied as initial background to fictional participants; this is not a recorded announcement or proof of awareness.',sources:[{id:'s_example',title:'Example clinic <information>',url:'https://example.org/clinic',publisher:'example.org',publishedAt:null,retrievedAt:'2026-11-02T00:00:00.000Z',passage:'The source describes published services <without claiming spare capacity>.'}],gaps:['Current capacity is not established.']};

test('report exposes the reusable research separately from AI dialogue and accurately labels unknown billing',async()=>{
 const {default:Report}=await renderableCommunicationReport();
 const html=renderToStaticMarkup(createElement(Report,{result:{...run,research}}));
 assert.match(html,/Research used for this scenario/);
 assert.match(html,/3 of 30.*credits reserved/i);
 assert.match(html,/reported usage.*unavailable/i);
 assert.match(html,/initial background/);
 assert.match(html,/Example clinic &lt;information&gt;/);
 assert.match(html,/https:\/\/example.org\/clinic/);
 assert.match(html,/Current capacity is not established/);
 assert.doesNotMatch(html,/<information>|secret|all citizens were informed/i);
});

test('legacy reports do not acquire an invented research briefing',async()=>{
 const {default:Report}=await renderableCommunicationReport();
 const html=renderToStaticMarkup(createElement(Report,{result:run}));
 assert.doesNotMatch(html,/Research used for this scenario|credits reserved/);
});
