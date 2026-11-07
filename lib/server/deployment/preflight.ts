/** Production startup only. Never imports coordinators, recovery or inference. */
import {accessSync,constants,lstatSync,realpathSync,mkdirSync,openSync,writeFileSync,fsyncSync,fstatSync,closeSync,unlinkSync} from 'node:fs';
import {join,resolve,relative,isAbsolute,sep,dirname} from 'node:path';
import {randomUUID} from 'node:crypto';

export const REQUIRED_RELEASE_FILES=Object.freeze([
 '.next/BUILD_ID','node_modules/next/dist/bin/next',
 'public/geography/manifest.json','public/geography/subzones.geojson','public/geography/buildings.geojson',
 'public/vendor/maplibre/maplibre-gl-worker.mjs','public/vendor/maplibre/maplibre-gl-shared.mjs',
 'data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson','data/facilities/EldercareServices.geojson',
 'data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv',
 'data/transport/origin_destination_train_202609.csv','data/transport/LTAMRTStationExitGEOJSON.geojson',
 ...['agency','stops','routes','trips','stop_times','calendar','calendar_dates','feed_info'].map(name=>'data/transport/mrt-network/'+name+'.txt'),
 ...['ct17565','ct17586','ct17594','ct17582'].flatMap(id=>['original.csv','source-metadata.json'].map(name=>'data/employment/singstat-census2020-'+id+'/'+name)),
]);
const requireValue=(condition:unknown,code:string):void=>{if(!condition)throw Error(code);};
function within(parent:string,child:string){const part=relative(parent,child);return part===''||!isAbsolute(part)&&part!=='..'&&!part.startsWith('..'+sep);}
function plainAncestors(path:string){
 for(let current=resolve(path);;current=dirname(current)){
  try{const stat=lstatSync(current);requireValue(stat.isDirectory()&&!stat.isSymbolicLink(),'DEPLOYMENT_STATE_PATH');}
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  if(dirname(current)===current)break;
 }
}
function probe(path:string){
 mkdirSync(path,{recursive:true,mode:0o700});plainAncestors(path);
 const file=join(path,'.deployment-probe-'+randomUUID()),fd=openSync(file,'wx',0o600),identity=fstatSync(fd);
 try{writeFileSync(fd,'deployment-write-probe');fsyncSync(fd);}
 finally{try{closeSync(fd);}finally{const actual=lstatSync(file);requireValue(actual.isFile()&&!actual.isSymbolicLink()&&actual.dev===identity.dev&&actual.ino===identity.ino,'DEPLOYMENT_STATE_WRITABLE');unlinkSync(file);}}
}
export interface DeploymentPreflightOptions {projectRoot?:string;env?:Readonly<Record<string,string|undefined>>;nodeVersion?:string}
export function preparePersistentDeployment({projectRoot=process.cwd(),env=process.env,nodeVersion=process.versions.node}:DeploymentPreflightOptions={}):{host:'127.0.0.1';port:number}{
 requireValue(/^\d+\.\d+\.\d+/.test(nodeVersion)&&Number(nodeVersion.split('.')[0])>=24,'DEPLOYMENT_NODE');
 requireValue(env.NODE_ENV==='production','DEPLOYMENT_MODE');
 const port=env.PORT??'3000';requireValue(/^\d{1,5}$/.test(port)&&Number(port)>0&&Number(port)<=65535,'DEPLOYMENT_PORT');
 const project=realpathSync(projectRoot),state=env.IMPACTLENS_STATE_DIRECTORY;
 for(const name of ['.env','.env.local','.env.production','.env.production.local']){
  try{lstatSync(join(project,name));}catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')continue;throw error;}
  throw Error('DEPLOYMENT_ENV_FILE');
 }
 requireValue(typeof state==='string'&&isAbsolute(state),'DEPLOYMENT_STATE_CONFIG');
 const stateRoot=resolve(state!);plainAncestors(stateRoot);
 requireValue(!within(project,stateRoot)&&!within(stateRoot,project),'DEPLOYMENT_STATE_PATH');
 const keys=['SOCIAL_STORAGE_ROOT','POPULATION_STORAGE_ROOT','CITIZEN_DATASET_ROOT',...(env.SOCIAL_PROSE_OBSERVATION_ROOT?['SOCIAL_PROSE_OBSERVATION_ROOT']:[])];
 const paths=keys.map(key=>{const value=env[key];requireValue(typeof value==='string'&&isAbsolute(value),'DEPLOYMENT_STATE_CONFIG');const path=resolve(value!);plainAncestors(path);requireValue(path!==stateRoot&&within(stateRoot,path),'DEPLOYMENT_STATE_PATH');return path;});
 for(let i=0;i<paths.length;i++)for(let j=0;j<i;j++)requireValue(!within(paths[i],paths[j])&&!within(paths[j],paths[i]),'DEPLOYMENT_STATE_PATH');
 try{for(const file of REQUIRED_RELEASE_FILES){const path=join(project,file),stat=lstatSync(path);requireValue(stat.isFile()&&!stat.isSymbolicLink()&&stat.size>0,'DEPLOYMENT_RELEASE');accessSync(path,constants.R_OK);}}
 catch{throw Error('DEPLOYMENT_RELEASE');}
 try{probe(stateRoot);for(const path of paths)probe(path);probe(join(project,'.next/cache'));}
 catch(error){if(error instanceof Error&&/^DEPLOYMENT_/.test(error.message))throw error;throw Error('DEPLOYMENT_STATE_WRITABLE');}
 return {host:'127.0.0.1',port:Number(port)};
}
