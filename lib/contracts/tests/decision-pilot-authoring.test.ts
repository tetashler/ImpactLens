import test from 'node:test';
import assert from 'node:assert/strict';
import {inspectableReportFixture} from './helpers/inspectable-report-fixture.ts';

const casesModule=await import('../../decision-pilot/cases.ts').catch(()=>null);
const authoring=await import('../../decision-pilot/authoring.ts').catch(()=>null);
test('public evidence JSON export is strict, complete and uses a JSON filename',async()=>{
 const m=await import('../../report-detailed/export.ts');assert.equal(typeof m.reportToJSON,'function');
 const report=inspectableReportFixture();assert.deepEqual(JSON.parse(m.reportToJSON(report)),report);
 assert.match(m.reportDownloadFilename(report,'json'),/\.json$/);
 assert.throws(()=>m.reportToJSON({...report,token:'PRIVATE_TOKEN'} as any));
});
test('six local pilot cases have inspectable sources, withheld provisional keys and no invented discussion',()=>{
 assert.ok(casesModule?.pilotCases,'local source-backed cases required');
 const cases=casesModule.pilotCases;assert.equal(cases.length,6);assert.equal(new Set(cases.map(c=>c.id)).size,6);
 assert.equal(cases.filter(c=>c.reference.expectedDecision==='insufficient-evidence').length,3);
 for(const c of cases){assert.equal(c.supplement,null);assert.ok(c.generationQuestion.length<=2000);assert.ok(c.generationQuestion.includes(c.brief));assert.ok(c.sources.length);for(const s of c.sources){assert.match(s.url,/^https:/);assert.ok(c.sourceIds.includes(s.id));assert.ok(c.generationQuestion.includes(s.summary));}}
});
test('only actual V2 public discussion excerpts with the exact frozen brief question can be attached',()=>{
 assert.ok(authoring?.attachPilotDiscussion);assert.ok(casesModule?.pilotCases);
 const c=casesModule.pilotCases[0],report=inspectableReportFixture();report.question=c.generationQuestion;
 const result=authoring.attachPilotDiscussion(c,report);assert.equal(c.supplement,null);assert.ok(result.supplement);assert.equal(result.supplement.runId,report.runId);assert.equal(result.supplement.items.length,1);assert.equal(result.supplement.items[0].id,'event-staff');
 assert.doesNotMatch(JSON.stringify(result.supplement),/source-staff|calc-minutes|sections|supportIds/);
 assert.throws(()=>authoring.attachPilotDiscussion(c,{...report,question:c.question}));
 const {findings,evidence,...legacy}=report;assert.throws(()=>authoring.attachPilotDiscussion(c,{...legacy,version:1}));
 const noDiscussion={...report,evidence:report.evidence.filter(e=>e.kind!=='discussion-event'),findings:report.findings.map(f=>({...f,supportIds:f.supportIds.filter(id=>id!=='event-staff')}))};assert.throws(()=>authoring.attachPilotDiscussion(c,noDiscussion));
 assert.throws(()=>authoring.attachPilotDiscussion(c,{...report,session:{token:'PRIVATE_TOKEN'}}));
 assert.ok(Object.isFrozen(result.supplement.items));
});
