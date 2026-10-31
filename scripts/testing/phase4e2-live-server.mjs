/** Task-owned local real-provider server. Dispatch requires the independent armed task ledger. */
import next from 'next';import {createServer} from 'node:http';import {mkdirSync,writeFileSync,readFileSync} from 'node:fs';import {resolve,join,sep} from 'node:path';import {execFileSync} from 'node:child_process';import {createHash} from 'node:crypto';
import {liveProviderAdmission} from './phase4e2-live-contract.mjs';
import {verifyPrivateStore,privateStoreDirectory} from '../../lib/server/society/storage.ts';import {stopCoordinators} from '../../lib/server/society/coordinator.ts';import {totals} from './phase4e2-live-guard.mjs';
const output=resolve('tmp/phase4e2-live'),port=Number(process.env.PORT??3201);mkdirSync(output,{recursive:true});
if(!globalThis.__phase4e2LiveGuard||!/phase4e2-live-guard/.test(process.env.NODE_OPTIONS??'')||/offline-network|provider-preload/.test(process.env.NODE_OPTIONS??'')||Object.entries(process.env).some(([k,v])=>/MOCK/.test(k)&&v==='true'))throw Error('LIVE_GUARD_REQUIRED');
if(globalThis.__phase4e2LiveGuard.historicalEvidenceVerified!==true)throw Error('LIVE_HISTORICAL_SCOPE_REQUIRED');
const preservation=JSON.parse(readFileSync('tmp/phase4e2-optionb/hashes-before.json','utf8'));
if(!Array.isArray(preservation)||!preservation.length||preservation.length>5000)throw Error('LIVE_HISTORY_PRESERVATION');
for(const record of preservation){const path=resolve(record.path);if(!path.startsWith(resolve('data/derived/agents')+sep)||createHash('sha256').update(readFileSync(path)).digest('hex')!==record.sha256)throw Error('LIVE_HISTORY_PRESERVATION');}
const createdAtMs=Date.now(),providerAdmission=liveProviderAdmission(process.env,createdAtMs);if(!Number.isInteger(port)||port<1024||port>65535)throw Error('LIVE_CONFIGURATION');
const app=next({dev:false,dir:process.cwd(),hostname:'127.0.0.1',port});await app.prepare();
const keys={openrouter:!!process.env.OPENROUTER_API_KEY?.trim(),tavily:!!process.env.TAVILY_API_KEY?.trim()};if(!keys.openrouter||!keys.tavily)throw Error('LIVE_CREDENTIALS_MISSING');
for(const directory of [privateStoreDirectory('accepted-private'),privateStoreDirectory('social-sessions'),join(privateStoreDirectory('accepted-private'),'jobs')])await verifyPrivateStore(directory);
const preflight={version:1,createdAtMs,providerAdmission,account:execFileSync('whoami',{encoding:'utf8'}).trim(),pid:process.pid,port,credentialsPresent:keys,originalPrivateStoresWritable:true,atomicReplacement:true,historicalEvidenceVerified:true,historicalScopeManifestHash:globalThis.__phase4e2LiveGuard.historicalScopeManifestHash,preservedHistoricalFiles:preservation.length,model:'deepseek/deepseek-v4-flash-0731',provider:'digitalocean',fallback:false,requiredParameters:true,reasoning:false,coarseTicks:320,active:50,capable:35,capacity:350,paidSocialAdmission:350,serial:1,mockedProvider:false,independentTaskLedger:true,ledger:totals(),buildId:readFileSync('.next/BUILD_ID','utf8').trim()};
writeFileSync(join(output,'server-preflight.json'),JSON.stringify(preflight,null,2));console.info('PHASE4E2_LIVE_PREFLIGHT',JSON.stringify(preflight));
const server=createServer(app.getRequestHandler());await new Promise(r=>server.listen(port,'127.0.0.1',r));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>void stopCoordinators().finally(()=>server.close(()=>{void app.close().finally(()=>process.exit(0));})));
