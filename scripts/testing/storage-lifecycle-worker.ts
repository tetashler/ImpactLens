/** Offline child-process fixture. Only operates on newly created lifecycle test directories. */
import './offline-network.mjs';
import {resolve,relative,isAbsolute} from 'node:path';
import {createHash} from 'node:crypto';
import {reserveStorageAdmission} from '../../lib/server/society/storage-admission.ts';
const base=resolve(process.argv[2]??''),allowed=resolve('tmp/storage-lifecycle-20261106'),part=relative(allowed,base);
if(!part||part.startsWith('..')||isAbsolute(part))throw Error('FIXTURE_ROOT');
const mode=process.argv[3],hash=(value:string)=>createHash('sha256').update(value).digest('hex');
if(mode==='fill'){
 for(let i=0;i<32;i++)reserveStorageAdmission('period-attempt-'+i,hash('period-request-'+i),base);
 process.stdout.write(JSON.stringify({filled:32}));
}else if(mode==='duplicate'){
 try{reserveStorageAdmission('period-attempt-0',hash('changed-request'),base);throw Error('DUPLICATE_ADMITTED');}
 catch(error){if(!(error instanceof Error)||error.message!=='STORAGE_ADMISSION_DUPLICATE')throw error;process.stdout.write(JSON.stringify({duplicateRejected:true}));}
}else if(mode==='pending-review'){
 const {handleAssumptionRequest}=await import('../../lib/server/assumption-review/service.ts');
 const {worldFixtures}=await import('../../lib/world-graph/fixtures.ts');
 const {mockDynamicProvider}=await import('../../lib/contracts/tests/helpers/dynamic-provider.ts');
 const fixture=worldFixtures()[0],mock=mockDynamicProvider(fixture);
 const response=await handleAssumptionRequest(new Request('http://localhost/api/scenario-simulate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({version:3,operation:'prepare',attemptId:'pending-maintenance-review',request:fixture.request})}),{enabled:true,key:'offline-only',groundingKey:'',fetcher:mock.fetcher},{storageBase:base,skipSocialInitialization:true});
 if(response.status!==200||(await response.json()).kind!=='assumption-review')throw Error('FIXTURE_REVIEW');
 process.send?.({pending:true,providerCalls:mock.counts().calls});
 process.on('message',message=>{if(message==='stop'){process.disconnect?.();process.exit(0);}});
}else throw Error('FIXTURE_MODE');
