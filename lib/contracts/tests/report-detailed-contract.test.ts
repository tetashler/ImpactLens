import test from 'node:test';
import assert from 'node:assert/strict';
import {DETAILED_REPORT_SECTION_KEYS,parseDetailedReport,parseDetailedReportSections,detailedReportSnapshotPayload} from '../../report-detailed/contract.ts';
import {projectDetailedReportEvidence} from '../../report-detailed/evidence.ts';
import type {PublicExplore} from '../../society/public-contract.ts';

const run=()=>({version:3,kind:'summary-execution',runId:'run-detail-test',question:'What if a new MRT line was built?',status:'completed',session:{id:'session',token:'SECRET_TOKEN',revision:7},job:{status:'completed',tick:10,totalSteps:10,reason:null},society:null,assumptions:['Static travel times'],limitations:['Fictional discussion'],roles:[{id:'resident',label:'Fictional resident',goals:['Keep accessible walking routes.']}],sources:[{id:'source',title:'Transport context',url:'https://example.org/transport',publisher:'Example',publishedAt:null,retrievedAt:'2026-11-02'}],graph:{nodes:[{properties:{secret:'PRIVATE_GRAPH'}}]},memory:'PRIVATE_MEMORY',demographics:{profile:'PRIVATE_PROFILE'}} as unknown as PublicExplore);
const sections=()=>Object.fromEntries(DETAILED_REPORT_SECTION_KEYS.map(k=>[k,`Specific explanation of ${k}.`])) as any;
test('detailed report has six independent bounded plain-text chapters and identity metadata',()=>{
 const value={version:1,runId:'run-detail-test',snapshotKey:'a'.repeat(64),generatedAt:'2026-11-02T10:00:00.000Z',question:run().question,runStatus:'completed',sections:sections()};
 assert.deepEqual(parseDetailedReport(value),value);
 assert.equal(Object.keys(parseDetailedReportSections(sections())).length,6);
 assert.throws(()=>parseDetailedReport({...value,token:'PRIVATE'}));
 assert.throws(()=>parseDetailedReport({...value,snapshotKey:'invalid'}));
 assert.throws(()=>parseDetailedReportSections({...sections(),impacts:'x'.repeat(12001)}));
 assert.throws(()=>parseDetailedReportSections({...sections(),impacts:'\u0000'}));
 assert.throws(()=>parseDetailedReportSections({assessment:'Missing remaining chapters'}));
});
test('detailed evidence includes public perspectives and source context without credentials or profiles',()=>{
 const evidence=projectDetailedReportEvidence(run());
 assert.equal(evidence.stakeholders[0].label,'Fictional resident');
 assert.match(evidence.stakeholders[0].goals[0],/accessible/);
 assert.equal(evidence.sources[0].url,'https://example.org/transport');
 const encoded=JSON.stringify(evidence);
 for(const secret of ['SECRET_TOKEN','PRIVATE_GRAPH','PRIVATE_MEMORY','PRIVATE_PROFILE'])assert.ok(!encoded.includes(secret),secret);
 const value=run();value.sources[0].url='javascript:alert(1)';assert.equal(projectDetailedReportEvidence(value).sources.length,0);
});
test('detailed snapshot identity binds public role/source context and prompt independently of quick summary',()=>{
 const value=run(),before=detailedReportSnapshotPayload(value);
 value.session!.token='different';assert.equal(detailedReportSnapshotPayload(value),before);
 value.roles[0].goals[0]='A different public concern';assert.notEqual(detailedReportSnapshotPayload(value),before);
 assert.notEqual(detailedReportSnapshotPayload(run(),'next-prompt'),before);
 assert.ok(!before.includes('SECRET_TOKEN'));
});
test('detailed evidence preserves a valid international question for artifact and download identity',()=>{
 const value=run();value.question='新地铁线路会改变什么？'.repeat(100);
 assert.equal(projectDetailedReportEvidence(value).question,value.question);
});
