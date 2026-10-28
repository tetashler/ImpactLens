import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';

test('unavailable 3D controls cannot offer playback while illustrative profile inspection remains labelled',()=>{
  const component=new URL('../../../components/citizens-panel.tsx',import.meta.url).href,fixture=new URL('../../citizens/fixtures.ts',import.meta.url).href;
  const script=`
    import {registerHooks} from 'node:module';import {readFileSync,existsSync} from 'node:fs';
    import babel from 'next/dist/compiled/babel/core.js';import typescript from 'next/dist/compiled/babel/preset-typescript.js';import react from 'next/dist/compiled/babel/preset-react.js';
    import {createElement} from 'react';import {renderToStaticMarkup} from 'react-dom/server';
    registerHooks({resolve(s,c,n){if(s.startsWith('.')&&c.parentURL){for(const end of ['.ts','.tsx']){const u=new URL(s+end,c.parentURL);if(existsSync(u))return n(u.href,c)}}return n(s,c)},load(u,c,n){if(u.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};if(u.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(u),'utf8'),{filename:new URL(u).pathname,presets:[[typescript,{isTSX:true,allExtensions:true}],[react,{runtime:'automatic'}]],babelrc:false,configFile:false}).code,shortCircuit:true};return n(u,c)}});
    const {default:Panel}=await import(${JSON.stringify(component)}),{citizenViewPairFixture:pair}=await import(${JSON.stringify(fixture)});
    const noop=()=>{},html=renderToStaticMarkup(createElement(Panel,{pair,view:'baseline',selectedId:pair.baseline.citizens[0].agentId,playing:false,speed:1,elapsedSeconds:0,enabled:true,stats:{visible:0,fps:null,drawCalls:0,status:'3D citizens unavailable; profiles remain usable'},pedestrianArea:{id:'tiong-bahru',onChange:noop},onView:noop,onSelect:noop,onPlayPause:noop,onReset:noop,onSpeed:noop,onEnabled:noop,onFocus:noop,onImport:noop,onRestoreFixture:noop}));
    process.stdout.write(JSON.stringify({button:html.match(/<button[^>]*citizens-primary[^>]*>/)?.[0],disclosure:html.includes('not a calculated journey forecast'),profile:html.includes('Citizen 1')}));
  `;
  const result=spawnSync(process.execPath,['--input-type=module','--eval',script],{encoding:'utf8'});assert.equal(result.status,0,result.stderr);
  const output=JSON.parse(result.stdout);assert.match(output.button,/disabled/);assert.equal(output.disclosure,true);assert.equal(output.profile,true);
});
