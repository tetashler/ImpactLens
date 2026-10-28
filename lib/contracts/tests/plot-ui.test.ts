import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

test('persistent landing and General composers have distinct accessible input/description IDs and escape questions',()=>{
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
