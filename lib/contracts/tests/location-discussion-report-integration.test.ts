import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

function render(located:boolean){
 const question='What if a polyclinic was built at this location?';
 const result={version:3,kind:'summary-execution',attemptId:'attempt',requestIdentity:'request',runId:'run',planId:null,question,status:'completed',request:null,graph:{nodes:[],edges:[]},inspections:{},roles:[],initialActions:[],assumptions:[],limitations:[],sources:[],accounting:{planningCalls:2,actionCalls:8,inputTokens:100,outputTokens:100,costUsd:0},demographics:null,session:null,society:null,
  ...(located?{locationContext:{version:1,kind:'hybrid-map-review',bindingKey:'a'.repeat(64),question,geometryRevision:1,interventionType:'new_polyclinic',analysisMode:'location-context',message:'Location only',limitations:[],locations:[{pointId:'site',coordinate:{lat:1.35,lon:103.85},planningArea:'Toa Payoh',subzone:null,sourceId:null,sourceSha256:'b'.repeat(64),referenceYear:2019}]}}:{})};
 const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import ts from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const x of ['.tsx','.ts']){const u=new URL(s+x,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});const {default:Report}=await import(${JSON.stringify(new URL('../../../components/communication-report.tsx',import.meta.url).href)});process.stdout.write(renderToStaticMarkup(createElement(Report,{result:JSON.parse(readFileSync(0,'utf8'))})));`;
 const child=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(result),encoding:'utf8',timeout:15000});assert.equal(child.status,0,child.stderr);return child.stdout;
}
test('actual communication report displays qualitative plotted-site scope alongside the AI summary',()=>{
 const html=render(true);assert.match(html,/Fictional discussion about a proposed polyclinic/);assert.match(html,/Toa Payoh/);assert.match(html,/1\.35000, 103\.85000/);assert.match(html,/No healthcare outcomes, waiting times or capacity have been calculated/);assert.match(html,/AI-generated summary/);assert.doesNotMatch(html,/Citizen-grounded map intervention/);
});
test('existing communication reports do not acquire polyclinic context',()=>{
 const html=render(false);assert.doesNotMatch(html,/Fictional discussion about a proposed polyclinic/);assert.match(html,/Recorded fictional communication/);
});

test('report leads with the question and readable summary while technical records stay collapsed',()=>{
 const html=render(true);
 assert.match(html,/<h1>Scenario report<\/h1>/);assert.match(html,/<details class="report-technical-details"><summary>Detailed results and methodology<\/summary>/);
 assert.ok(html.indexOf('AI-generated summary')<html.indexOf('Detailed results and methodology'));
 assert.ok(html.indexOf('Detailed AI report')>html.indexOf('AI-generated summary'));
 assert.ok(html.indexOf('Detailed AI report')<html.indexOf('Detailed results and methodology'));
 assert.doesNotMatch(html,/<details[^>]*class="report-technical-details"[^>]*open/);
});
