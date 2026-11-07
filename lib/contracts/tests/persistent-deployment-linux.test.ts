import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,writeFileSync,readFileSync,copyFileSync,readdirSync,statSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {tmpdir} from 'node:os';
import {spawn,type ChildProcess} from 'node:child_process';
import {createServer} from 'node:net';
import {REQUIRED_RELEASE_FILES} from '../../server/deployment/preflight.ts';

test('Linux singleton excludes maintenance/startup races and survives process death without losing state',{skip:process.platform!=='linux',timeout:30000},async t=>{
 const base=mkdtempSync(join(tmpdir(),'impactlens-deployment-')),project=join(base,'release'),state=join(base,'state');mkdirSync(project);mkdirSync(state);
 for(const file of REQUIRED_RELEASE_FILES){const target=join(project,file);mkdirSync(dirname(target),{recursive:true});writeFileSync(target,'fixture');}
 for(const file of ['deploy/start-single-instance.sh','deploy/run-server.sh','deploy/with-instance-lock.sh','scripts/deployment-preflight.ts','lib/server/deployment/preflight.ts']){mkdirSync(dirname(join(project,file)),{recursive:true});copyFileSync(resolve(file),join(project,file));}
 writeFileSync(join(project,'package.json'),'{"type":"module"}');
 writeFileSync(join(project,'node_modules/next/package.json'),'{"type":"module"}');
 writeFileSync(join(project,'node_modules/next/dist/bin/next'),`import {createServer} from 'node:http';import {readFileSync,writeFileSync,existsSync} from 'node:fs';const counter=process.env.IMPACTLENS_STATE_DIRECTORY+'/counter';const starts=existsSync(counter)?Number(readFileSync(counter,'utf8'))+1:1;writeFileSync(counter,String(starts));const arg=name=>process.argv[process.argv.indexOf(name)+1];const server=createServer((q,s)=>s.end(JSON.stringify({host:server.address().address,starts})));server.listen(Number(arg('--port')),arg('--hostname'),()=>console.log('FIXTURE_READY'));process.on('SIGTERM',()=>server.close(()=>process.exit(0)));`);
 const socket=createServer();await new Promise<void>(yes=>socket.listen(0,'127.0.0.1',yes));const address=socket.address();assert.ok(address&&typeof address==='object');const port=address.port;await new Promise<void>(yes=>socket.close(()=>yes()));
 const env={...process.env,NODE_OPTIONS:'',NODE_ENV:'production' as const,IMPACTLENS_STATE_DIRECTORY:state,IMPACTLENS_NODE_BINARY:process.execPath,SOCIAL_STORAGE_ROOT:join(state,'simulations'),POPULATION_STORAGE_ROOT:join(state,'populations'),CITIZEN_DATASET_ROOT:join(state,'citizens'),SOCIAL_PROSE_OBSERVATION_ROOT:'',PORT:String(port)};
 const children:ChildProcess[]=[];
 function launch(args:string[]){const child=spawn('/bin/sh',args,{cwd:project,env,stdio:['ignore','pipe','pipe']});children.push(child);return child;}
 t.after(async()=>{for(const child of children)if(child.exitCode===null&&child.signalCode===null){const done=exited(child);child.kill('SIGKILL');await done;}});
 function exited(child:ChildProcess){return new Promise<number|null>((yes,no)=>{child.once('exit',yes);child.once('error',no);});}
 function ready(child:ChildProcess,marker:string){return new Promise<void>((yes,no)=>{let output='';const timer=setTimeout(()=>no(Error('FIXTURE_START_TIMEOUT')),5000);child.stdout!.on('data',bytes=>{output+=bytes;if(output.includes(marker)){clearTimeout(timer);yes();}});child.once('error',error=>{clearTimeout(timer);no(error);});child.once('exit',code=>{clearTimeout(timer);no(Error('FIXTURE_EARLY_EXIT_'+code));});});}
 const maintenance=launch(['deploy/with-instance-lock.sh',process.execPath,'-e',"console.log('MAINTENANCE_READY');setInterval(()=>{},1000)"]);await ready(maintenance,'MAINTENANCE_READY');
 const inode=statSync(join(state,'instance.lock')).ino,before=readdirSync(state);
 assert.equal(await exited(launch(['deploy/start-single-instance.sh'])),73);assert.deepEqual(readdirSync(state),before,'A blocked startup must not run preflight writes during a backup.');
 const released=exited(maintenance);maintenance.kill('SIGTERM');await released;
 const first=launch(['deploy/start-single-instance.sh']);await ready(first,'FIXTURE_READY');
 assert.deepEqual(await (await fetch('http://127.0.0.1:'+port)).json(),{host:'127.0.0.1',starts:1});
 writeFileSync(join(env.SOCIAL_STORAGE_ROOT,'retained-claim'),'immutable used-attempt evidence');
 assert.equal(await exited(launch(['deploy/start-single-instance.sh'])),73);
 const died=exited(first);first.kill('SIGKILL');await died;
 const second=launch(['deploy/start-single-instance.sh']);await ready(second,'FIXTURE_READY');
 assert.deepEqual(await (await fetch('http://127.0.0.1:'+port)).json(),{host:'127.0.0.1',starts:2});
 assert.equal(readFileSync(join(env.SOCIAL_STORAGE_ROOT,'retained-claim'),'utf8'),'immutable used-attempt evidence');assert.equal(statSync(join(state,'instance.lock')).ino,inode);
 const stopped=exited(second);second.kill('SIGTERM');assert.equal(await stopped,0);
});
