/** Task-owned offline Next server using the ordinary private archive locations. */
import next from 'next';
import {createServer} from 'node:http';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {resolve,join} from 'node:path';
import {verifyPrivateStore,privateStoreDirectory} from '../../lib/server/society/storage.ts';
const output=resolve('tmp/phase4e/desktop'),port=Number(process.env.PORT??3200);
if(!globalThis.__phase4eMockGuard||process.env.IMPACTLENS_PHASE4E_MOCK!=='true'||!/phase4e-provider-preload/.test(process.env.NODE_OPTIONS??'')||process.env.SOCIAL_STORAGE_ROOT)throw Error('PHASE4E_MOCK_GUARD_REQUIRED');
if(!Number.isInteger(port)||port<1024||port>65535)throw Error('PHASE4E_SERVER_PORT');
mkdirSync(output,{recursive:true});
const app=next({dev:false,dir:process.cwd(),hostname:'127.0.0.1',port});await app.prepare();
if(process.env.OPENROUTER_API_KEY!=='sk-or-v1-'+'0'.repeat(64)||process.env.TAVILY_API_KEY!=='tvly-'+'0'.repeat(32))throw Error('PHASE4E_DUMMY_KEYS_REQUIRED');
await verifyPrivateStore(privateStoreDirectory('accepted-private'));await verifyPrivateStore(privateStoreDirectory('social-sessions'));
const preflight={...globalThis.__phase4eMockGuard,normalUserStorageWritable:true,steps:80,buildId:readFileSync('.next/BUILD_ID','utf8').trim(),pid:process.pid,port};
writeFileSync(join(output,'server-preflight.json'),JSON.stringify(preflight,null,2));console.info('PHASE4E_MOCK_SERVER_PREFLIGHT',JSON.stringify(preflight));
const server=createServer(app.getRequestHandler());await new Promise(resolve=>server.listen(port,'127.0.0.1',resolve));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>server.close(()=>{void app.close().finally(()=>process.exit(0));}));
