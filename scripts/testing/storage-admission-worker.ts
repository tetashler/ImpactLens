import {reserveStorageAdmission,findStorageBinding,storageBundle} from '../../lib/server/society/storage-admission.ts';
import {createHash} from 'node:crypto';
import fs,{readFileSync} from 'node:fs';import {join} from 'node:path';import {syncBuiltinESMExports} from 'node:module';
process.send?.('ready');process.once('message',async()=>{
 if(process.argv[4]){
  try{
   const {socialOperation}=await import('../../lib/server/society/service.ts'),base=process.argv[2],run=JSON.parse(readFileSync(join(base,'accepted-run.fixture'),'utf8')),entry=findStorageBinding(run.runId,base)!;
   const root=storageBundle(base).sessions,directory={directory:root,swarm:false as const,enabled:true,ruleOnly:true,storageAdmission:{base,claim:entry.claim}};
   if(process.argv[4]==='journal-boundary'){
    const original=fs.openSync;fs.openSync=((...args:Parameters<typeof fs.openSync>)=>{if(String(args[0]).endsWith('.index'))throw Error('SIMULATED_INDEX_BOUNDARY');return (original as any)(...args);}) as typeof fs.openSync;syncBuiltinESMExports();
    try{await socialOperation({operation:'start',run},directory);throw Error('EXPECTED_INTERRUPTION');}catch(error){if(!(error instanceof Error)||error.message!=='SIMULATED_INDEX_BOUNDARY')throw error;}
    process.stdout.write(JSON.stringify({interrupted:true}));
   }else{
    const path=join(root,entry.claim.sessionId+'.jsonl'),before=readFileSync(path);let regenerations=0;
    const state=await socialOperation({operation:'start',run},{...directory,citizenGrounding:async()=>{regenerations++;throw Error('NO_REGENERATION');}});
    process.stdout.write(JSON.stringify({restored:true,sessionId:state.sessionId,regenerations,journalUnchanged:readFileSync(path).equals(before)}));
   }
  }catch(error){process.stdout.write(JSON.stringify({failure:error instanceof Error?error.message:'FAILED'}));process.exitCode=1;}
  process.disconnect?.();return;
 }
 try{const claim=reserveStorageAdmission(process.argv[3],createHash('sha256').update('worker-request').digest('hex'),process.argv[2]);process.stdout.write(JSON.stringify({admitted:true,slot:claim.slot}));}
 catch(error){process.stdout.write(JSON.stringify({admitted:false,error:error instanceof Error?error.message:'FAILED'}));}
 process.disconnect?.();
});
