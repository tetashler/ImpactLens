/** Explicit generated-artifact policy. No recursive deletes and no simulation/paid-state cleanup. */
import {lstatSync,realpathSync,readdirSync,readFileSync,unlinkSync,rmdirSync,existsSync} from 'node:fs';
import {join,resolve,relative,dirname,sep,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';

export const GENERATED_ROOTS=Object.freeze([
 '.next/cache','.next/dev','tmp/phase4e/private-tests','tmp/persistent-deployment','tmp/persistent-deployment-http',
 'tmp/storage-lifecycle-20261106','tmp/storage-archive-lifecycle','tmp/storage-lifecycle-review','tmp/storage-status-tests',
 'tmp/phase4e/private-benchmark-iBuMbL','tmp/phase4e/private-benchmark-jPLjSC','tmp/phase4e/private-benchmark-XfJWEm',
 'tmp/phase4e1/benchmark-private-jxwzuJ','tmp/phase4e1/benchmark-private-UUEY6r','tmp/phase4e1/benchmark-private-XNnCvo',
 'tmp/phase4e2/benchmark-private-1BQDKU','tmp/phase4e2/benchmark-private-2wS37d','tmp/phase4e2/benchmark-private-9bQXdX',
 'tmp/phase4e2/benchmark-private-iv4UCl','tmp/phase4e2/benchmark-private-r6BLfA','tmp/phase4e2/benchmark-private-XUgHek',
 'tmp/citizen-grounded-v1-20261031/benchmark/benchmark-private-vNsD9c',
 'tmp/citizen-hybrid-20261101/benchmark/benchmark-private-IeDDwo',
 ...['cLBGsl','EYeFvW','hyVZsI','LQd0Pw','oJTUWJ','oOzmjV','PsrILP','Qjl1Zn','V7fFml'].map(id=>'tmp/citizen-prose-repair-20261101/benchmark/benchmark-private-'+id),
]);
const oldFixture=/^(?:admission-cold-process-test|admission-timeout-smoke-guard-test|citizen-hybrid-guard-test|conversation-menu-v5-guard-test|hybrid-map-v2-guard-test|citizen-data-test|phase4e1-guard-test)-[A-Za-z0-9]{6}$/;
const md=/\.(md|markdown|mdx)$/i;
type Entry=Readonly<{path:string;bytes:number;mtime:number;inode:number;device:number}>;
type Protected=Readonly<{path:string;sha256:string}>;
export interface CleanupPlan {readonly version:1;readonly root:string;readonly files:readonly Entry[];readonly directories:readonly string[];readonly protectedFiles:readonly Protected[];readonly markdownPaths:readonly string[];readonly bytes:number;readonly skippedLinks:readonly string[]}
const plans=new WeakSet<CleanupPlan>();
function ensure(value:unknown,code:string):asserts value{if(!value)throw Error(code);}
const within=(parent:string,child:string)=>{const r=relative(parent,child);return r===''||!isAbsolute(r)&&r!=='..'&&!r.startsWith('..'+sep);};
const hash=(path:string)=>createHash('sha256').update(readFileSync(path)).digest('hex');
function markdownTargets(text:string){
 const targets:string[]=[];
 const starts=[...text.matchAll(/\]\(\s*/g),...text.matchAll(/^\s*\[[^\]\n]+\]:\s*/gm)];
 for(const start of starts){let i=start.index!+start[0].length,target='',depth=0;const angle=text[i]==='<';if(angle)i++;
  for(;i<text.length;i++){const c=text[i];if(c==='\n'||c==='\r'||angle&&c==='>')break;
   if(c==='\\'&&/[ ()\\]/.test(text[i+1]??'')){target+=text[++i];continue;}
   if(!angle){if(/\s/.test(c))break;if(c==='(')depth++;if(c===')'){if(depth===0)break;depth--;}}
   target+=c;
  }if(target)targets.push(target);
 }
 for(const match of text.matchAll(/\b(?:src|href)\s*=\s*["']([^"']+)["']/gi))targets.push(match[1]);
 return targets;
}
function child(root:string,path:string){const full=resolve(root,path);ensure(full!==root&&within(root,full),'WORKSPACE_CLEANUP_PATH');return full;}
function plain(root:string,path:string){
 ensure(within(root,path),'WORKSPACE_CLEANUP_PATH');
 for(let current=path;;current=dirname(current)){
  const stat=lstatSync(current);ensure(!stat.isSymbolicLink(),'WORKSPACE_CLEANUP_LINK');
  if(current===root)break;ensure(dirname(current)!==current,'WORKSPACE_CLEANUP_PATH');
 }
}
function entries(root:string,include:(path:string)=>boolean){const files:Entry[]=[],directories:string[]=[],links:string[]=[];
 function walk(path:string){for(const item of readdirSync(path,{withFileTypes:true})){const name=item.name;if(path===root&&['.git','node_modules'].includes(name))continue;const full=join(path,name),rel=relative(root,full).split(sep).join('/');
  if(item.isSymbolicLink()){links.push(rel);continue;}
  if(item.isDirectory()){directories.push(rel);walk(full);}else if(item.isFile()&&include(rel)){const stat=lstatSync(full);files.push(Object.freeze({path:rel,bytes:stat.size,mtime:stat.mtimeMs,inode:stat.ino,device:stat.dev}));}
 }}walk(root);return {files,directories,links};
}
/** Preview only. Source, docs, data and every Markdown file are outside the delete policy. */
export function planWorkspaceCleanup(projectRoot=process.cwd(),now=Date.now(),privateRoots:readonly string[]=[]):CleanupPlan{
 const root=resolve(projectRoot);ensure(realpathSync(root)===root,'WORKSPACE_CLEANUP_ROOT');
 ensure(existsSync(join(root,'.git'))&&JSON.parse(readFileSync(join(root,'package.json'),'utf8')).name==='impactlens-pre-hackathon-research','WORKSPACE_CLEANUP_ROOT');
 const roots=[...GENERATED_ROOTS];
 if(existsSync(join(root,'tmp'))){plain(root,join(root,'tmp'));for(const name of readdirSync(join(root,'tmp'))){if(!oldFixture.test(name))continue;const path=join(root,'tmp',name),stat=lstatSync(path);if(stat.isDirectory()&&!stat.isSymbolicLink()&&now-stat.mtimeMs>=86400000)roots.push('tmp/'+name);}}
 const allowed=roots.map(path=>child(root,path)).filter(path=>{if(!existsSync(path))return false;plain(root,path);ensure(lstatSync(path).isDirectory(),'WORKSPACE_CLEANUP_PATH');return true;});
 const allowedNames=allowed.map(path=>relative(root,path).split(sep).join('/'));
 const beneath=(parent:string,path:string)=>parent===''||path===parent||path.startsWith(parent+'/');
 const candidate=(path:string)=>allowedNames.some(parent=>beneath(parent,path));
 const found=entries(root,path=>candidate(path)||md.test(path)||path.endsWith('/.test-artifact-retention.json')||/^(docs|Presentation|data)\//.test(path)||path==='.env.local'||path==='.env.example'||/^scripts\/testing\/.*\.json$/.test(path));
 const folders=new Set<string>(),protectedNames=new Set<string>();
 for(const value of privateRoots){const path=resolve(root,value);if(within(root,path))folders.add(existsSync(path)?realpathSync(path):path);}
 for(const file of found.files){
  if(md.test(file.path)){protectedNames.add(file.path);if(candidate(file.path))folders.add(dirname(child(root,file.path)));}
  if(file.path.endsWith('/.test-artifact-retention.json')&&candidate(file.path))folders.add(dirname(child(root,file.path)));
  if(/^(docs|Presentation|data)\//.test(file.path)||file.path==='.env.local'||file.path==='.env.example'||/^scripts\/testing\/.*\.json$/.test(file.path))protectedNames.add(file.path);
 }
 // Preserve actual local Markdown link targets, including images and reference-style links.
 for(const file of found.files.filter(f=>md.test(f.path))){const text=readFileSync(child(root,file.path),'utf8');
  for(let target of markdownTargets(text)){if(!target||/^(?:[a-z]+:|#|\/\/)/i.test(target)&&!isAbsolute(target))continue;try{target=decodeURIComponent(target.split('#')[0].split('?')[0]);}catch{continue;}if(!target)continue;
   const path=isAbsolute(target)?resolve(target):resolve(dirname(child(root,file.path)),target);if(!within(root,path)||path===root||!existsSync(path))continue;
   try{plain(root,path);}catch{continue;}const canonical=realpathSync(path),stat=lstatSync(canonical);if(stat.isDirectory())folders.add(canonical);else protectedNames.add(relative(root,canonical).split(sep).join('/'));
  }
 }
 const folderNames=[...folders].map(path=>relative(root,path).split(sep).join('/'));
 const kept=(file:Entry)=>protectedNames.has(file.path)||folderNames.some(folder=>beneath(folder,file.path));
 const files=found.files.filter(file=>candidate(file.path)&&!kept(file));
 const protectedFiles=found.files.filter(file=>protectedNames.has(file.path)||candidate(file.path)&&kept(file)).map(file=>Object.freeze({path:file.path,sha256:hash(child(root,file.path))}));
 const directories=found.directories.filter(path=>candidate(path)&&!folderNames.some(folder=>beneath(folder,path))).sort((a,b)=>b.length-a.length);
 const plan=Object.freeze({version:1 as const,root,files:Object.freeze(files),directories:Object.freeze(directories),protectedFiles:Object.freeze(protectedFiles),markdownPaths:Object.freeze(found.files.filter(f=>md.test(f.path)).map(f=>f.path).sort()),bytes:files.reduce((n,f)=>n+f.bytes,0),skippedLinks:Object.freeze(found.links)});plans.add(plan);return plan;
}
function protectedUnchanged(plan:CleanupPlan){for(const file of plan.protectedFiles){const path=child(plan.root,file.path);plain(plan.root,path);ensure(hash(path)===file.sha256,'WORKSPACE_CLEANUP_PROTECTED');}}
/** A plan must originate in this process; changed files and protected hashes are checked before removal. */
export function applyWorkspaceCleanup(plan:CleanupPlan){
 ensure(plans.has(plan),'WORKSPACE_CLEANUP_PLAN');ensure(realpathSync(plan.root)===plan.root,'WORKSPACE_CLEANUP_ROOT');protectedUnchanged(plan);
 const current=entries(plan.root,path=>md.test(path)||path.endsWith('/.test-artifact-retention.json'));ensure(JSON.stringify(current.files.filter(f=>md.test(f.path)).map(f=>f.path).sort())===JSON.stringify(plan.markdownPaths),'WORKSPACE_CLEANUP_CHANGED');
 for(const marker of current.files.filter(f=>f.path.endsWith('/.test-artifact-retention.json')))ensure(!plan.files.some(file=>within(dirname(child(plan.root,marker.path)),child(plan.root,file.path))),'WORKSPACE_CLEANUP_CHANGED');
 for(const file of plan.files){const path=child(plan.root,file.path);plain(plan.root,path);const stat=lstatSync(path);ensure(stat.isFile()&&stat.size===file.bytes&&stat.mtimeMs===file.mtime&&stat.ino===file.inode&&stat.dev===file.device,'WORKSPACE_CLEANUP_CHANGED');}
 let deletedBytes=0;const removed:string[]=[];
 for(const file of plan.files){const path=child(plan.root,file.path);plain(plan.root,path);ensure(!md.test(path),'WORKSPACE_CLEANUP_PROTECTED');unlinkSync(path);deletedBytes+=file.bytes;removed.push(file.path);}
 for(const name of plan.directories){const path=child(plan.root,name);if(!existsSync(path))continue;plain(plan.root,path);if(lstatSync(path).isDirectory()&&readdirSync(path).length===0)rmdirSync(path);}
 protectedUnchanged(plan);plans.delete(plan);return {version:1,deletedBytes,deletedFiles:removed.length,removed,protectedFilesVerified:plan.protectedFiles.length};
}
