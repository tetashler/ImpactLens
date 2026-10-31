/** Task-owned local real-provider server. Dispatch requires the independent armed task ledger. */
import next from 'next';import {createServer} from 'node:http';import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {resolve,join} from 'node:path';import {execFileSync} from 'node:child_process';
import {verifyPrivateStore,privateStoreDirectory} from '../../lib/server/society/storage.ts';import {stopCoordinators} from '../../lib/server/society/coordinator.ts';import {totals} from './phase4e1-live-guard.mjs';
const output=resolve('tmp/phase4e1-live'),port=Number(process.env.PORT??3201);mkdirSync(output,{recursive:true});
if(!globalThis.__phase4e1LiveGuard||!/phase4e1-live-guard/.test(process.env.NODE_OPTIONS??'')||/offline-network|provider-preload/.test(process.env.NODE_OPTIONS??'')||Object.entries(process.env).some(([k,v])=>/MOCK/.test(k)&&v==='true'))throw Error('LIVE_GUARD_REQUIRED');
if(process.env.SOCIAL_SWARM_SIZE!=='50'||process.env.SOCIAL_MAX_DECISIONS!=='350'||process.env.SOCIAL_PROVIDER_MAX_CALLS!=='70'||process.env.SOCIAL_STORAGE_ROOT||!Number.isInteger(port)||port<1024||port>65535)throw Error('LIVE_CONFIGURATION');
const app=next({dev:false,dir:process.cwd(),hostname:'127.0.0.1',port});await app.prepare();
const keys={openrouter:!!process.env.OPENROUTER_API_KEY?.trim(),tavily:!!process.env.TAVILY_API_KEY?.trim()};if(!keys.openrouter||!keys.tavily)throw Error('LIVE_CREDENTIALS_MISSING');
for(const directory of [privateStoreDirectory('accepted-private'),privateStoreDirectory('social-sessions'),join(privateStoreDirectory('accepted-private'),'jobs')])await verifyPrivateStore(directory);
const preflight={version:1,account:execFileSync('whoami',{encoding:'utf8'}).trim(),pid:process.pid,port,credentialsPresent:keys,originalPrivateStoresWritable:true,atomicReplacement:true,model:'deepseek/deepseek-v4-flash-0731',provider:'digitalocean',fallback:false,requiredParameters:true,reasoning:false,coarseTicks:80,active:50,capable:35,capacity:350,paidSocialAdmission:70,serial:1,mockedProvider:false,independentTaskLedger:true,ledger:totals(),buildId:readFileSync('.next/BUILD_ID','utf8').trim()};
writeFileSync(join(output,'server-preflight.json'),JSON.stringify(preflight,null,2));console.info('PHASE4E1_LIVE_PREFLIGHT',JSON.stringify(preflight));
const server=createServer(app.getRequestHandler());await new Promise(r=>server.listen(port,'127.0.0.1',r));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void stopCoordinators().finally(()=>server.close(()=>{void app.close().finally(()=>process.exit(0));})));
