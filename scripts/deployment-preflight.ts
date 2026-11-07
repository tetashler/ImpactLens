import {preparePersistentDeployment} from '../lib/server/deployment/preflight.ts';
try{
 if(process.argv.length!==2)throw Error('DEPLOYMENT_ARGUMENTS');
 const checked=preparePersistentDeployment();
 console.log(JSON.stringify({version:1,status:'checked',...checked}));
}catch(error){
 const code=error instanceof Error&&/^DEPLOYMENT_[A-Z_]+$/.test(error.message)?error.message:'DEPLOYMENT_UNAVAILABLE';
 console.error(JSON.stringify({error:code}));process.exitCode=78;
}
