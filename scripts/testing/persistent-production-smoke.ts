/** Linux acceptance of the built server. New isolated state, no paid APIs or user simulations. */
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,readdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {createServer} from 'node:net';
import {spawn,type ChildProcess} from 'node:child_process';
import {observeStartup} from './persistent-startup-diagnostics.ts';
import {invalidReleaseAssets} from '../../lib/server/deployment/preflight.ts';

assert.equal(process.platform,'linux','Run this acceptance on Linux after the production build.');
const state=mkdtempSync(join(tmpdir(),'impactlens-production-'));
const reservation=createServer();await new Promise<void>(yes=>reservation.listen(0,'127.0.0.1',yes));const address=reservation.address();assert.ok(address&&typeof address==='object');const port=address.port;await new Promise<void>(yes=>reservation.close(()=>yes()));
const env={...process.env,NODE_OPTIONS:'',NODE_ENV:'production' as const,NEXT_TELEMETRY_DISABLED:'1',IMPACTLENS_NODE_BINARY:process.execPath,IMPACTLENS_STATE_DIRECTORY:state,SOCIAL_STORAGE_ROOT:join(state,'simulations'),POPULATION_STORAGE_ROOT:join(state,'populations'),CITIZEN_DATASET_ROOT:join(state,'citizens'),SOCIAL_PROSE_OBSERVATION_ROOT:'',PORT:String(port),AI_PROVIDER:'',OPENROUTER_API_KEY:'',OPENROUTER_STT_API_KEY:'',ANTHROPIC_API_KEY:'',GEMINI_API_KEY:'',TAVILY_API_KEY:'',STAKEHOLDER_LIVE_ENABLED:'false',SOCIAL_LLM_ENABLED:'false'};
const children:ChildProcess[]=[];
const diagnostics=new WeakMap<ChildProcess,()=>string>();
const start=()=>{const child=spawn('/bin/sh',['deploy/start-single-instance.sh'],{env,stdio:['ignore','pipe','pipe']});diagnostics.set(child,observeStartup(child));children.push(child);return child;};
const exit=(child:ChildProcess)=>new Promise<number|null>((yes,no)=>{child.once('exit',yes);child.once('error',no);});
async function healthy(child:ChildProcess){
 for(let i=0;i<150;i++){
  const invalid=child.exitCode===null?[]:invalidReleaseAssets(process.cwd());
  assert.equal(child.exitCode,null,`The built server exited before liveness succeeded. Startup: ${diagnostics.get(child)?.()}. Invalid release assets: ${invalid.join(', ')||'none'}.`);
  try{const response=await fetch(`http://127.0.0.1:${port}/api/health`,{signal:AbortSignal.timeout(1000)});assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(await response.json(),{version:1,status:'ok'});return;}catch{}
  await new Promise(yes=>setTimeout(yes,100));
 }
 throw Error('PRODUCTION_HEALTH_TIMEOUT');
}
async function stop(child:ChildProcess){const stopped=exit(child);child.kill('SIGTERM');assert.equal(await stopped,143);}
const deadline=setTimeout(()=>{for(const child of children)if(child.exitCode===null)child.kill('SIGKILL');},45000);
try{
 const first=start();await healthy(first);
 const capacity=await (await fetch(`http://127.0.0.1:${port}/api/storage/status`)).json();assert.equal(capacity.available,32);assert.equal(capacity.archivedPeriods,0);
 assert.deepEqual(readdirSync(env.SOCIAL_STORAGE_ROOT),[]);assert.deepEqual(readdirSync(env.POPULATION_STORAGE_ROOT),[]);assert.deepEqual(readdirSync(env.CITIZEN_DATASET_ROOT),[]);
 writeFileSync(join(state,'operator-evidence'),'preserve across application restart');
 assert.equal(await exit(start()),73);await stop(first);
 const second=start();await healthy(second);assert.notEqual(second.pid,first.pid);assert.equal(readFileSync(join(state,'operator-evidence'),'utf8'),'preserve across application restart');
 assert.equal((await (await fetch(`http://127.0.0.1:${port}/api/storage/status`)).json()).available,32);
 await stop(second);
 console.log(JSON.stringify({status:'passed',health:true,duplicateRejected:true,restartPreservedState:true,providerCalls:0}));
}finally{
 clearTimeout(deadline);for(const child of children)if(child.exitCode===null&&child.signalCode===null){const stopped=exit(child);child.kill('SIGKILL');await stopped;}
}
