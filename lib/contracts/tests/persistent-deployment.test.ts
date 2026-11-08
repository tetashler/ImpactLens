import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,mkdirSync,mkdtempSync,readFileSync,readdirSync,writeFileSync,symlinkSync} from 'node:fs';
import {join,resolve,dirname} from 'node:path';
import {buildPopulation,persistPopulation,loadPopulation} from '../../server/population/store.ts';
import {getCitizenDataset,persistCitizenDataset,loadCitizenDataset} from '../../server/citizen-grounding/data.ts';

const fixtures=resolve('tmp/persistent-deployment');mkdirSync(fixtures,{recursive:true});
const fixture=()=>mkdtempSync(join(fixtures,'fixture-'));
function environment(values:Record<string,string|undefined>,work:()=>void){const old=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));try{for(const [key,value]of Object.entries(values)){if(value===undefined)delete process.env[key];else process.env[key]=value;}work();}finally{for(const [key,value]of Object.entries(old)){if(value===undefined)delete process.env[key];else process.env[key]=value;}}}

test('production snapshot roots retain immutable data outside releases and explicit trusted overrides still work',()=>{
 const root=fixture(),populationRoot=join(root,'populations'),citizenRoot=join(root,'citizens'),override=join(root,'explicit');
 environment({POPULATION_STORAGE_ROOT:populationRoot,CITIZEN_DATASET_ROOT:citizenRoot},()=>{
  const population=buildPopulation({size:10000,seed:'persistent-deployment'}),id=persistPopulation(population);
  assert.ok(existsSync(join(populationRoot,id+'.json')));assert.deepEqual(loadPopulation(id),population);
  const citizens=getCitizenDataset(),citizenId=persistCitizenDataset(citizens);
  assert.ok(existsSync(join(citizenRoot,citizenId+'.manifest.json')));assert.equal(loadCitizenDataset(citizenId).id,citizenId);
  const before=readFileSync(join(citizenRoot,citizenId+'.json'),'utf8');persistCitizenDataset(citizens);assert.equal(readFileSync(join(citizenRoot,citizenId+'.json'),'utf8'),before);
  persistCitizenDataset(citizens,override);assert.equal(loadCitizenDataset(citizenId,override).id,citizenId);
  persistPopulation(population,override);assert.deepEqual(loadPopulation(id,override),population);
 });
});

async function deploymentFixture(){
 const module=await import('../../server/deployment/preflight.ts').catch(()=>null);assert.ok(module?.preparePersistentDeployment,'deployment preflight is required');
 const base=fixture(),project=join(base,'release'),state=join(base,'state');mkdirSync(project);mkdirSync(state);
 for(const path of module.REQUIRED_RELEASE_FILES){const file=join(project,path);mkdirSync(dirname(file),{recursive:true});writeFileSync(file,'isolated fixture');}
 const env={NODE_ENV:'production',IMPACTLENS_STATE_DIRECTORY:state,SOCIAL_STORAGE_ROOT:join(state,'simulations'),POPULATION_STORAGE_ROOT:join(state,'populations'),CITIZEN_DATASET_ROOT:join(state,'citizens'),PORT:'3000'};
 return {module,project,state,env};
}
test('preflight checks isolated durable paths without consuming claims or touching existing evidence',async()=>{
 const {module,project,state,env}=await deploymentFixture();mkdirSync(env.SOCIAL_STORAGE_ROOT);writeFileSync(join(env.SOCIAL_STORAGE_ROOT,'retained-evidence'),'original bytes');
 assert.deepEqual(module.preparePersistentDeployment({projectRoot:project,env,nodeVersion:'24.0.0'}),{host:'127.0.0.1',port:3000});
 assert.equal(readFileSync(join(env.SOCIAL_STORAGE_ROOT,'retained-evidence'),'utf8'),'original bytes');assert.deepEqual(readdirSync(env.SOCIAL_STORAGE_ROOT),['retained-evidence']);
 assert.deepEqual(readdirSync(env.POPULATION_STORAGE_ROOT),[]);assert.deepEqual(readdirSync(env.CITIZEN_DATASET_ROOT),[]);assert.ok(!existsSync(join(state,'session-store-v2')));
});
test('preflight rejects configuration and source errors before making runtime directories',async()=>{
 const {module,project,env}=await deploymentFixture();
 for(const change of [{NODE_ENV:'development'},{SOCIAL_STORAGE_ROOT:'relative'},{POPULATION_STORAGE_ROOT:env.SOCIAL_STORAGE_ROOT},{CITIZEN_DATASET_ROOT:join(env.SOCIAL_STORAGE_ROOT,'nested')},{SOCIAL_STORAGE_ROOT:join(project,'private')},{SOCIAL_PROSE_OBSERVATION_ROOT:join(project,'observations')},{PORT:'3000; secret'},{PORT:'0'}])assert.throws(()=>module.preparePersistentDeployment({projectRoot:project,env:{...env,...change},nodeVersion:'24.0.0'}),/DEPLOYMENT_/);
 assert.throws(()=>module.preparePersistentDeployment({projectRoot:project,env,nodeVersion:'22.9.0'}),/DEPLOYMENT_NODE/);
 writeFileSync(join(project,'.next','BUILD_ID'),'');assert.throws(()=>module.preparePersistentDeployment({projectRoot:project,env,nodeVersion:'24.0.0'}),/DEPLOYMENT_RELEASE/);
 assert.ok(!existsSync(env.SOCIAL_STORAGE_ROOT));
});

