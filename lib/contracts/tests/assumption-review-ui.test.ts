import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

function render(component:string,exportName:string,props:unknown){
 const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import ts from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const x of ['.tsx','.ts']){const u=new URL(s+x,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});const m=await import(${JSON.stringify(new URL('../../../components/',import.meta.url).href)}+${JSON.stringify(component)});const p=JSON.parse(readFileSync(0,'utf8')),noop=()=>{};process.stdout.write(renderToStaticMarkup(createElement(m[${JSON.stringify(exportName)}],{...p,onStart:noop,onRevise:noop,onCancel:noop,onQuestion:noop,onExplore:noop,onToggleTools:noop,onGraph:noop,onReport:noop,onArchive:noop,onStartReviewed:noop,onReviseReview:noop})));`;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(props),encoding:'utf8',timeout:15000});assert.equal(result.status,0,result.stderr);return result.stdout;
}
const draft={version:1,kind:'assumption-review',draftId:'draft-ui',token:'a'.repeat(64),attemptId:'attempt-ui',contextKey:'b'.repeat(64),expiresAt:'2099-01-01T00:00:00.000Z',question:'What if a four-day workweek was introduced?',description:'A fictional workweek scenario.',assumptions:[{id:'pay',text:'Monthly pay remains unchanged.'},{id:'hours',text:'Daily work hours remain unchanged.'}]};

test('review requires an explicit choice per assumption and offers editing and cancellation',()=>{
 const html=render('assumption-review-panel.tsx','default',{draft});
 assert.match(html,/Review simulation assumptions/);assert.match(html,/0 of 2 assumptions reviewed/);
 assert.equal([...html.matchAll(/type="radio"/g)].length,4);assert.equal([...html.matchAll(/<fieldset/g)].length,2);
 assert.doesNotMatch(html,/checked=""/);assert.match(html,/>Start simulation<\/button>/);assert.match(html,/disabled=""/);
 assert.match(html,/>Back to editing<\/button>/);assert.match(html,/>Cancel<\/button>/);assert.match(html,/unknown/);
 assert.equal([...html.matchAll(/name="assumption-pay"/g)].length,2);assert.equal([...html.matchAll(/name="assumption-hours"/g)].length,2);
});
test('empty review still asks the user to continue and does not disable the explicit action',()=>{
 const html=render('assumption-review-panel.tsx','default',{draft:{...draft,assumptions:[]}});
 assert.match(html,/No additional assumptions proposed/);assert.match(html,/>Continue<\/button>/);assert.doesNotMatch(html,/type="radio"|disabled=""/);
});
test('an expired draft renders an explicit stop even when it contains no assumptions',()=>{
 const html=render('assumption-review-panel.tsx','default',{draft:{...draft,expiresAt:'2000-01-01T00:00:00.000Z',assumptions:[]}});
 assert.match(html,/This review is no longer current/);assert.match(html,/role="alert"/);assert.match(html,/disabled=""/);
});
test('the current review replaces the question form; stale reviews are hidden',()=>{
 const state={question:draft.question,phase:'reviewing-assumptions',assumptionReview:draft,history:[],error:null};
 const html=render('map-scenario-panel.tsx','default',{question:draft.question,state,toolsOpen:false,result:null});
 assert.match(html,/Review simulation assumptions/);assert.doesNotMatch(html,/<textarea|type="submit"|View Report/);
 const stale=render('map-scenario-panel.tsx','default',{question:'A changed question',state,toolsOpen:false,result:null});
 assert.doesNotMatch(stale,/Review simulation assumptions/);assert.match(stale,/<textarea/);
});
test('report labels allowed and rejected assumptions without treating rejection as false',()=>{
 const review={version:1,policy:'assumption-approval-v1',sourcePlanId:'dynamic-plan-'+'a'.repeat(64),contextKey:'b'.repeat(64),reviewedAt:'2026-11-02T00:00:00.000Z',items:[{assumptionId:'pay',text:'<img src=x onerror=alert(1)>',decision:'allow'},{assumptionId:'hours',text:'Daily work hours remain unchanged.',decision:'do-not-allow'}]};
 const html=render('assumption-review-panel.tsx','AssumptionReviewReport',{review});
 assert.match(html,/Assumption review/);assert.match(html,/Allowed/);assert.match(html,/Not allowed — treated as unknown/);assert.doesNotMatch(html,/<img/);assert.match(html,/&lt;img/);assert.match(html,/do not verify/);
 const empty=render('assumption-review-panel.tsx','AssumptionReviewReport',{review:{...review,items:[]}});assert.match(empty,/No additional assumptions were proposed; user continued/);
});
test('the actual report displays its saved decisions, and old reports do not invent a review',()=>{
 const result={question:draft.question,status:'completed',initialActions:[],roles:[],assumptions:[],runId:'safe-run',planId:null,accounting:{planningCalls:2,actionCalls:8,inputTokens:null,outputTokens:null,costUsd:null},sources:[],limitations:[],society:null};
 const review={version:1,policy:'assumption-approval-v1',sourcePlanId:'dynamic-plan-'+'a'.repeat(64),contextKey:'b'.repeat(64),reviewedAt:'2026-11-02T00:00:00.000Z',items:[{assumptionId:'pay',text:'Monthly pay remains unchanged.',decision:'do-not-allow'}]};
 const current=render('communication-report.tsx','default',{result:{...result,assumptionReview:review}});
 assert.match(current,/Assumption review/);assert.match(current,/Not allowed — treated as unknown/);assert.match(current,/Monthly pay remains unchanged/);
 const historical=render('communication-report.tsx','default',{result});assert.doesNotMatch(historical,/aria-label="Assumption review"/);
});
