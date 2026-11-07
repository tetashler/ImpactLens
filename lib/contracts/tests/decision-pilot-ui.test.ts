import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

function render(exportName:string,props:unknown){
  const url=new URL('../../../components/decision-pilot.tsx',import.meta.url).href;
  const script=`import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';import babel from 'next/dist/compiled/babel/core.js';import ts from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const x of ['.tsx','.ts']){const u=new URL(s+x,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});const m=await import(${JSON.stringify(url)});process.stdout.write(renderToStaticMarkup(createElement(m[${JSON.stringify(exportName)}],JSON.parse(readFileSync(0,'utf8')))));`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{input:JSON.stringify(props),encoding:'utf8',timeout:15_000});
  assert.equal(result.status,0,result.stderr);return result.stdout;
}
test('reviewer entry requests a local packet and explicit consent without exposing creator controls',()=>{
  const html=render('default',{});
  assert.match(html,/type="file"/);assert.match(html,/reviewer packet/i);
  assert.match(html,/in memory/i);assert.match(html,/independent/i);assert.match(html,/consent/i);
  assert.doesNotMatch(html,/answer key|Create study|Analyse study|localStorage/);
});
test('case content escapes imported text and labels references and fictional dialogue',()=>{
  // TEST-ONLY fixture; never participant or synthetic evaluation evidence.
  const item={id:'TEST:case',caseId:'test-case',order:1,question:'<img src=x onerror=alert(1)>',decisionQuestion:'TEST-ONLY: Is the stated claim supported?',brief:'TEST-ONLY <script>brief</script>',sources:[{id:'test-source',title:'Test source',url:'https://example.org/test',publisher:'Test',accessedAt:'2026-11-07',summary:'TEST-ONLY summary'}],discussion:[{id:'test-discussion',actorLabel:'Fictional <actor>',text:'TEST-ONLY <script>dialogue</script>'}]};
  const html=render('PilotPacketView',{item});
  assert.doesNotMatch(html,/<img|<script>/);assert.match(html,/&lt;img/);
  assert.match(html,/test-source/);assert.match(html,/test-discussion/);assert.match(html,/fictional/i);
  assert.match(html,/href="https:\/\/example.org\/test"/);
});
test('finishing the last case does not call skipped expired cases complete',()=>{
  const incomplete=render('PilotCompletionNotice',{completed:5});
  assert.match(incomplete,/5 of 6/);assert.match(incomplete,/missing/);assert.doesNotMatch(incomplete,/All six cases are complete/);
  const complete=render('PilotCompletionNotice',{completed:6});
  assert.match(complete,/All six cases are complete/);
});
