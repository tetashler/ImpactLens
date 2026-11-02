import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {graphEntityTypes,graphEntityTypeColours,entityTypeColour} from '../../knowledge-graph/display.ts';
import {GraphRenderer,createGraphCore,graphElements} from '../../knowledge-graph/renderer.ts';
import type {KnowledgeGraph} from '../../knowledge-graph/contract.ts';

const graph:KnowledgeGraph={version:1,scenarioIdentity:'light-graph-fixture',limitations:[],nodes:Array.from({length:16},(_,i)=>({
 id:`node-${i}`,label:`Dynamic entity ${i}`,entityType:`Dynamic type ${i}`,category:'planning',description:'Appearance-only fixture.',
 provenance:{kind:'planning-only',reference:'Automated appearance fixture'},properties:{presentationCategory:['entity','role','person','aggregate'][i%4]},limitations:[],
})),edges:[{id:'edge',source:'node-0',target:'node-1',relationship:'describes',directed:true,description:'Fixture relationship.',provenance:{kind:'planning-only',reference:'Automated appearance fixture'}}]};
function luminance(colour:string):number {
 const values=colour.startsWith('#')?colour.slice(1).match(/../g)!.map(value=>parseInt(value,16)):colour.match(/[\d.]+/g)!.slice(0,3).map(Number);
 const rgb=values.map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
 return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];
}
function contrast(a:string,b:string):number {const values=[luminance(a),luminance(b)].sort((x,y)=>y-x);return (values[0]+.05)/(values[1]+.05);}

test('light graph retains sixteen dynamic colours visible on paper and matches the complete graph key',()=>{
 const original=structuredClone(graph),types=graphEntityTypes(graph,'light'),palette=graphEntityTypeColours(graph,'light'),elements=graphElements(graph,'light');
 assert.equal(new Set(types.map(type=>type.colour)).size,16);
 assert.deepEqual(graphEntityTypes({...graph,nodes:[...graph.nodes].reverse()},'light'),types);
 for(const type of types){
  assert.ok(contrast(type.colour,'#DDE3D9')>=3,`${type.name}: ${type.colour} is visible on paper`);
  assert.equal(palette.get(type.name),type.colour);
  assert.equal(elements.find(element=>element.data.entityType===type.name)?.data.colour,type.colour);
 }
 assert.deepEqual(graph,original);
 assert.deepEqual(graphElements(graph),graphElements(graph,'dark'));
 const singleton={...graph,nodes:[{...graph.nodes[0],entityType:'Ministry'}],edges:[]};
 assert.equal(graphEntityTypes(singleton)[0].colour,entityTypeColour('Ministry'));
});

test('light canvas uses readable labels, paper backplates and clear selected edges without changing record shapes',()=>{
 const dark=createGraphCore(graph),light=createGraphCore(graph,undefined,'light');
 try{
  for(const node of light.nodes()){
   assert.ok(contrast(node.style('color'),'#DDE3D9')>=4.5,`${node.id()} readable label`);
   assert.equal(node.style('shape'),dark.getElementById(node.id()).style('shape'));
   assert.ok(contrast(node.style('color'),node.style('text-background-color'))>=4.5,`${node.id()} readable backplate`);
  }
  const selected=light.getElementById('node-0');selected.addClass('focused');
  assert.ok(contrast(selected.style('color'),selected.style('text-background-color'))>=4.5);
  assert.ok(contrast(selected.style('border-color'),'#DDE3D9')>=3);
  const edge=light.getElementById('edge');edge.addClass('focused');
  assert.equal(edge.style('line-color'),'rgb(10,95,134)');
  assert.equal(edge.style('target-arrow-color'),'rgb(10,95,134)');
 }finally{dark.destroy();light.destroy();}
});

test('headless appearance changes preserve graph data, deterministic positions, filtering and selection',()=>{
 const original=structuredClone(graph),dark=new GraphRenderer(undefined,graph,()=>{}),light=new GraphRenderer(undefined,graph,()=>{},'light');
 try{
  assert.deepEqual(light.snapshot().positions,dark.snapshot().positions);
  light.filter(['Dynamic type 0'],'entity-type');light.select('node-0');
  assert.equal(light.snapshot().visibleNodes,1);
  assert.ok(light.core.getElementById('node-0').hasClass('focused'));
  assert.notEqual(light.core.getElementById('node-0').data('colour'),dark.core.getElementById('node-0').data('colour'));
  assert.deepEqual(graph,original);
 }finally{dark.dispose();light.dispose();}
});

test('light workspace filter and index swatches match the light canvas rather than the dark palette',()=>{
 const script=`
  import {registerHooks} from 'node:module';
  import {readFileSync,existsSync} from 'node:fs';
  import babel from 'next/dist/compiled/babel/core.js';
  import typescript from 'next/dist/compiled/babel/preset-typescript.js';
  import react from 'next/dist/compiled/babel/preset-react.js';
  import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
  registerHooks({resolve(specifier,context,next){if(specifier.startsWith('.')&&context.parentURL){for(const suffix of ['.tsx','.ts']){const candidate=new URL(specifier+suffix,context.parentURL);if(existsSync(candidate))return next(candidate.href,context);}}return next(specifier,context);},
   load(url,context,next){if(url.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(url.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(url),'utf8'),{filename:new URL(url).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return next(url,context);}});
  const {default:KnowledgeWorkspace}=await import(${JSON.stringify(new URL('../../../components/knowledge-workspace.tsx',import.meta.url).href)});
  process.stdout.write(renderToStaticMarkup(createElement(KnowledgeWorkspace,{graph:JSON.parse(readFileSync(0,'utf8')),visible:true,appearance:'light',onReturn(){}})));
 `;
 const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(graph),encoding:'utf8',timeout:15000});
 assert.equal(result.status,0,result.stderr);
 for(const node of graphElements(graph,'light').filter(element=>element.data.entityType)){
  const type=String(node.data.entityType),colour=String(node.data.colour);
  assert.match(result.stdout,new RegExp(`<i style="background:${colour}"[^>]*><\\/i><span>${type}<\\/span>`));
  assert.match(result.stdout,new RegExp(`data-entity-id="${node.data.id}"[^>]*><i style="background:${colour}"`));
 }
});
