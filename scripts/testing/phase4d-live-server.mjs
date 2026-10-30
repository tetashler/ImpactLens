// Task-owned real-provider Next server. No fixtures, raw response logging, or credential-file reads here.
import next from 'next';import {createServer} from 'node:http';import {readFileSync,writeFileSync} from 'node:fs';import {resolve,join} from 'node:path';
import {verifyPrivateStore,privateStoreDirectory} from '../../lib/server/society/storage.ts';
const directory=resolve('tmp/phase4d-live'),port=Number(process.env.PORT??3198);
if(!globalThis.__phase4dLiveGuard||!/phase4d-live-guard/.test(process.env.NODE_OPTIONS??'')||/offline-network|provider-preload/.test(process.env.NODE_OPTIONS??''))throw Error('LIVE_GUARD_REQUIRED');
const app=next({dev:false,dir:process.cwd(),hostname:'127.0.0.1',port});await app.prepare();
if(Object.entries(process.env).some(([k,v])=>/MOCK|PREFLIGHT/.test(k)&&v==='true'))throw Error('LIVE_MOCK_SWITCH');
const configured={openrouter:!!process.env.OPENROUTER_API_KEY?.trim(),tavily:!!process.env.TAVILY_API_KEY?.trim()};
if(!configured.openrouter||!configured.tavily||process.env.OPENROUTER_API_KEY==='sk-or-v1-'+'0'.repeat(64)||process.env.TAVILY_API_KEY==='tvly-'+'0'.repeat(32))throw Error('LIVE_CREDENTIALS_REQUIRED');
if(process.env.STAKEHOLDER_LIVE_ENABLED!=='true'||process.env.SOCIAL_LLM_ENABLED!=='true'||process.env.SOCIAL_ACTIVE_AGENTS!=='24'||process.env.SOCIAL_CONTROLLED_AGENTS!=='4'||process.env.SOCIAL_MAX_DECISIONS!=='8'||process.env.SOCIAL_STORAGE_ROOT)throw Error('LIVE_CONFIGURATION');
await verifyPrivateStore(privateStoreDirectory('accepted-private'));await verifyPrivateStore(privateStoreDirectory('social-sessions'));
const preflight={configured,guard:true,fixtures:false,defaultStorageWritable:true,agents:24,selected:4,socialMax:8,steps:80,buildId:readFileSync('.next/BUILD_ID','utf8').trim(),pid:process.pid,port};
writeFileSync(join(directory,'server-preflight.json'),JSON.stringify(preflight,null,2));console.info('PHASE4D_LIVE_PREFLIGHT',JSON.stringify(preflight));
const server=createServer(app.getRequestHandler());await new Promise(r=>server.listen(port,'127.0.0.1',r));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{void app.close().finally(()=>process.exit(0));}));
