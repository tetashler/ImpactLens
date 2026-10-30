import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,rmSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildPopulation,loadPopulation,persistPopulation,populationView} from '../../server/population/store.ts';
test('national population preserves source targets and the Census leaf discrepancy',()=>{
 const p=buildPopulation({size:10000,seed:'society-test'});assert.equal(p.population.citizens.length,10000);assert.equal(p.validation.representedPopulation,4047260);assert.equal(p.validation.publishedTotal,4044210);assert.equal(p.validation.discrepancy,3050);assert.ok(p.validation.maximumWeightedCellError<1e-6);assert.ok(p.validation.positiveCells>8000);assert.equal(p.households.status,'unsupported');assert.equal(p.organisations.status,'unassigned');assert.equal(p.version,1);
 assert.deepEqual(buildPopulation({size:10000,seed:'society-test'}),p);assert.notEqual(buildPopulation({size:10000,seed:'different'}).id,p.id);
});
test('saved populations regenerate deterministically and reject altered identity/unsupported data',()=>{
 const dir=mkdtempSync(join(tmpdir(),'impact-population-'));try{const p=buildPopulation({size:10000,seed:'archive'});persistPopulation(p,dir);assert.deepEqual(loadPopulation(p.id,dir),p);assert.equal(populationView(p,32).residents.length,32);assert.ok(populationView(p,32).residents.every(c=>c.synthetic&&c.label.startsWith('Fictional resident ')));assert.throws(()=>loadPopulation('../outside',dir));const text=readFileSync(join(dir,p.id+'.json'),'utf8');assert.ok(!text.includes('startingLocation'));assert.ok(!text.includes('householdIncome'));const altered=JSON.parse(text);altered.population.citizens[0].weight++;writeFileSync(join(dir,p.id+'.json'),JSON.stringify(altered));assert.throws(()=>loadPopulation(p.id,dir),/identity/);}finally{rmSync(dir,{recursive:true,force:true});}
});
test('two national sample sizes preserve every supported marginal while record counts differ',()=>{for(const size of [10000,20000]){const p=buildPopulation({size,seed:'scaling'});for(const dimension of Object.values(p.validation.marginals))for(const v of Object.values(dimension))assert.ok(Math.abs(v.weighted-v.target)<1e-6);assert.equal(p.population.citizens.length,size);}});
test('bounded configuration never silently drops national demographic cells',()=>{for(const size of [1,500,30001,1.5])assert.throws(()=>buildPopulation({size,seed:'bad'}));assert.throws(()=>buildPopulation({size:10000,seed:''}));});
