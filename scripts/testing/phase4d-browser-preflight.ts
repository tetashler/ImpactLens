/** In-process diagnostic only: explicit dummy keys, installed fixture fetcher, no HTTP Explore request. */
import {mkdirSync,mkdtempSync} from 'node:fs';import {join,resolve} from 'node:path';
import {handleDynamicRequest} from '../../lib/server/inference/dynamic-service.ts';
import {registerAcceptedExecution} from '../../lib/server/society/public-service.ts';
import {parsePublicExplore} from '../../lib/question-simulation/public-session.ts';
import {worldFixtures} from '../../lib/world-graph/fixtures.ts';
process.env.OPENROUTER_API_KEY='sk-or-v1-'+'0'.repeat(64);process.env.TAVILY_API_KEY='tvly-'+'0'.repeat(32);
for(const key of ['IMPACTLENS_PHASE2B_MOCK','IMPACTLENS_SOCIAL_MOCK','IMPACTLENS_PHASE4C_MOCK','IMPACTLENS_PHASE4D_MOCK'])process.env[key]='true';
process.env.IMPACTLENS_PHASE4D_PREFLIGHT='true';
await import('./offline-network.mjs');await import('./dynamic-provider-preload.mjs');
const out=resolve('tmp/phase4d');mkdirSync(out,{recursive:true});const directory=mkdtempSync(join(out,'private-preflight-'));
const f=worldFixtures()[0],request=new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:1,attemptId:'offline-preflight-'+crypto.randomUUID(),request:f.request})});
const response=await handleDynamicRequest(request,{enabled:true,key:process.env.OPENROUTER_API_KEY,groundingKey:process.env.TAVILY_API_KEY,fetcher:globalThis.fetch});
const value=await response.json();
try{if(value.kind!=='dynamic-execution')throw Error('FIXTURE_INITIAL_'+value.kind);const result=await registerAcceptedExecution(value,{directory:join(directory,'sessions'),storeDirectory:join(directory,'accepted'),enabled:true,key:process.env.OPENROUTER_API_KEY,fetcher:globalThis.fetch});parsePublicExplore(result);console.log(JSON.stringify({inProcess:true,dummyKeys:true,externalDispatchBlocked:true,fixtureAdapters:true,initialActions:result.initialActions.length,summaryParsed:true,society:result.society?.phase}));}
catch(error){console.log(JSON.stringify({inProcess:true,dummyKeys:true,externalDispatchBlocked:true,fixtureAdapters:true,status:response.status,diagnostic:(error as Error).message,stack:(error as Error).stack?.split('\n').slice(1,5)}));process.exitCode=1;}
