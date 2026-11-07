/** Local workspace maintenance. Preview by default; --apply requires stopped servers/tests. */
import {mkdirSync,mkdtempSync,writeFileSync} from 'node:fs';
import {join,resolve,sep} from 'node:path';
import {spawnSync} from 'node:child_process';
import nextEnv from '@next/env';
import {planWorkspaceCleanup,applyWorkspaceCleanup,GENERATED_ROOTS} from './maintenance/workspace-cleanup.ts';

function noActiveWork(){
 const result=process.platform==='win32'?spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop'; (Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object { $_.CommandLine -match 'next[^\\r\\n]*( start| dev)|next-server|--test' } | Measure-Object).Count"],{encoding:'utf8',windowsHide:true}):spawnSync('ps',['-Ao','args='],{encoding:'utf8'});
 if(result.status!==0)throw Error('WORKSPACE_CLEANUP_PROCESS_CHECK');
 if(process.platform==='win32'?Number(result.stdout.trim())!==0:result.stdout.split('\n').some(line=>/next[^\r\n]*\s(?:start|dev)\b|next-server|node.*--test/.test(line)))throw Error('WORKSPACE_CLEANUP_ACTIVE_WORK');
}
try{
 const args=process.argv.slice(2);if(args.length>1||args.length===1&&args[0]!=='--apply')throw Error('WORKSPACE_CLEANUP_ARGUMENTS');
 const apply=args[0]==='--apply';if(apply)noActiveWork();
 const root=resolve(process.cwd());mkdirSync(join(root,'tmp'),{recursive:true});
 const audit=mkdtempSync(join(root,'tmp','workspace-cleanup-'+new Date().toISOString().slice(0,10)+'-'));
 const env=nextEnv.loadEnvConfig(root).combinedEnv;
 const privateRoots=['SOCIAL_STORAGE_ROOT','POPULATION_STORAGE_ROOT','CITIZEN_DATASET_ROOT','SOCIAL_PROSE_OBSERVATION_ROOT','IMPACTLENS_STATE_DIRECTORY'].map(key=>env[key]).filter((value):value is string=>typeof value==='string'&&value.length>0);
 const plan=planWorkspaceCleanup(root,Date.now(),privateRoots),groups=new Map<string,{bytes:number;files:number}>();
 for(const file of plan.files){const group=GENERATED_ROOTS.find(path=>file.path.startsWith(path+'/'))??'tmp/old-offline-test-fixtures';const value=groups.get(group)??{bytes:0,files:0};value.bytes+=file.bytes;value.files++;groups.set(group,value);}
 const preview={version:1,createdAt:new Date().toISOString(),removableBytes:plan.bytes,removableFiles:plan.files.length,groups:Object.fromEntries(groups),protectedFiles:plan.protectedFiles,skippedLinks:plan.skippedLinks};
 writeFileSync(join(audit,'preview.json'),JSON.stringify(preview,null,2));
 if(!apply){console.log(JSON.stringify({mode:'preview',removableBytes:plan.bytes,removableFiles:plan.files.length,groups:Object.fromEntries(groups),protectedFiles:plan.protectedFiles.length,audit:audit.slice(root.length+1).split(sep).join('/')},null,2));}
 else{
  noActiveWork();const receipt=applyWorkspaceCleanup(plan);
  writeFileSync(join(audit,'receipt.json'),JSON.stringify({...receipt,completedAt:new Date().toISOString()},null,2));
  console.log(JSON.stringify({mode:'applied',deletedBytes:receipt.deletedBytes,deletedFiles:receipt.deletedFiles,protectedFilesVerified:receipt.protectedFilesVerified,audit:audit.slice(root.length+1).split(sep).join('/')},null,2));
 }
}catch(error){const code=error instanceof Error&&/^WORKSPACE_CLEANUP_[A-Z_]+$/.test(error.message)?error.message:'WORKSPACE_CLEANUP_UNAVAILABLE';console.error(JSON.stringify({error:code}));process.exitCode=1;}
