/** Load the actual TSX dependency tree. No component stubs or relaxed privacy assertions. */
import {registerHooks,createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
let registered=false;
export async function renderableCommunicationReport(){
 if(!registered){
  const require=createRequire(import.meta.url),babel=require('next/dist/compiled/babel/core');
  registerHooks({
   resolve(specifier,context,next){
    if(specifier.startsWith('.')&&context.parentURL)for(const suffix of ['.tsx','.ts']){const u=new URL(specifier+suffix,context.parentURL);if(existsSync(u))return next(u.href,context);}
    return next(specifier,context);
   },
   load(url,context,next){
    if(url.endsWith('.css'))return {format:'module',source:'',shortCircuit:true};
    if(url.endsWith('.tsx'))return {format:'module',source:babel.transformSync(readFileSync(new URL(url),'utf8'),{filename:new URL(url).pathname,babelrc:false,configFile:false,presets:[[require.resolve('next/dist/compiled/babel/preset-typescript'),{allExtensions:true,isTSX:true}],[require.resolve('next/dist/compiled/babel/preset-react'),{runtime:'automatic'}]]}).code,shortCircuit:true};
    return next(url,context);
   },
  });registered=true;
 }
 return import(new URL('../../../../components/communication-report.tsx',import.meta.url).href);
}
