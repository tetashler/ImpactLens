/** Defence in depth for Next's Windows trace-glob matching. Never package local runtime state. */
import {existsSync,readdirSync,readFileSync,writeFileSync,renameSync,unlinkSync} from 'node:fs';
import {resolve,join,dirname,sep} from 'node:path';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';

export function sanitizeBuildTraces(projectRoot=process.cwd()):{manifests:number;removed:number}{
 const root=resolve(projectRoot),output=join(root,'.next'),traces:string[]=[];
 const normal=(path:string)=>process.platform==='win32'?path.toLowerCase():path;
 const privateRoots=['data/derived/agents','data/synthetic','tmp'].map(path=>normal(resolve(root,path)));
 const isPrivate=(file:string)=>privateRoots.some(base=>file===base||file.startsWith(base+sep));
 function visit(directory:string){if(!existsSync(directory))return;for(const entry of readdirSync(directory,{withFileTypes:true})){if(entry.isSymbolicLink())continue;const path=join(directory,entry.name);if(entry.isDirectory())visit(path);else if(entry.isFile()&&entry.name.endsWith('.nft.json'))traces.push(path);}}
 visit(join(output,'server'));
 if(existsSync(output))for(const entry of readdirSync(output,{withFileTypes:true}))if(entry.isFile()&&entry.name.endsWith('.nft.json'))traces.push(join(output,entry.name));
 let removed=0;
 for(const path of traces){
  const manifest=JSON.parse(readFileSync(path,'utf8'));if(!Array.isArray(manifest.files)||!manifest.files.every((file:unknown)=>typeof file==='string'))throw Error('Invalid build trace manifest.');
  const retained=manifest.files.filter((file:string)=>!isPrivate(normal(resolve(dirname(path),file))));
  if(retained.length===manifest.files.length)continue;removed+=manifest.files.length-retained.length;
  const pending=path+'.'+randomUUID()+'.privacy.tmp';
  try{writeFileSync(pending,JSON.stringify({...manifest,files:retained}));renameSync(pending,path);}finally{if(existsSync(pending))unlinkSync(pending);}
 }
 return {manifests:traces.length,removed};
}
if(process.argv[1]&&fileURLToPath(import.meta.url)===resolve(process.argv[1]))console.log('Private build-trace filtering:',JSON.stringify(sanitizeBuildTraces()));
