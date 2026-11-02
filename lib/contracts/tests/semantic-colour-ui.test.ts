import test from 'node:test';
import assert from 'node:assert/strict';
import {createElement} from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {processTone,reportPreparationTone,commuteTone,journeyOutcomeTone} from '../../../components/colour-semantics.ts';
import {renderableCommunicationReport} from './helpers/report-ssr.ts';

test('completion colours describe software state, never participant agreement or policy quality',()=>{
 assert.equal(processTone('completed'),'complete');assert.equal(processTone('failed'),'error');
 for(const status of ['partial','paused','cancelled','budget-limited','capacity-limited','needs-map-review'])assert.equal(processTone(status),'attention');
 for(const value of ['support','disagreement','source-backed','verified','improved','unknown'])assert.equal(processTone(value),'neutral');
 assert.equal(processTone('running'),'info');
});
test('report readiness cannot appear complete when an artifact is missing or failed',()=>{
 const state={stage:'complete',summary:'available',detailed:'available',errors:{}} as const;
 assert.equal(reportPreparationTone(state),'complete');
 assert.equal(reportPreparationTone({...state,detailed:'failed',errors:{detailed:'Unavailable'}}),'attention');
 assert.equal(reportPreparationTone({...state,detailed:'skipped'}),'attention');
 assert.equal(reportPreparationTone({...state,stage:'writing-detailed'}),'info');
});
test('initial stakeholder completion cannot colour an ongoing background job as complete',async()=>{
 await renderableCommunicationReport();
 const {default:Panel}=await import('../../../components/map-scenario-panel.tsx');
 const callbacks={onQuestion:()=>{},onExplore:()=>{},onCancel:()=>{},onToggleTools:()=>{},onGraph:()=>{},onReport:()=>{},onArchive:()=>{}};
 const state={question:'A question',phase:'completed',history:[],publicRun:{job:{status:'running'},initialActions:[]}} as unknown as Parameters<typeof Panel>[0]['state'];
 const html=renderToStaticMarkup(createElement(Panel,{question:'A question',state,toolsOpen:false,result:'completed',...callbacks}));
 assert.match(html,/class="map-exploration-status"[^>]*data-ui-tone="info"/);
});
test('signed estimates and unknown values have distinct presentation without changing their numbers',()=>{
 assert.equal(commuteTone(4),'saved');assert.equal(commuteTone(-4),'added');assert.equal(commuteTone(0),'unchanged');
 for(const value of [null,NaN,Infinity,-Infinity])assert.equal(commuteTone(value),'unknown');
 assert.equal(journeyOutcomeTone('improved'),'saved');assert.equal(journeyOutcomeTone('worse'),'added');
 assert.equal(journeyOutcomeTone('unknown'),'unknown');assert.equal(journeyOutcomeTone('newly-reachable'),'reachable');
});
test('commute visual labels both directions and zero; missing data never becomes a zero estimate',async()=>{
 await renderableCommunicationReport();
 const {default:Indicator}=await import('../../../components/commute-change-indicator.tsx');
 for(const [value,label,tone]of [[6.5,'6.5 minutes saved','saved'],[-6.5,'6.5 minutes added','added'],[0,'No estimated time change','unchanged']]as const){
  const html=renderToStaticMarkup(createElement(Indicator,{minutesSaved:value}));
  assert.ok(html.includes(label));assert.ok(html.includes(`data-journey-tone="${tone}"`));
  assert.match(html,/min added/);assert.match(html,/min saved/);assert.match(html,/>0</);
 }
 const missing=renderToStaticMarkup(createElement(Indicator,{minutesSaved:null}));
 assert.match(missing,/Not assessed/);assert.doesNotMatch(missing,/commute-change-track|>0</);
});
