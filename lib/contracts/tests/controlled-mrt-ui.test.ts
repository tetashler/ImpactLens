import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {proposalFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';

function render(name:string,props:unknown){
 const url=new URL('../../../components/controlled-mrt-panel.tsx',import.meta.url).href;
 const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import typescript from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,next){if(s.startsWith('.')&&c.parentURL){for(const x of ['.tsx','.ts']){const p=new URL(s+x,c.parentURL);if(existsSync(p))return next(p.href,c);}}return next(s,c);},load(u,c,next){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return next(u,c);}});const mod=await import(${JSON.stringify(url)});process.stdout.write(renderToStaticMarkup(createElement(mod[${JSON.stringify(name)}],JSON.parse(readFileSync(0,'utf8')))));`;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(props),encoding:'utf8',timeout:15000});
 assert.equal(result.status,0,result.stderr);return result.stdout;
}
const summary={representedPopulation:100,representedAgents:7,coverage:{improved:{agents:1,weight:20},unchanged:{agents:1,weight:10},worse:{agents:0,weight:0},'newly-reachable':{agents:1,weight:15},unreachable:{agents:1,weight:15},unknown:{agents:1,weight:25},'not-applicable':{agents:2,weight:15}},comparableWeight:30,weightedMinutesSaved:40,meanMinutesSaved:1.333333,benefitingShare:2/3,interpretation:'Fictional fixture only.'};
export function controlledUiFixture(unknown=false){return {version:1,policy:'controlled-mrt-wait-v1',requestFingerprint:'f'.repeat(64),snapshot:{id:'mrt-context-'+('a'.repeat(64)),populationId:'population-fixture',datasetId:'citizens-fixture',baselineGraphHash:'b'.repeat(64),sourceSnapshotHash:'c'.repeat(64),serviceDate:'2026-10-27',sources:[],demandSourceHash:'d'.repeat(64),accessSourceHash:'e'.repeat(64)},commonCohort:{agents:unknown?0:2,weight:unknown?0:30,excludedAgents:unknown?7:5,excludedWeight:unknown?100:70},options:([{key:'A',waitingTimeSeconds:30},{key:'B-low',waitingTimeSeconds:15},{key:'B-base',waitingTimeSeconds:30},{key:'B-high',waitingTimeSeconds:60}] as const).map(option=>({...option,runId:'run-'+option.key,scenarioFingerprint:'a'.repeat(64),summary,common:{meanBaselineMinutes:unknown?null:20,meanTravelMinutes:unknown?null:18,meanMinutesSaved:unknown?null:2}})),comparisons:([{level:'low',differenceMinutesBMinusA:-1,preferred:'B'},{level:'base',differenceMinutesBMinusA:0,preferred:'tie'},{level:'high',differenceMinutesBMinusA:2,preferred:'A'}] as const).map(row=>({...row,...(unknown?{differenceMinutesBMinusA:null,preferred:'unknown'}:{})})),preferenceChanges:unknown?null:true,assumptions:['Waits are hypothetical.'],limitations:['Not observed travel.']};}

test('MRT options require explicit duplication before exposing B editing',()=>{
 const html=render('default',{intervention:proposalFixture(),serviceDate:'2026-10-27',revision:1,canRun:true});
 assert.match(html,/Duplicate option A/);assert.doesNotMatch(html,/type="number"/);assert.doesNotMatch(html,/Calculate all options/);
 const locked=render('default',{intervention:proposalFixture(),serviceDate:'2026-10-27',revision:1,canRun:false});
 assert.match(locked,/disabled=""/);assert.match(locked,/review/i);
});

test('results expose the common denominator, signed deltas and separate full coverage',()=>{
 const html=render('ControlledMrtResults',{result:controlledUiFixture()});
 assert.match(html,/Common cohort/);assert.match(html,/2 synthetic agents/);assert.match(html,/30/);assert.match(html,/excluded/);
 assert.match(html,/Option A/);assert.match(html,/Option B/);assert.match(html,/B minus A/);assert.match(html,/\+2\.00/);
 for(const text of ['Newly reachable','Unreachable','Unknown','Not applicable','Expansion weight','Low','Base','High','Tie'])assert.ok(html.includes(text),text);
 assert.match(html,/Preference changes/);assert.match(html,/Yes/);assert.match(html,/Baseline graph/);assert.match(html,/bbbbbbbb/);
 assert.match(html,/not confidence intervals/);assert.match(html,/scenario assumptions/);
});

test('zero common coverage displays unknown outcomes and unknown preference changes',()=>{
 const html=render('ControlledMrtResults',{result:controlledUiFixture(true)});
 assert.match(html,/0 synthetic agents/);assert.match(html,/Unknown/);assert.match(html,/No common comparable journeys/);
 assert.doesNotMatch(html,/Preferred: Option [AB]/);
});
