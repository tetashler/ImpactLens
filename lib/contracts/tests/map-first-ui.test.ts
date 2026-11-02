import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createQuestionSimulation} from '../../question-simulation/client.ts';
import {handleDynamicRequest} from '../../server/inference/dynamic-service.ts';
import {worldFixtures as dynamicFixtures} from '../../world-graph/fixtures.ts';
import {mockDynamicProvider} from './helpers/dynamic-provider.ts';
import {mapResultFor} from '../../question-simulation/map-view.ts';

function render(name:string,props:unknown){
 const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import ts from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const x of ['.tsx','.ts']){const u=new URL(s+x,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});const m=await import(${JSON.stringify(new URL('../../../components/map-scenario-panel.tsx',import.meta.url).href)});const p=JSON.parse(readFileSync(0,'utf8')),noop=()=>{};process.stdout.write(renderToStaticMarkup(createElement(m[${JSON.stringify(name)}],{...p,onQuestion:noop,onExplore:noop,onCancel:noop,onToggleTools:noop,onGraph:noop,onReport:noop,onArchive:noop,onMap:noop,onReviewPlot:noop})));`;
 const r=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(props),encoding:'utf8',timeout:15000});assert.equal(r.status,0,r.stderr);return r.stdout;
}
const fixture=dynamicFixtures()[0];
const context={question:fixture.request.question,geometry:fixture.request.geometry,geometryRevision:fixture.request.geometryRevision};
const initial=()=>{const c=createQuestionSimulation({execution:'dynamic'});c.invalidate(context);const s=c.getSnapshot();c.dispose();return s;};
test('primary navigation contains only Map, Knowledge Graph and Report',()=>{
 const html=render('WorkspaceViews',{current:'map'});assert.equal([...html.matchAll(/<button\b/g)].length,3);assert.match(html,/>Map<\/button>/);assert.match(html,/>Knowledge Graph<\/button>/);assert.match(html,/>Report<\/button>/);assert.doesNotMatch(html,/Simulation|landing|Start new scenario/);
});
test('map composer places collapsed Plot Tools immediately before Explore, without old forms or result links',()=>{
 const html=render('default',{question:context.question,state:initial(),toolsOpen:false,result:null});assert.match(html,/aria-expanded="false"/);assert.match(html,/>Plot Tools<\/button>\s*<button[^>]*type="submit"[^>]*>Explore<\/button>/);assert.doesNotMatch(html,/View Knowledge Graph|View Report|Category hint|Try another question|Add a point using coordinates|type="number"|Start Simulation/);assert.equal([...html.matchAll(/<textarea\b/g)].length,1);
});
test('pending map execution keeps the form with cancellation and no premature result links',()=>{
 const html=render('default',{question:context.question,state:{...initial(),phase:'preparing'},toolsOpen:false,result:null});assert.match(html,/>Cancel<\/button>/);assert.match(html,/role="status"/);assert.match(html,/disabled=""[^>]*type="submit"|type="submit"[^>]*disabled=""/);assert.doesNotMatch(html,/View Knowledge Graph|View Report/);
});

for(const analysisMode of ['location-context','clarification'] as const)test(`map ${analysisMode} review explains the stop without reporting execution failure`,()=>{
 const question='What if a polyclinic was built at this location?';
 const message='The plotted sites provide location context. This intervention has no supported quantitative model.';
 const state={...initial(),question,phase:'needs-map-review',error:message,hybridReview:{version:1,kind:'hybrid-map-review',bindingKey:'a'.repeat(64),question,geometryRevision:1,interventionType:'new_polyclinic',analysisMode,message,limitations:[]}};
 const html=render('default',{question,state,toolsOpen:false,result:null});
 assert.match(html,analysisMode==='location-context'?/Location context available/:/Map review needed/);
 assert.match(html,/No agent simulation has started\./);
 assert.match(html,analysisMode==='location-context'?/This plotted scenario cannot start an agent simulation in the current flow\./:/Review the drawing and confirm the requested details before exploring again\./);
 assert.match(html,/The plotted sites provide location context/);
 assert.doesNotMatch(html,/Exploration could not complete|role="alert"|View Knowledge Graph|View Report/);
 const stale=render('default',{question:'Another scenario',state,toolsOpen:false,result:null});
 assert.doesNotMatch(stale,/Location context available|Map review needed|The plotted sites provide/);
});

test('actual map execution failures retain an error alert',()=>{
 const html=render('default',{question:context.question,state:{...initial(),phase:'error',error:'Provider unavailable'},toolsOpen:false,result:null});
 assert.match(html,/Exploration could not complete/);assert.match(html,/role="alert"/);assert.match(html,/Provider unavailable/);
});

test('unconfirmed route-and-station drawing offers a direct MRT setup review without starting inference',()=>{
 const question='What if a new mrt line is built here?';
 const message='Confirm the current station geometry and illustrative timing assumptions before calculating.';
 // The server represents missing confirmation as clarify, not new_mrt_line.
 const state={...initial(),question,phase:'needs-map-review',error:message,hybridReview:{version:1,kind:'hybrid-map-review',bindingKey:'b'.repeat(64),question,geometryRevision:13,interventionType:'clarify',analysisMode:'clarification',message,limitations:[]}};
 const html=render('default',{question,state,toolsOpen:false,result:null});
 assert.match(html,/>Review MRT setup<\/button>/);assert.match(html,/aria-controls="mrt-review-controls"/);
 assert.match(html,/Connect at least one station dot to an existing MRT station/);assert.match(html,/Confirm the station order/);assert.match(html,/Accept the illustrative travel times/);
 assert.doesNotMatch(html,/Exploration could not complete|View Knowledge Graph|View Report/);
 const stale=render('default',{question:'A different question',state,toolsOpen:false,result:null});assert.doesNotMatch(stale,/Review MRT setup/);
});
test('result links require the exact current question and geographic revision, and use actual completed runs',async()=>{
 const m=mockDynamicProvider(fixture),c=createQuestionSimulation({execution:'dynamic',fetcher:async(u,i)=>handleDynamicRequest(new Request('http://localhost'+u,i),{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher})});c.invalidate(context);await c.start();const state=c.getSnapshot();assert.equal(mapResultFor(state,context),'completed');
 const html=render('default',{question:context.question,state,toolsOpen:false,result:'completed'});assert.match(html,/>View Knowledge Graph<\/button>/);assert.match(html,/>View Report<\/button>/);
 assert.equal(mapResultFor(state,{...context,question:'Another question'}),null);assert.equal(mapResultFor(state,{...context,geometryRevision:context.geometryRevision+1}),null);
 const edited=structuredClone(context.geometry);edited.features.push({kind:'point',id:'new-point',label:'Point 1',coordinate:{lat:1.3,lon:103.8},role:'unassigned',provenance:'user-drawn'});assert.equal(mapResultFor(state,{...context,geometry:edited}),null);
 assert.equal(mapResultFor({...state,phase:'preparing'},context),null);c.dispose();
});
test('untrusted question text is escaped in the map composer',()=>{
 const html=render('default',{question:'<img src=x onerror=alert(1)>',state:initial(),toolsOpen:false,result:null});assert.doesNotMatch(html,/<img\b/);assert.match(html,/&lt;img/);
});
test('partial runs expose explicitly partial inspection without claiming successful completion',async()=>{
 let actions=0;const m=mockDynamicProvider(fixture,(body,reply)=>{if(body.response_format.json_schema.name==='stakeholder_turn_v1'&&++actions===3)reply.choices[0].message.content='invalid JSON';});
 const c=createQuestionSimulation({execution:'dynamic',fetcher:async(u,i)=>handleDynamicRequest(new Request('http://localhost'+u,i),{enabled:true,groundingKey:'',key:'mock',fetcher:m.fetcher})});c.invalidate(context);await c.start();const state=c.getSnapshot();assert.equal(state.run?.events.length,2);assert.equal(mapResultFor(state,context),'partial');
 const html=render('default',{question:context.question,state,toolsOpen:false,result:'partial'});assert.match(html,/Inspect partial Knowledge Graph/);assert.match(html,/Inspect partial Report/);assert.match(html,/Exploration interrupted/);assert.doesNotMatch(html,/>View Report<|Exploration complete/);c.dispose();
});
