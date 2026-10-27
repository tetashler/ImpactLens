import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { AGE_GROUPS, prepareCensus } from '../prepare.ts';
import { generatePopulation, toRenderAgent } from '../generate.ts';
import { parseCsv } from '../../mrt/csv.ts';

// Synthetic fixture: 60 male 0–4, 30 female 0–4, 10 male 5–9.
function fixture() {
  const cols = ['Number', ...['Total','Males','Females'].flatMap(s => ['Total',...AGE_GROUPS].map(a => `${s}_${a}`))];
  const counts: Record<string,number> = {Total_Total:100,Total_0_4:90,Total_5_9:10,Males_Total:70,Males_0_4:60,Males_5_9:10,Females_Total:30,Females_0_4:30};
  const row = (name: string) => cols.map(c => c === 'Number' ? name : counts[c] ?? 0).join(',');
  return [cols.join(','),row('Total'),row('Test Area - Total'),row('Test Subzone')].join('\n');
}
const prepare = (csv = fixture()) => prepareCensus(csv, {kind:'synthetic-fixture',datasetId:'test-only',referenceYear:2020,agency:'Test fixture',sourceUrl:'https://example.invalid',updated:'2021-06-18',licenceUrl:'https://example.invalid/licence'});
test('normalises hierarchy, retains zero cells, excludes aggregates', () => {
  const d = prepare();
  assert.equal(d.cells.length,38); assert.equal(d.population,100);
  assert.equal(d.cells[0].planningArea,'test-area'); assert.equal(d.cells[0].subzone,'test-subzone');
  assert.equal(d.audit.rawRows,3);
});
test('rejects missing categories, invalid counts and duplicate geography', () => {
  assert.throws(() => prepare(fixture().replace('Females_90andOver','wrong')), /column/i);
  for (const x of ['', 'na', '-1','1.5','Infinity']) assert.throws(() => prepare(fixture().replace('Test Subzone,100',`Test Subzone,${x}`)),/count/i);
  assert.throws(() => prepare(fixture()+'\n'+fixture().split('\n').at(-1)),/duplicate/i);
});
test('nil/negligible is explicitly assumed zero; retains source row', () => {
  const d = prepare(fixture().replace(/,0/g,',-'));
  assert.ok(d.audit.nilOrNegligibleCells>0);
  assert.ok(d.source.assumptionIds.includes('nil-negligible-as-zero'));
  assert.equal(d.cells[0].sourceRow,4);
});
test('reports rounded inconsistent totals without altering leaf weights', () => {
  const d = prepare(fixture().replace('Test Subzone,100','Test Subzone,110'));
  assert.equal(d.population,100);
  assert.ok(d.audit.discrepancies.some(x => x.published===110 && x.calculated===100));
  const corrupt=prepare(fixture().replace('Test Subzone,100','Test Subzone,99999'));
  assert.ok(corrupt.audit.discrepancies.some(x=>Math.abs(x.difference)>x.tolerance));
});
test('deterministic seed, varied seeds and unique synthetic IDs', () => {
  const a = generatePopulation(prepare(),{size:20,seed:'alpha'});
  assert.deepEqual(a,generatePopulation(prepare(),{size:20,seed:'alpha'}));
  assert.notDeepEqual(a.citizens,generatePopulation(prepare(),{size:20,seed:'beta'}).citizens);
  assert.equal(new Set(a.citizens.map(c=>c.id)).size,20);
});
test('independent literal totals verify weighted joint and marginal distributions', () => {
  for (const size of [3,4,20,101]) {
    const p = generatePopulation(prepare(),{size,seed:'test'});
    assert.equal(p.citizens.length,size);
    const sum = (f: (c: typeof p.citizens[number])=>boolean) => p.citizens.filter(f).reduce((s,c)=>s+c.weight,0);
    assert.ok(Math.abs(sum(()=>true)-100)<1e-10);
    assert.ok(Math.abs(sum(c=>c.observed.sex==='male')-70)<1e-10);
    assert.ok(Math.abs(sum(c=>c.observed.ageGroup==='0_4')-90)<1e-10);
    assert.ok(Math.abs(sum(c=>c.observed.sex==='male' && c.observed.ageGroup==='0_4')-60)<1e-10);
    assert.ok(p.citizens.every(c=>c.weight>0 && c.observed.subzone==='test-subzone' && AGE_GROUPS.includes(c.observed.ageGroup)));
  }
});
test('small samples, empty groups and unknown geographic selections fail clearly', () => {
  for (const size of [0,-1,1,2,1.2,NaN]) assert.throws(()=>generatePopulation(prepare(),{size,seed:'a'}),/size|positive cells/i);
  for (const selection of [{planningAreas:['missing']},{subzones:['missing']}]) assert.throws(()=>generatePopulation(prepare(),{size:3,seed:'a',...selection}),/selection/i);
  const empty=prepare(fixture().replace(/\b100\b|\b90\b|\b70\b|\b60\b|\b30\b|\b10\b/g,'0'));
  assert.equal(empty.population,0);
  assert.throws(()=>generatePopulation(empty,{size:3,seed:'a'}),/empty/i);
});
test('runtime validation rejects tampered duplicate/count/category distributions', () => {
  const d=prepare();
  assert.throws(()=>generatePopulation({...d,cells:[...d.cells,d.cells[0]]},{size:50,seed:'a'}),/duplicate/i);
  assert.throws(()=>generatePopulation({...d,cells:[{...d.cells[0],count:-1}]},{size:50,seed:'a'}),/count/i);
  assert.throws(()=>generatePopulation({...d,cells:[{...d.cells[0],ageGroup:'bogus'}]} as never,{size:50,seed:'a'}),/category/i);
});
test('empty CSV, missing hierarchy, invalid seeds and empty selections are rejected',()=>{
  assert.throws(()=>prepare(''),/header|column/i);
  assert.throws(()=>prepare(fixture().split('\n').filter(x=>!x.startsWith('Test Area')).join('\n')),/hierarchy/i);
  assert.throws(()=>generatePopulation(prepare(),{size:3,seed:''}),/seed/i);
  assert.throws(()=>generatePopulation(prepare(),{size:3,seed:'a',planningAreas:[]}),/selection/i);
});
test('canonical cell ordering is independent of transformed row order',()=>{
  const d=prepare(), options={size:20,seed:'reorder'};
  assert.deepEqual(generatePopulation(d,options),generatePopulation({...d,cells:[...d.cells].reverse()},options));
});
test('render payload carries categories and weights without fabricated coordinates',()=>{
  const c=generatePopulation(prepare(),{size:3,seed:'render'}).citizens[0];
  const r=toRenderAgent(c);
  assert.deepEqual(r,{agentId:c.id,origin:{planningArea:'test-area',subzone:'test-subzone'},demographic:{ageGroup:c.observed.ageGroup,sex:c.observed.sex},weight:c.weight});
  assert.deepEqual(JSON.parse(JSON.stringify(r)),r);
});
test('separates observed categories from unassigned assumptions and serializes profiles', () => {
  const p=generatePopulation(prepare(),{size:3,seed:'a',planningAreas:[' TEST AREA '],subzones:['Test Subzone']});
  assert.deepEqual(JSON.parse(JSON.stringify(p)),p);
  for (const c of p.citizens) {
    assert.equal(c.synthetic,true); assert.equal(c.assumed.status,'unassigned');
    assert.equal(c.provenance.referenceYear,2020); assert.equal(c.provenance.kind,'synthetic-fixture');
    assert.equal(c.assumed.startingLocation,undefined);
  }
});
test('real source parses all rows including irregular Changi total label', () => {
  const d=prepareCensus(readFileSync('data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv','utf8'));
  assert.equal(d.audit.rawRows,388); assert.ok(d.cells.length>10000);
  // Independently calculated using Python's csv reader, not the preparation code.
  assert.equal(d.population,4_047_260);
  assert.equal(d.audit.planningAreas,55); assert.equal(d.audit.subzones,332);
  assert.equal(d.cells.filter(c=>c.count>0).length,8359);
  assert.ok(d.cells.some(c=>c.planningArea==='changi'));
  const p=generatePopulation(d,{size:2000,seed:'a',planningAreas:['Ang Mo Kio']});
  assert.ok(p.citizens.every(c=>c.observed.planningArea==='ang-mo-kio'));
  assert.equal(p.representedPopulation,162520);
});
test('CLI reproducible across processes, concise, rejects unknown flags', () => {
  const args=['prototype/agents/cli.ts','--size','2000','--seed','demo','--area','Ang Mo Kio'];
  const a=execFileSync(process.execPath,args,{encoding:'utf8'});
  assert.equal(a,execFileSync(process.execPath,args,{encoding:'utf8'}));
  const p=JSON.parse(a); assert.equal(p.agentCount,2000); assert.equal(p.referenceYear,2020);
  assert.ok(a.length<10000);
  assert.notEqual(spawnSync(process.execPath,['prototype/agents/cli.ts','--wat']).status,0);
});
test('national weighted joint cells reconcile directly to every raw source column',()=>{
  const csv=readFileSync('data/demographics/ResidentPopulationbyPlanningAreaSubzoneofResidenceAgeGroupandSexCensusofPopulation2020.csv','utf8');
  const d=prepareCensus(csv), p=generatePopulation(d,{size:10000,seed:'national'});
  const raw=new Map(parseCsv(csv).rows.map(r=>[r.row,r.values]));
  const weights=new Map<string,number>();
  for (const c of p.citizens) {
    const key=`${c.provenance.sourceRow}/${c.observed.sex}/${c.observed.ageGroup}`;
    weights.set(key,(weights.get(key)??0)+c.weight);
  }
  assert.equal(p.citizens.length,10000); assert.equal(weights.size,8359);
  for (const c of d.cells) {
    const column=`${c.sex==='male'?'Males':'Females'}_${c.ageGroup}`;
    const value=raw.get(c.sourceRow)![column];
    const expected=value==='-'?0:Number(value);
    const actual=weights.get(`${c.sourceRow}/${c.sex}/${c.ageGroup}`)??0;
    assert.ok(Math.abs(actual-expected)<1e-7,`${c.sourceRow}/${column}: ${actual} != ${expected}`);
  }
  assert.ok(Math.abs(p.citizens.reduce((s,c)=>s+c.weight,0)-4_047_260)<1e-6);
});
test('CLI national selection and insufficient samples preserve honest coverage',()=>{
  const run=(args:string[])=>spawnSync(process.execPath,['prototype/agents/cli.ts',...args],{encoding:'utf8'});
  const national=run(['--all','--size','10000']);
  assert.equal(national.status,0); assert.equal(JSON.parse(national.stdout).positiveCells,8359);
  const small=run(['--all']);
  assert.notEqual(small.status,0); assert.match(small.stderr,/8359 positive cells/);
  assert.notEqual(run(['--all','--area','Ang Mo Kio']).status,0);
  const empty=run(['--area','Boon Lay']);
  assert.notEqual(empty.status,0); assert.match(empty.stderr,/Empty population/);
});
