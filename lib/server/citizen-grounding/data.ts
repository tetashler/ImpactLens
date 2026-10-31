/** Local immutable citizen extension. No network, provider keys or mutation of base population. */
import {readFileSync,mkdirSync,openSync,writeFileSync,fsyncSync,closeSync,statSync} from 'node:fs';
import {join} from 'node:path';
import {ensure,freezeSnapshot} from '../../experiments/validation.ts';
import {buildPopulation} from '../population/store.ts';
import {buildSocietyGeography} from '../population/geography.ts';
import {getBaseline} from '../mrt-service.ts';
import {normaliseGeography} from '../../../prototype/agents/prepare.ts';
import {loadOfficialTables} from '../../citizen-grounding/official.ts';
import {buildCitizenDataset,type CitizenGeneratorOptions} from '../../citizen-grounding/generator.ts';
import {validateCitizenDataset} from '../../citizen-grounding/validation.ts';
import type {CitizenDataset} from '../../citizen-grounding/contract.ts';
let inputs:CitizenGeneratorOptions|undefined,cached:CitizenDataset|undefined;
export function getCitizenGenerationInputs():CitizenGeneratorOptions{
 if(inputs)return inputs;
 const raw=JSON.parse(readFileSync(join(process.cwd(),'data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson'),'utf8')),regions:Record<string,string>={};
 for(const f of raw.features){const area=normaliseGeography(f.properties.PLN_AREA_N),region=normaliseGeography(f.properties.REGION_N);ensure(!regions[area]||regions[area]===region,'CITIZEN_REGION_AMBIGUOUS');regions[area]=region;}
 const graph=getBaseline('2026-10-27'),served=new Set([...graph.states.values()].map(s=>s.stationId));
 inputs={seed:'citizen-circumstances-v1',tables:loadOfficialTables(),regions,geography:buildSocietyGeography(),stations:[...graph.stations.values()].filter(s=>served.has(s.id)).map(s=>({id:s.id,lat:s.lat,lon:s.lon}))};inputs=freezeSnapshot(inputs);return inputs;
}
export function getCitizenDataset():CitizenDataset{return cached??=buildCitizenDataset(buildPopulation({size:10000,seed:'impactlens-society-v1'}),getCitizenGenerationInputs());}
const safeId=(id:string)=>{ensure(/^citizens-[a-f0-9]{64}$/.test(id),'CITIZEN_DATASET_PATH');return id;};
function writeOnce(path:string,content:string){
 let fd:number;
 try{fd=openSync(path,'wx',0o600);}catch(error){if((error as NodeJS.ErrnoException).code!=='EEXIST')throw error;ensure(readFileSync(path,'utf8')===content,'CITIZEN_SNAPSHOT_IMMUTABLE');return;}
 try{writeFileSync(fd,content);fsyncSync(fd);}finally{closeSync(fd);}
}
export function persistCitizenDataset(data:CitizenDataset,root=join(process.cwd(),'data/synthetic')):string{
 const expected=getCitizenDataset();if(data!==expected)validateCitizenDataset(data,buildPopulation({size:10000,seed:'impactlens-society-v1'}));ensure(data.id===expected.id,'CITIZEN_RECIPE_MISMATCH');
 mkdirSync(root,{recursive:true,mode:0o700});const id=safeId(data.id);writeOnce(join(root,id+'.json'),JSON.stringify(data));writeOnce(join(root,id+'.manifest.json'),JSON.stringify(data.manifest,null,2));return id;
}
export function loadCitizenDataset(id:string,root=join(process.cwd(),'data/synthetic')):CitizenDataset{
 const path=join(root,safeId(id)+'.json');ensure(statSync(path).size<=64000000,'CITIZEN_ARCHIVE_BOUND');const data=JSON.parse(readFileSync(path,'utf8')) as CitizenDataset;
 const manifestPath=join(root,safeId(id)+'.manifest.json');ensure(statSync(manifestPath).size<=2000000&&readFileSync(manifestPath,'utf8')===JSON.stringify(data.manifest,null,2),'CITIZEN_MANIFEST_IMMUTABLE');
 validateCitizenDataset(data,buildPopulation({size:10000,seed:'impactlens-society-v1'}));ensure(data.id===id&&data.id===getCitizenDataset().id,'CITIZEN_RECIPE_MISMATCH');return getCitizenDataset();
}
