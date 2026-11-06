/** Trusted local operator CLI. Never imports simulation execution or provider clients. */
import nextEnv from '@next/env';
import {getStorageCapacity,storageBase} from '../lib/server/society/storage-admission.ts';
import {rotateStorage,verifyStorageArchive} from '../lib/server/society/storage-lifecycle.ts';

nextEnv.loadEnvConfig(process.cwd());
const args=process.argv.slice(2),command=args.shift(),rootIndex=args.indexOf('--root');let base:string;
try{
 let override:string|undefined;if(rootIndex>=0){override=args[rootIndex+1];if(!override||override.startsWith('--'))throw Error('STORAGE_CLI_ARGUMENTS');args.splice(rootIndex,2);}base=storageBase(override);
 if(command==='status'){if(args.length)throw Error('STORAGE_CLI_ARGUMENTS');console.log(JSON.stringify(getStorageCapacity(base),null,2));}
 else if(command==='verify'){if(args.length!==1)throw Error('STORAGE_CLI_ARGUMENTS');const manifest=verifyStorageArchive(args[0],base);console.log(JSON.stringify({verified:true,id:manifest.id,files:manifest.files.length,bytes:manifest.bytes},null,2));}
 else if(command==='rotate'){if(!args.includes('--confirm')||args.some(a=>!['--confirm','--complete'].includes(a))||new Set(args).size!==args.length)throw Error('STORAGE_LIFECYCLE_CONFIRM');console.log(JSON.stringify(rotateStorage(base,{confirm:true,complete:args.includes('--complete')}),null,2));}
 else throw Error('STORAGE_CLI_ARGUMENTS');
}catch(error){const code=error instanceof Error&&/^STORAGE_[A-Z_]+$/.test(error.message)?error.message:'STORAGE_CLI_UNAVAILABLE';console.error(JSON.stringify({error:code}));process.exitCode=1;}
