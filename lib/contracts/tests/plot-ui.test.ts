import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('independent composer instances have distinct accessible input/description IDs and escape questions',()=>{
  const component=new URL('../../../components/scenario-composer.tsx',import.meta.url).href;
  const script=`
    import {registerHooks} from 'node:module';
    import {readFileSync,existsSync} from 'node:fs';
    import babel from 'next/dist/compiled/babel/core.js';
    import typescript from 'next/dist/compiled/babel/preset-typescript.js';
    import react from 'next/dist/compiled/babel/preset-react.js';
    import {createElement,Fragment} from 'react';
    import {renderToStaticMarkup} from 'react-dom/server';
    registerHooks({
      resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL){for(const suffix of ['.tsx','.ts']){const candidate=new URL(specifier+suffix,context.parentURL);if(existsSync(candidate))return next(candidate.href,context);}}return next(specifier,context);},
      load(url,context,next){if(url.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(url.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(url),'utf8'),{filename:new URL(url).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return next(url,context);}
    });
    const {default:Composer}=await import(${JSON.stringify(component)});
    const planner={question:'<img src=x onerror="alert(1)">',busy:false,response:null,submittedQuestion:null,error:'',setQuestion(){},setCategory(){},submit(){}};
    process.stdout.write(renderToStaticMarkup(createElement(Fragment,null,createElement(Composer,{planner,onConfigure(){},compact:true}),createElement(Composer,{planner,onConfigure(){}}))));
  `;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{encoding:'utf8'});
  assert.equal(result.status,0,result.stderr);
  const html=result.stdout;
  const inputs=[...html.matchAll(/<textarea[^>]*id="([^"]+)"[^>]*aria-describedby="([^"]+)"/g)];
  assert.equal(inputs.length,2);
  assert.notEqual(inputs[0][1],inputs[1][1]);
  assert.notEqual(inputs[0][2],inputs[1][2]);
  for(const [,id,hint] of inputs){assert.ok(html.includes(`for="${id}">Your what-if question</label>`));assert.ok(html.includes(`id="${hint}"`));}
  assert.doesNotMatch(html,/<img|<script/i);
  assert.match(html,/&lt;img/);
});

function renderPlotUi(component: string, setup: string) {
  const componentUrl = new URL(`../../../components/${component}.tsx`, import.meta.url).href;
  const script = `
    import {registerHooks} from 'node:module';
    import {readFileSync,existsSync} from 'node:fs';
    import babel from 'next/dist/compiled/babel/core.js';
    import typescript from 'next/dist/compiled/babel/preset-typescript.js';
    import react from 'next/dist/compiled/babel/preset-react.js';
    import {createElement} from 'react';
    import {renderToStaticMarkup} from 'react-dom/server';
    registerHooks({
      resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL){for(const suffix of ['.tsx','.ts']){const candidate=new URL(specifier+suffix,context.parentURL);if(existsSync(candidate))return next(candidate.href,context);}}return next(specifier,context);},
      load(url,context,next){if(url.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(url.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(url),'utf8'),{filename:new URL(url).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return next(url,context);}
    });
    const {default:Component}=await import(${JSON.stringify(componentUrl)});
    const noop=()=>{};
    ${setup}
    process.stdout.write(renderToStaticMarkup(createElement(Component,props)));
  `;
  const result = spawnSync(process.execPath, ['--input-type=module', '--eval', script], { encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout;
}

const inspectorSetup = `
  const {createScenarioPlan}=await import(${JSON.stringify(new URL('../../scenarios/contract.ts', import.meta.url).href)});
  const point={kind:'point',id:'site',label:'Proposed site',role:'site',coordinate:{lat:1.312345,lon:103.812345},provenance:'user-drawn'};
  const props={planner:{question:'',submittedQuestion:null,response:null,busy:false,error:'',setQuestion:noop,setCategory:noop,submit:noop},plot:{geometry:{version:1,scenarioId:'test',features:[point]},selection:{id:'site'},activeLineId:null,revision:0},hidden:false,onEdit:noop};
`;

test('point inspector leaves one authoritative question input outside the drawing controls and offers map-based positioning', () => {
  const html = renderPlotUi('general-plot-panel', inspectorSetup);
  assert.doesNotMatch(html, /<textarea|A question and a place to explore|Add a point using coordinates|Latitude|Longitude|1\.3123|103\.8123/);
  assert.match(html, /Selected point label/);
  assert.match(html, /Point role/);
  assert.match(html, /Move earlier/);
  assert.match(html, /Remove point/);
});

test('MRT inspector preserves explicit confirmation and a station-search fallback without point coordinates', () => {
  const html = renderPlotUi('general-plot-panel', inspectorSetup + `
    props.planner.response={version:1,clientRequestId:'test-ui',method:'deterministic-fallback',providerStatus:'not-configured',plan:await createScenarioPlan({version:1,clientRequestId:'test-ui',question:'Build new MRT stations'},{version:1,intent:'mrt-line',capabilityId:'mrt-accessibility-v1'})};
    props.anchors={};props.pendingAnchor={stationId:'EW17',pointId:'site'};
    props.catalog={stations:[{id:'EW17',name:'Tiong Bahru',kind:'existing',lines:['EW']} ]};
  `);
  assert.match(html, /Find an existing station/);
  assert.match(html, /Confirm interchange/);
  assert.match(html, /These selected dots are stations in this order/);
  assert.match(html, /I accept illustrative travel and transfer times/);
  assert.match(html, /disabled="">Calculate MRT impact/);
  assert.doesNotMatch(html, /1\.3123|103\.8123/);
});

test('AAC inspector preserves its location confirmation, evidence acknowledgement and calculation gate', () => {
  const html = renderPlotUi('general-plot-panel', inspectorSetup + `
    props.planner.response={version:1,clientRequestId:'test-ui',method:'deterministic-fallback',providerStatus:'not-configured',plan:await createScenarioPlan({version:1,clientRequestId:'test-ui',question:'Open a new Active Ageing Centre'},{version:1,intent:'aac',capabilityId:'aac-accessibility-v1'})};
    props.aac={draft:{thresholdMetres:500},busy:false,error:'',facilityError:'',validation:''};
  `);
  assert.match(html, /Proposed centre point/);
  assert.match(html, /I understand the limited catalogue/);
  assert.match(html, /disabled="">Confirm centre location/);
  assert.match(html, /disabled="">Calculate AAC impact/);
});

test('route inspector preserves vertex selection and reordering while map handles control placement', () => {
  const html = renderPlotUi('general-plot-panel', inspectorSetup + `
    props.plot.geometry.features=[{kind:'line',id:'route',label:'New route',coordinates:[point.coordinate,{lat:1.32,lon:103.82}],provenance:'user-drawn'}];
    props.plot.selection={id:'route',vertex:0};
  `);
  assert.match(html, /Vertex 1/);
  assert.match(html, /Move vertex 1 later/);
  assert.match(html, /Remove vertex 1/);
  assert.doesNotMatch(html, /Latitude|Longitude|1\.3123|103\.8123|type="number"/);
});

test('submitted composers keep their accessible question input without extra question or category disclosures', () => {
  const html = renderPlotUi('scenario-composer', `
    const props={planner:{question:'What if?',submittedQuestion:'What if?',response:null,busy:false,error:'',setQuestion:noop,setCategory:noop,submit:noop},onConfigure:noop};
  `);
  assert.equal([...html.matchAll(/<textarea/g)].length, 1);
  assert.match(html, /Your what-if question/);
  assert.doesNotMatch(html, /Try another question|Category hint|Scenario category hint/);
});