test('preflight accepts the empty MapLibre shared module only when its installed source is also empty',async()=>{
 const {module,project,env}=await deploymentFixture();
 const prepared=join(project,'public/vendor/maplibre/maplibre-gl-shared.mjs'),packaged=join(project,'node_modules/maplibre-gl/dist/maplibre-gl-shared.mjs');
 writeFileSync(prepared,'');
 assert.throws(()=>module.preparePersistentDeployment({projectRoot:project,env}),/DEPLOYMENT_RELEASE/);
 mkdirSync(dirname(packaged),{recursive:true});writeFileSync(packaged,'export const needed = true;');
 assert.throws(()=>module.preparePersistentDeployment({projectRoot:project,env}),/DEPLOYMENT_RELEASE/);
 writeFileSync(packaged,'');
 assert.deepEqual(module.preparePersistentDeployment({projectRoot:project,env}),{host:'127.0.0.1',port:3000});
 writeFileSync(join(project,'public/vendor/maplibre/maplibre-gl-worker.mjs'),'');
 assert.throws(()=>module.preparePersistentDeployment({projectRoot:project,env}),/DEPLOYMENT_RELEASE/);
});

test('preflight rejects symlink ancestors and file collisions without deleting foreign files',async()=>{
 const {module,project,state,env}=await deploymentFixture(),target=join(state,'real'),alias=join(state,'alias');mkdirSync(target);
 symlinkSync(target,alias,process.platform==='win32'?'junction':'dir');
 assert.throws(()=>module.preparePersistentDeployment({projectRoot:project,env:{...env,SOCIAL_STORAGE_ROOT:join(alias,'simulations')},nodeVersion:'24.0.0'}),/DEPLOYMENT_STATE_PATH/);
 writeFileSync(env.SOCIAL_STORAGE_ROOT,'do not delete this file');
 assert.throws(()=>module.preparePersistentDeployment({projectRoot:project,env,nodeVersion:'24.0.0'}),/DEPLOYMENT_STATE_PATH/);
 assert.equal(readFileSync(env.SOCIAL_STORAGE_ROOT,'utf8'),'do not delete this file');
});

test('production refuses checkout dotenv files instead of inheriting development credentials',async()=>{
 const {module,project,env}=await deploymentFixture();writeFileSync(join(project,'.env.local'),'PRIVATE_FIXTURE_KEY=do-not-read-or-print');
 assert.throws(()=>module.preparePersistentDeployment({projectRoot:project,env,nodeVersion:'24.0.0'}),/DEPLOYMENT_ENV_FILE/);
 assert.ok(!existsSync(env.SOCIAL_STORAGE_ROOT));assert.equal(readFileSync(join(project,'.env.local'),'utf8'),'PRIVATE_FIXTURE_KEY=do-not-read-or-print');
});

test('health is uncached liveness and does not allocate simulation storage',async()=>{
 const {GET,dynamic,runtime}=await import('../../../app/api/health/route.ts'),response=GET();
 assert.equal(dynamic,'force-dynamic');assert.equal(runtime,'nodejs');assert.equal(response.status,200);assert.equal(response.headers.get('Cache-Control'),'no-store');assert.deepEqual(await response.json(),{version:1,status:'ok'});
});
