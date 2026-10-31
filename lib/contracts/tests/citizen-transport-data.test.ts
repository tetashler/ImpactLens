import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildStationCodeCrosswalk,parseOdReference,parseStationAccessPoints,loadTransportDemandReference,loadStationAccessPoints} from '../../server/citizen-grounding/transport-data.ts';
import {baselineFixture} from '../../../prototype/mrt/tests/scenario-fixtures.ts';
import {getBaseline} from '../../server/mrt-service.ts';
import fs from 'node:fs';
import {syncBuiltinESMExports} from 'node:module';

const header='YEAR_MONTH,DAY_TYPE,TIME_PER_HOUR,PT_TYPE,ORIGIN_PT_CODE,DESTINATION_PT_CODE,TOTAL_TRIPS';
test('reviewed stop-code parents and combined interchange codes map only to one unambiguous served station',()=>{
 const g=baselineFixture(),stops='stop_id,stop_code,parent_station\nNS4_A,NS4,NS4\nBP1_A,BP1,BP1\nX_A,X,X\nY_A,Y,Y';const c=buildStationCodeCrosswalk(g,stops);
 assert.equal(c('BP1/NS4').stationId,'NS4');assert.equal(c('NS4').stationId,'NS4');assert.equal(c('NS4/X').stationId,null);assert.equal(c('BOGUS').stationId,null);
});
test('OD parsing retains unsupported trip mass separately and never assigns trips to synthetic citizens',()=>{
 const g=baselineFixture(),map=buildStationCodeCrosswalk(g,'stop_id,stop_code,parent_station\nNS4_A,NS4,NS4\nX_A,X,X');
 const csv=header+'\n2026-09,WEEKDAY,8,TRAIN,NS4,X,10\n2026-09,WEEKENDS/HOLIDAY,9,TRAIN,BOGUS,X,4';const r=parseOdReference(csv,map);
 assert.equal(r.records,2);assert.equal(r.totalTrips,14);assert.equal(r.matchedTrips,10);assert.equal(r.unmappedTrips,4);assert.equal(r.period,'2026-09');assert.deepEqual(r.hours,[8,9]);assert.ok(r.stationMappings.some(m=>m.code==='BOGUS'&&m.stationId===null));
});
test('OD schema, grain duplicates, missing values, date, type, hours and trip counts fail closed',()=>{
 const map=buildStationCodeCrosswalk(baselineFixture(),'stop_id,stop_code,parent_station\nNS4_A,NS4,NS4\nX_A,X,X'),row='2026-09,WEEKDAY,8,TRAIN,NS4,X,10';
 for(const text of [header+'\n'+row+'\n'+row,header+'\n'+row.replace('WEEKDAY','DAY'),header+'\n'+row.replace(',8,',',24,'),header+'\n'+row.replace('2026-09','2026-13'),header+'\n'+row.replace('TRAIN','BUS'),header+'\n'+row.replace(',10',',-1'),header+'\n'+row.replace('NS4,',','),'bad\n'+row])assert.throws(()=>parseOdReference(text,map));
});
test('station exit mapping requires exact unique normalized station identity and valid source geometry',()=>{
 const g=baselineFixture(),data={type:'FeatureCollection',features:[{type:'Feature',geometry:{type:'Point',coordinates:[103.7401,1.3801]},properties:{OBJECTID:1,STATION_NA:'Choa Chu Kang MRT Station',EXIT_CODE:'A'}},{type:'Feature',geometry:{type:'Point',coordinates:[103.8,1.4]},properties:{OBJECTID:2,STATION_NA:'Other MRT Station',EXIT_CODE:'B'}}]};
 const r=parseStationAccessPoints(data,g,'f'.repeat(64));assert.equal(r.matchedExits,1);assert.equal(r.totalExits,2);assert.equal(r.index.points.NS4.length,1);assert.equal(r.index.points.X,undefined);assert.ok(r.index.points.NS4[0].basis.includes('not'));
 const bad=structuredClone(data);bad.features[0].geometry.coordinates[0]=NaN;assert.throws(()=>parseStationAccessPoints(bad,g,'f'.repeat(64)));
 const dup=structuredClone(data);dup.features[1].properties.OBJECTID=1;assert.throws(()=>parseStationAccessPoints(dup,g,'f'.repeat(64)));
});
test('actual September 2026 OD and 613 exits produce a frozen reference with conserved trip mass and source pins',()=>{
 const graph=getBaseline('2026-10-27'),r=loadTransportDemandReference(graph),access=loadStationAccessPoints(graph);
 assert.equal(r.records,887478);assert.equal(r.totalTrips,85880422);assert.equal(r.period,'2026-09');assert.equal(r.exitFeatures,613);assert.equal(r.sourceHash,'29d4552658d1cd4d929e693eea7c8180f6e2c6dc8b2760314420e72fa82b78c5');assert.equal(r.exitSourceHash,'7a57cb14cf7c621203938e944f99b41891284e5e67876c43d9f8f3ee3aa88ee6');
 assert.equal(r.matchedTrips+r.unmappedTrips,r.totalTrips);assert.ok(r.matchedTrips>0);assert.ok(r.matchedExits>0);assert.equal(access.sourceHash,r.exitSourceHash);assert.ok(Object.keys(access.points).length>0);assert.ok(r.limitations.some(s=>/not.*commut|not.*residen/i.test(s)));assert.throws(()=>{r.records=0;},TypeError);
 assert.strictEqual(loadTransportDemandReference(graph),r);
});
test('cached transport references still fail closed when current source bytes differ from their immutable pin',()=>{
 const graph=getBaseline('2026-10-27');loadTransportDemandReference(graph);const original=fs.readFileSync;
 try{fs.readFileSync=((path:unknown,...args:unknown[])=>String(path).endsWith('origin_destination_train_202609.csv')?Buffer.from('corrupted source bytes'):Reflect.apply(original,fs,[path,...args])) as typeof original;syncBuiltinESMExports();assert.throws(()=>loadTransportDemandReference(graph),/SOURCE_CHANGED/);}
 finally{fs.readFileSync=original;syncBuiltinESMExports();}
});
test('the explicit GTFS stop-code crosswalk remains source-pinned even after a reference is cached',()=>{
 const graph=getBaseline('2026-10-27');loadTransportDemandReference(graph);const original=fs.readFileSync;
 try{fs.readFileSync=((path:unknown,...args:unknown[])=>String(path).replaceAll('\\','/').endsWith('mrt-network/stops.txt')?Buffer.from('corrupted crosswalk source'):Reflect.apply(original,fs,[path,...args])) as typeof original;syncBuiltinESMExports();assert.throws(()=>loadTransportDemandReference(graph),/SOURCE_CHANGED/);}
 finally{fs.readFileSync=original;syncBuiltinESMExports();}
});
