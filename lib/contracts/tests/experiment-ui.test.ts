import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createExperiment,createDefaultConfiguration} from '../../experiments/index.ts';

function render(component:string,exportName:string,props:unknown):string{
  const url=new URL(`../../../components/${component}.tsx`,import.meta.url).href;
  const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import typescript from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,next){if(s.startsWith('.')&&c.parentURL){for(const x of ['.tsx','.ts']){const p=new URL(s+x,c.parentURL);if(existsSync(p))return next(p.href,c);}}return next(s,c);},load(u,c,next){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return next(u,c);}});const mod=await import(${JSON.stringify(url)});const props=JSON.parse(readFileSync(0,'utf8'));process.stdout.write(renderToStaticMarkup(createElement(mod[${JSON.stringify(exportName)}],{...props,onChange(){},onReturn(){}})));`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(props),encoding:'utf8',timeout:15000});
  assert.equal(result.status,0,result.stderr);return result.stdout;
}

test('actual ASEAN controls expose the requested defaults and explicit hypothetical semantics',()=>{
  const html=render('experiment-lab','ExperimentConfiguration',{configuration:createDefaultConfiguration('What if Singapore left ASEAN?'),geometry:{version:1,scenarioId:'ui',features:[]},plan:null});
  assert.match(html,/<option value="immediate" selected="">Immediate/);assert.match(html,/<option value="unresolved" selected="">Unresolved/);assert.match(html,/<option value="5" selected="">Five years/);
  assert.equal([...html.matchAll(/type="checkbox"/g)].length,3);assert.match(html,/not legally established/);assert.match(html,/does not produce a forecast/);
});

test('actual comparison renders changed assumptions, missing evidence and unknown outcomes without invented results',async()=>{
  const question='What if Singapore left ASEAN?',configuration=createDefaultConfiguration(question);
  const left=await createExperiment({question,configuration,evidence:null}),right=await createExperiment({question,configuration:{...configuration,horizonYears:10},evidence:null});
  const html=render('experiment-lab','ExperimentComparison',{left,right});
  assert.match(html,/5 years/);assert.match(html,/10 years/);assert.match(html,/changed/);assert.match(html,/missing/);assert.match(html,/outcomes remain unknown/);assert.doesNotMatch(html,/(GDP|approval) (will|increases|decreases)/);
});

test('user-authored text is escaped and source-empty evidence is an explicit gap',()=>{
  const c={...createDefaultConfiguration('What if a new policy?'),notes:'<img src=x onerror="alert(1)">'};
  const html=render('experiment-lab','ExperimentConfiguration',{configuration:c,geometry:{version:1,scenarioId:'ui',features:[]},plan:null});
  assert.match(html,/&lt;img/);assert.doesNotMatch(html,/<img\b/);
  assert.match(render('experiment-lab','ExperimentEvidence',{evidence:null}),/No evidence snapshot attached/);
});

test('archived graph navigation labels its scope even when projection is unavailable',()=>{
  const html=render('knowledge-workspace','default',{graph:null,visible:true,archived:true});
  assert.match(html,/Archived experiment snapshot/);assert.match(html,/Bound to an archived experiment/);
  assert.doesNotMatch(html,/>Bound to the current scenario</);
});

test('experiment client entry points never import server-only retrieval or AI providers',()=>{
  for(const name of ['experiment-lab.tsx','use-experiment-lab.ts']){
    const source=readFileSync(new URL(`../../../components/${name}`,import.meta.url),'utf8');
    assert.doesNotMatch(source,/from ['"][^'"]*(?:\/server\/|node:|prototype\/agents)/);assert.doesNotMatch(source,/dangerouslySetInnerHTML/);
  }
});
