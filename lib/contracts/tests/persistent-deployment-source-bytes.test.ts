/** Checkout filters must not change the byte identities used by immutable snapshots. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {OD_SOURCE_SHA256,EXIT_SOURCE_SHA256,STOP_CROSSWALK_SHA256} from '../../server/citizen-grounding/transport-data.ts';

const sources=[
 ['data/geography/MasterPlan2019SubzoneBoundaryNoSeaGEOJSON.geojson','77e30aa02b1784b649d9b6f23e3b2ebb825af787de554f3a3fb76bbee3013c42'],
 ['data/transport/LTAMRTStationExitGEOJSON.geojson',EXIT_SOURCE_SHA256],
 ['data/transport/mrt-network/stops.txt',STOP_CROSSWALK_SHA256],
 ['data/transport/origin_destination_train_202609.csv',OD_SOURCE_SHA256],
] as const;
const census='data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv';
function gitHash(args:string[],input:Buffer){const result=spawnSync('git',args,{input,encoding:'utf8',windowsHide:true});assert.equal(result.status,0,result.stderr);return result.stdout.trim();}

test('byte-pinned geography and transport sources retain accepted raw SHA256 identities',()=>{
 for(const [path,pin]of sources)assert.equal(createHash('sha256').update(readFileSync(path)).digest('hex'),pin,path);
});

test('Git preserves immutable source bytes for both Windows and Linux autocrlf settings',()=>{
 for(const path of [...sources.map(([path])=>path),census]){
  const bytes=readFileSync(path),raw=gitHash(['hash-object','--no-filters','--stdin'],bytes);
  for(const setting of ['true','false'])assert.equal(gitHash(['-c','core.autocrlf='+setting,'hash-object','--path='+path,'--stdin'],bytes),raw,`${path}: autocrlf=${setting} changed the pinned source bytes`);
 }
});
