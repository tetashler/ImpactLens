import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {createExperiment} from '../../experiments/contract.ts';
import {createDefaultConfiguration} from '../../experiments/configuration.ts';

function render(experiment:unknown){
  const component=new URL('../../../components/stakeholder-workspace.tsx',import.meta.url).href;
  const code=`import {registerHooks} from 'node:module';import{readFileSync,existsSync}from'node:fs';import babel from'next/dist/compiled/babel/core.js';import ts from'next/dist/compiled/babel/preset-typescript.js';import react from'next/dist/compiled/babel/preset-react.js';import{createElement}from'react';import{renderToStaticMarkup}from'react-dom/server';registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL)for(const ext of['.tsx','.ts']){const u=new URL(s+ext,c.parentURL);if(existsSync(u))return n(u.href,c);}return n(s,c);},load(u,c,n){if(u.endsWith('.css'))return{format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return{format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[ts,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c);}});const{default:View}=await import(${JSON.stringify(component)});process.stdout.write(renderToStaticMarkup(createElement(View,{open:true,question:'Current edited question',scenarioIdentity:'current',experiment:${JSON.stringify(experiment)},contextToken:'revision-4',onClose(){},onUseExample(){},onGraph(){},onLinkedGraph(){}})));`;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',code],{encoding:'utf8',timeout:20000});
  assert.equal(result.status,0,result.stderr);return result.stdout;
}
test('integrated stakeholder controls use the saved snapshot and restrict roles without duplicate scenario editors',async()=>{
  const question='What if Singapore leaves ASEAN? <script>alert(1)</script>';
  const configuration={...createDefaultConfiguration(question),stakeholderFocus:['businesses-trade']} as ReturnType<typeof createDefaultConfiguration>;
  const record=await createExperiment({question,configuration,evidence:null});
  const html=render(record);
  assert.match(html,/Frozen saved experiment/);
  assert.match(html,new RegExp(record.experimentId));
  assert.match(html,new RegExp(record.scenarioIdentity));
  assert.match(html,new RegExp(record.configurationIdentity));
  assert.match(html,/&lt;script&gt;/);assert.doesNotMatch(html,/<script>/);
  assert.doesNotMatch(html,/aria-label="Withdrawal process"|aria-label="Trade arrangements"|Exploration horizon \(years\)|Import evidence JSON/);
  assert.match(html,/Regional small-business owner/);assert.match(html,/Supply-chain operator/);
  assert.doesNotMatch(html,/Regional cooperation analyst|Export-sector worker|Household representative/);
  assert.match(html,/Scenario differences/);assert.match(html,/Synthetic-run differences/);
});
test('integrated panel without a saved record cannot silently execute the current question',()=>{
  const html=render(null);
  assert.match(html,/Select a saved experiment/);
  assert.match(html,/disabled="">Start simulation/);
  assert.doesNotMatch(html,/aria-label="Withdrawal process"|Import evidence JSON/);
});
