import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

// Render real components with the same isolated TSX loader used by the UI tests.
// SSR checks visible controls and disclosure content; browser checks own WebGL.
function render(component:string,props:unknown):string {
  const url=new URL(`../../../components/${component}.tsx`,import.meta.url).href;
  const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import ts from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const ext of ['.tsx','.ts']){const u=new URL(s+ext,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(/\\.tsx?$/.test(u))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:u.endsWith('.tsx'),allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});const {default:View}=await import(${JSON.stringify(url)});process.stdout.write(renderToStaticMarkup(createElement(View,JSON.parse(readFileSync(0,'utf8')))));`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(props),encoding:'utf8',timeout:20000});
  assert.equal(result.status,0,result.stderr||result.error?.message||'React SSR child failed');
  return result.stdout;
}

test('map surface keeps camera and layer actions without pedestrian controls or permanent instructions',()=>{
  for(const exploring of [true,false]){
    const html=render('singapore-map',{exploring,editing:true,focusKey:0,aac:{active:false},citizens:{enabled:true,playing:true,networkView:'baseline',focusKey:0},catalog:{stations:[],lines:[],connections:[]},draft:{stations:[],segments:[]},mode:'anchor',disabledSegments:[],comparison:null});
    assert.match(html,/>Fit Singapore<\/button>/);
    assert.match(html,/3D view<\/button>/);
    assert.match(html,/<summary>Map layers<\/summary>/);
    assert.doesNotMatch(html,/Focus pedestrians|Illustrative citizens|>Citizens<|citizen animation|map-top-card/);
  }
});

test('one compact source row keeps visible OSM, URA and licence links with an accessible disclosure trigger',()=>{
  const html=render('building-credits',{view:'unified',manifest:null});
  const row=html.split('<dialog')[0];
  assert.match(row,/href="https:\/\/www.openstreetmap.org\/copyright"[^>]*>© OpenStreetMap contributors/);
  assert.match(row,/URA boundaries/);
  assert.match(row,/href="https:\/\/data.gov.sg\/open-data-licence"/);
  assert.match(row,/aria-haspopup="dialog"/);
  assert.equal((row.match(/Sources &amp; licences/g)||[]).length,1);
  assert.doesNotMatch(row,/Internal local review only/);
  assert.doesNotMatch(row,/<p/);
  assert.match(html,/not cleared for public demonstration, hosting or redistribution/);
  assert.match(html,/boundary.*acquisition|acquisition.*boundary/i);
  assert.match(html,/compatibility.*ODbL|ODbL.*compatibility/i);
});

test('source registry retains attribution, dates and source/licence URLs while HDB fallback discloses uncertainty',()=>{
  const source={id:'overture',datasetId:'release',title:'Overture Buildings',publisher:'Overture Maps Foundation',url:'https://docs.overturemaps.org/guides/buildings/',licenceUrl:'https://opendatacommons.org/licenses/odbl/1-0/',referenceDate:'2026-10-21.0',accessedDate:'2026-10-28',rawSha256:'a'.repeat(64),attribution:'© OpenStreetMap contributors, Overture Maps Foundation; Microsoft ML Buildings; Google Open Buildings (CC BY 4.0).'};
  const html=render('building-credits',{view:'unified',manifest:{source,sources:[source]}});
  for(const value of [source.url,source.licenceUrl,source.referenceDate,source.accessedDate,'Microsoft ML Buildings','Google Open Buildings'])assert.ok(html.includes(value),value);
  const fallback=render('building-credits',{view:'hdb',manifest:null});
  assert.match(fallback,/original acquisition receipt is unavailable/);
  assert.match(fallback,/illustrative 12 m/);
});
