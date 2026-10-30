import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { buildScenarioDemographicContext } from '../../server/demographics/scenario-context.ts';
import { contextForAgent, demographicPrompt, parseScenarioDemographicContext } from '../../demographics/scenario-context.ts';

// Independently summed from the raw CSV using Python csv.DictReader, excluding
// national/planning-area aggregate rows and summing Males/Females leaf columns.
const nationalAgeGroups = {
  '0_4':183250,'5_9':198840,'10_14':206450,'15_19':215520,'20_24':244660,
  '25_29':287150,'30_34':297990,'35_39':299700,'40_44':299470,'45_49':311840,
  '50_54':296200,'55_59':305970,'60_64':284780,'65_69':229590,'70_74':170320,
  '75_79':91080,'80_84':66750,'85_89':36770,'90andOver':20930,
};

test('Census context preserves independently audited historical leaf counts and published-total discrepancy', () => {
  const snapshot = buildScenarioDemographicContext('Consider a Singapore policy');
  assert.equal(snapshot.version,1);
  assert.equal(snapshot.source.referenceYear,2020);
  assert.equal(snapshot.source.updated,'2021-06-18');
  assert.equal(snapshot.source.datasetId,'d_d95ae740c0f8961a0b10435836660ce0');
  assert.match(snapshot.source.rawSha256,/^[a-f0-9]{64}$/);
  assert.equal(snapshot.national.leafPopulation,4_047_260);
  assert.deepEqual(snapshot.national.ageGroups,nationalAgeGroups);
  assert.equal(snapshot.publishedNationalTotal,4_044_210);
  assert.equal(snapshot.leafMinusPublished,3050);
  assert.equal(snapshot.planningArea,null);
  assert.match(snapshot.grain,/subzone.*age group.*sex/i);
  assert.ok(snapshot.unknowns.includes('individual locations'));
  assert.ok(snapshot.limitations.some(s=>/nil\/negligible/i.test(s)));
  assert.ok(snapshot.limitations.some(s=>/historical.*2020/i.test(s)));
  assert.ok(snapshot.limitations.some(s=>/individual|person/i.test(s)));
  assert.deepEqual(parseScenarioDemographicContext(JSON.parse(JSON.stringify(snapshot))),snapshot);
  const prompt=demographicPrompt(snapshot);
  assert.ok(Buffer.byteLength(prompt,'utf8')<2000);
  assert.match(prompt,/Singapore-affiliated/);
  assert.match(prompt,/2020/);
  assert.match(prompt,/https:\/\/data\.gov\.sg\/datasets\//);
});

test('planning-area lookup uses whole geography tokens and preserves zero-detail uncertainty', () => {
  const local = buildScenarioDemographicContext('Build a service in ANG MO KIO.');
  assert.equal(local.planningArea?.name,'Ang Mo Kio');
  assert.equal(local.planningArea?.leafPopulation,162_520);
  assert.equal(local.planningArea?.ageGroups['90andOver'],1170);
  assert.equal(local.planningArea?.ageGroups['0_4'],5300);
  assert.equal(buildScenarioDemographicContext('Evaluate Ang Mo Kiosk').planningArea,null);
  assert.equal(buildScenarioDemographicContext('Ang Mo Kio and Bukit Merah').planningArea,null);
  assert.equal(buildScenarioDemographicContext('Compare Singapore services',{lat:1.3,lon:103.8}).planningArea,null);
  const nilDetail = buildScenarioDemographicContext('Consider Boon Lay services');
  assert.equal(nilDetail.planningArea?.leafPopulation,0);
  // Zero detailed cells never establish zero residents or give anyone an address.
  assert.ok(nilDetail.limitations.some(s=>/absence/i.test(s)));
  assert.doesNotMatch(JSON.stringify(local),/"(?:lat|lon|address|citizens|weight|occupation|income)"\s*:/);
});

test('agent context exposes Singapore aggregates only for explicit supported affiliation', () => {
  const snapshot = buildScenarioDemographicContext('Consider Bukit Merah services');
  for(const label of ['Singapore',' singapore ','Republic of Singapore','SG']) {
    const context=contextForAgent(snapshot,label);
    assert.equal(context.status,'aggregate-context');
    assert.ok(JSON.stringify(context).includes('4047260'));
    assert.ok(Buffer.byteLength(JSON.stringify(context),'utf8')<2000);
  }
  for(const label of [null,'','unknown','ASEAN','Malaysia','United States','Singapore or Malaysia','Singaporean?','not Singapore']) {
    const context=contextForAgent(snapshot,label);
    assert.equal(context.status,'unavailable');
    assert.doesNotMatch(JSON.stringify(context),/4047260|4044210|151540|ageGroups|leafPopulation/);
    assert.match(context.limitation,/affiliation|jurisdiction/i);
  }
});

test('snapshot parser rejects unknown claims, invalid provenance, malformed counts and inconsistent denominators', () => {
  const valid=buildScenarioDemographicContext('Consider Bukit Merah services');
  const edits = [
    {...valid,version:2}, {...valid,individuals:[]}, {...valid,unknowns:[]},
    {...valid,source:{...valid.source,rawSha256:'fake'}},
    {...valid,source:{...valid.source,url:'https://invented.example/census'}},
    {...valid,source:{...valid.source,referenceYear:2026}},
    {...valid,national:{...valid.national,leafPopulation:4_044_210}},
    {...valid,national:{...valid.national,ageGroups:{...valid.national.ageGroups,'0_4':-1}}},
    {...valid,national:{...valid.national,ageGroups:{...valid.national.ageGroups,'0_4':NaN}}},
    {...valid,national:{...valid.national,ageGroups:{...valid.national.ageGroups,income:12}}},
    {...valid,planningArea:{...valid.planningArea,name:'x'.repeat(81)}},
    {...valid,leafMinusPublished:0}, {...valid,limitations:['representative individual behaviour']},
  ];
  for(const invalid of edits) assert.throws(()=>parseScenarioDemographicContext(invalid));
  const first=buildScenarioDemographicContext('Consider Bukit Merah services');
  first.national.ageGroups['0_4']=1;
  assert.equal(buildScenarioDemographicContext('Consider Bukit Merah services').national.ageGroups['0_4'],183250);
  assert.ok(Buffer.byteLength(demographicPrompt(valid),'utf8')<2000);
});

test('demographic contract imports remain browser-safe and bounds inputs', () => {
  const seen=new Set<string>();
  function inspect(path:string) {
    if(seen.has(path))return;seen.add(path);
    const code=readFileSync(path,'utf8');
    assert.doesNotMatch(code,/\bprocess\.env\b|\bnode:|lib\/server/);
    for(const match of code.matchAll(/from\s+['"]([^'"]+)['"]/g)) {
      assert.ok(match[1].startsWith('.'));inspect(resolve(dirname(path),match[1]));
    }
  }
  inspect(resolve('lib/demographics/scenario-context.ts'));
  assert.throws(()=>buildScenarioDemographicContext('x'.repeat(2001)));
});
