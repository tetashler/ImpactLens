import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {execFile} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync,readdirSync,rmSync,rmdirSync,mkdirSync,statSync,symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {appendRejectionObservation,createRejectionObserver,parseRejectionObservation} from '../../server/society/rejection-observations.ts';

const session='10000000-0000-0000-0000-000000000001';
const diagnostic=()=>({version:1,family:'SOCIAL_TARGET',subreason:'unoffered-issue-evidence',stage:'menu',field:'issueEvidenceId',offeredOption:{actionOffered:true,evidenceOffered:false,action:'reply',issueKind:null}});
const isolated=(run:(root:string)=>void)=>{const root=mkdtempSync(join(tmpdir(),'rejection-observations-'));try{run(root);}finally{rmSync(root,{recursive:true,force:true});}};

test('sidecar appends only hashed context identity and finite diagnostic metadata outside world journal discovery',()=>isolated(root=>{
 const contextId='PRIVATE_CONTEXT_ID_SENTINEL';
 assert.equal(appendRejectionObservation(root,session,contextId,diagnostic()),true);
 assert.equal(appendRejectionObservation(root,session,contextId+'-next',diagnostic()),true);
 const files=readdirSync(root);assert.deepEqual(files,[session+'.rejections-v1']);assert.ok(files.every(file=>!file.endsWith('.jsonl')));
 const text=readFileSync(join(root,files[0]),'utf8'),rows=text.trimEnd().split('\n');assert.equal(rows.length,2);assert.ok(text.endsWith('\n'));assert.ok(!text.includes(contextId));
 assert.ok(rows.every(row=>Buffer.byteLength(row+'\n')<=1024));
 assert.deepEqual(JSON.parse(rows[0]),{version:1,contextSha256:createHash('sha256').update(contextId).digest('hex'),diagnostic:diagnostic()});
 assert.equal(parseRejectionObservation(JSON.parse(rows[1])).version,1);
}));

test('sidecar refuses unsafe diagnostics or path identities without creating any files',()=>isolated(root=>{
 const marker='PRIVATE_OUTPUT_SENTINEL';
 for(const bad of [{...diagnostic(),text:marker},{...diagnostic(),subreason:marker},{...diagnostic(),offeredOption:{...diagnostic().offeredOption,submittedId:marker}}])assert.equal(appendRejectionObservation(root,session,'context',bad),false);
 for(const badSession of ['../escape','',session+'.jsonl','Z0000000-0000-0000-0000-000000000001']){
  assert.equal(appendRejectionObservation(root,badSession,'context',diagnostic()),false);
 }
 assert.equal(appendRejectionObservation(root,session,'',diagnostic()),false);
 assert.equal(appendRejectionObservation(root,session,'x'.repeat(1025),diagnostic()),false);
 assert.deepEqual(readdirSync(root),[]);
}));

test('sidecar drops observations at one MiB without modifying existing bytes',()=>isolated(root=>{
 const path=join(root,session+'.rejections-v1'),full=Buffer.alloc(1024*1024,10);writeFileSync(path,full);
 assert.equal(appendRejectionObservation(root,session,'context',diagnostic()),false);
 assert.equal(statSync(path).size,1024*1024);assert.deepEqual(readFileSync(path),full);
 assert.deepEqual(readdirSync(root),[session+'.rejections-v1']);
}));

test('sidecar refuses a torn row and preserves another writer ownership marker',()=>isolated(root=>{
 const path=join(root,session+'.rejections-v1');writeFileSync(path,'{"version":1');
 assert.equal(appendRejectionObservation(root,session,'context',diagnostic()),false);assert.equal(readFileSync(path,'utf8'),'{"version":1');
 const lock=path+'.lock';writeFileSync(lock,'other-owner');
 assert.equal(appendRejectionObservation(root,session,'context',diagnostic()),false);assert.equal(readFileSync(lock,'utf8'),'other-owner');
}));

test('observer storage errors and invalid input remain inert for the caller',()=>isolated(root=>{
 const blocked=join(root,'blocked');writeFileSync(blocked,'existing-file');
 const observe=createRejectionObserver(blocked,session);assert.doesNotThrow(()=>observe('context',diagnostic()));assert.equal(readFileSync(blocked,'utf8'),'existing-file');
 const missing=join(root,'missing');assert.equal(appendRejectionObservation(missing,session,'context',diagnostic()),false);assert.deepEqual(readdirSync(root),['blocked']);
 const successful=createRejectionObserver(root,session);assert.doesNotThrow(()=>successful('context',diagnostic()));
 assert.equal(readFileSync(join(root,session+'.rejections-v1'),'utf8').trimEnd().split('\n').length,1);
}));

test('sidecar refuses directory targets and linked files without modifying their contents',()=>isolated(root=>{
 const path=join(root,session+'.rejections-v1');mkdirSync(path);
 assert.equal(appendRejectionObservation(root,session,'context',diagnostic()),false);assert.ok(statSync(path).isDirectory());rmdirSync(path);
 const other=join(root,'other');writeFileSync(other,'preserved');
 try{symlinkSync(other,path,'file');}catch(error){if(['EPERM','EACCES'].includes((error as NodeJS.ErrnoException).code??''))return;throw error;}
 assert.equal(appendRejectionObservation(root,session,'context',diagnostic()),false);assert.equal(readFileSync(other,'utf8'),'preserved');
}));

test('observation parser rejects raw identities, extra payloads and arbitrary hashes',()=>{
 const value={version:1,contextSha256:'a'.repeat(64),diagnostic:diagnostic()},parsed=parseRejectionObservation(value);assert.ok(Object.isFrozen(parsed));
 for(const bad of [{...value,version:2},{...value,contextSha256:'raw-private-context'},{...value,contextId:'private'},{...value,diagnostic:{...diagnostic(),raw:'private'}}])assert.throws(()=>parseRejectionObservation(bad));
});

test('concurrent writers admit only the final bounded row and never overfill the sidecar',async()=>{
 const root=mkdtempSync(join(tmpdir(),'rejection-observations-concurrent-'));
 try{
  const path=join(root,session+'.rejections-v1'),rowBytes=Buffer.byteLength(JSON.stringify({version:1,contextSha256:'a'.repeat(64),diagnostic:diagnostic()})+'\n');
  writeFileSync(path,Buffer.alloc(1024*1024-rowBytes,10));
  const moduleUrl=new URL('../../server/society/rejection-observations.ts',import.meta.url).href;
  const script="await import('./scripts/testing/offline-network.mjs');const {appendRejectionObservation}=await import(process.argv[1]);process.stdout.write(String(appendRejectionObservation(process.argv[2],process.argv[3],process.argv[4],JSON.parse(process.argv[5]))));";
  const results=await Promise.all(Array.from({length:8},(_,i)=>new Promise<string>((resolve,reject)=>{
   execFile(process.execPath,['--input-type=module','-e',script,moduleUrl,root,session,'context-'+i,JSON.stringify(diagnostic())],{timeout:10000,maxBuffer:4096},(error,stdout)=>error?reject(error):resolve(stdout));
  })));
  assert.equal(results.filter(value=>value==='true').length,1);assert.ok(results.every(value=>value==='true'||value==='false'));
  assert.equal(statSync(path).size,1024*1024);assert.deepEqual(readdirSync(root),[session+'.rejections-v1']);
  const last=readFileSync(path,'utf8').trimEnd().split('\n').at(-1)!;assert.equal(parseRejectionObservation(JSON.parse(last)).version,1);
 }finally{rmSync(root,{recursive:true,force:true});}
});
