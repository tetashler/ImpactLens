/** Explicit offline generation entry point; only writes its new immutable synthetic artifacts. */
import './testing/offline-network.mjs';
import {statSync,readFileSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {getCitizenDataset,getCitizenGenerationInputs,persistCitizenDataset} from '../lib/server/citizen-grounding/data.ts';
import {buildCitizenDataset} from '../lib/citizen-grounding/generator.ts';
import {buildPopulation} from '../lib/server/population/store.ts';
const data=getCitizenDataset(),again=buildCitizenDataset(buildPopulation({size:10000,seed:'impactlens-society-v1'}),getCitizenGenerationInputs());
if(data.id!==again.id)throw Error('CITIZEN_NONDETERMINISTIC');
persistCitizenDataset(data);
const counts=(key:'labourForceStatus'|'travelMode')=>Object.fromEntries([...new Set(data.records.map(r=>r[key]))].map(value=>[value,data.records.filter(r=>r[key]===value).length]));
const path=join('data/synthetic',data.id+'.json');
console.log(JSON.stringify({version:1,policy:data.policy,datasetId:data.id,populationId:data.populationId,records:data.records.length,representedPopulation:data.manifest.representedPopulation,sources:data.manifest.sources.map(s=>({id:s.id,sha256:s.sha256,rows:s.rows,columns:s.columns.length})),labourForce:counts('labourForceStatus'),travelMode:counts('travelMode'),workplaces:data.records.filter(r=>r.workplaceArea!==null).length,schedules:data.records.filter(r=>r.schedule!==null).length,accessStations:data.records.filter(r=>r.preferredAccessStationId!==null).length,calibration:{comparisons:data.manifest.calibration.length,assessed:data.manifest.calibration.filter(c=>c.withinTolerance!==null).length,unassessed:data.manifest.calibration.filter(c=>c.withinTolerance===null).length,outsideTolerance:data.manifest.calibration.filter(c=>c.withinTolerance===false).length,maximumAbsoluteResidual:Math.max(0,...data.manifest.calibration.map(c=>Math.abs(c.difference??0)))},reproducibleHash:data.id===again.id,bytes:statSync(path).size,sha256:createHash('sha256').update(readFileSync(path)).digest('hex'),paidCalls:0}));
