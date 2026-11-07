import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,mkdirSync,readFileSync,existsSync,rmSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {pilotCases} from '../../decision-pilot/cases.ts';
import {attachPilotDiscussion} from '../../decision-pilot/authoring.ts';
import {inspectableReportFixture} from './helpers/inspectable-report-fixture.ts';
const cli=(args:string[])=>spawnSync(process.execPath,['scripts/decision-pilot.ts',...args],{cwd:process.cwd(),encoding:'utf8',timeout:15000,windowsHide:true});
test('author CLI exports six unprepared cases and exact prompts without inventing ready reviewer packets',t=>{
 const root=mkdtempSync(join(tmpdir(),'decision-pilot-cli-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const out=join(root,'questions'),first=cli(['questions','--out',out]);assert.equal(first.status,0,first.stderr);
 const cases=JSON.parse(readFileSync(join(out,'cases.json'),'utf8'));assert.equal(cases.length,6);assert.ok(cases.every((c:any)=>c.supplement===null));
 const prompts=readFileSync(join(out,'generation-questions.md'),'utf8');assert.ok(prompts.includes(cases[0].generationQuestion));
 const before=readFileSync(join(out,'cases.json'),'utf8');assert.notEqual(cli(['questions','--out',out]).status,0);assert.equal(readFileSync(join(out,'cases.json'),'utf8'),before);
 const packetDir=join(root,'packets'),blocked=cli(['build','--cases',join(out,'cases.json'),'--reviewers','R01,R02,R03','--seed','test','--out',packetDir]);assert.notEqual(blocked.status,0);assert.equal(existsSync(packetDir),false);assert.match(blocked.stderr,/all six actual discussion supplements are required/);
});
test('test-only prepared artifacts build assigned packets and analyse incomplete reviews without fake quality scores',t=>{
 const root=mkdtempSync(join(tmpdir(),'decision-pilot-cli-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 const cases=pilotCases.map(c=>{const report=inspectableReportFixture();report.runId='test-only-'+c.id;report.question=c.generationQuestion;return attachPilotDiscussion(c,report);});
 const input=join(root,'cases.json');writeFileSync(input,JSON.stringify(cases));const out=join(root,'study');
 const built=cli(['build','--cases',input,'--reviewers','R01,R02,R03','--seed','test-only','--out',out]);assert.equal(built.status,0,built.stderr);
 const packet=JSON.parse(readFileSync(join(out,'R01.packet.json'),'utf8'));assert.equal(packet.items.length,6);assert.equal(packet.items.filter((i:any)=>i.discussion.length).length,3);assert.ok(!JSON.stringify(packet).includes('expectedDecision'));
 const reviews=join(root,'reviews');mkdirSync(reviews);const item=packet.items[0];
 const review={id:'R01:'+item.caseId,studyId:packet.studyId,packetId:packet.id,reviewerId:'R01',caseId:item.caseId,itemId:item.id,decision:'insufficient-evidence',concerns:[{id:'concern-1',text:'TEST ONLY response, not human evidence.',referenceIds:[]}],stakeholders:[],claims:[],questions:[],activeMilliseconds:1000,elapsedMilliseconds:2000,submittedAt:'2026-11-07T01:00:00Z',independent:true};
 writeFileSync(join(reviews,'R01.json'),JSON.stringify({version:1,kind:'decision-pilot-reviews',studyId:packet.studyId,packetId:packet.id,reviewerId:'R01',reviews:[review]}));
 const analysisOut=join(root,'analysis'),analysed=cli(['analyse','--study',join(out,'study.json'),'--reviews',reviews,'--out',analysisOut]);assert.equal(analysed.status,0,analysed.stderr);
 const result=JSON.parse(readFileSync(join(analysisOut,'analysis.json'),'utf8'));assert.equal(result.status,'needs-coding');assert.equal(result.rows[0].usefulConcerns,null);assert.equal(result.counts.missingReviews,17);
 const coding=JSON.parse(readFileSync(join(analysisOut,'coding-template.json'),'utf8'));assert.match(coding[0].reviewHash,/^[a-f0-9]{64}$/);assert.equal(coding[0].usefulConcernIds,null);
});
test('CLI rejects unknown/duplicated arguments and report mismatch without overwriting inputs',t=>{
 const root=mkdtempSync(join(tmpdir(),'decision-pilot-cli-'));t.after(()=>rmSync(root,{recursive:true,force:true}));
 assert.notEqual(cli(['questions','--out',root,'--out',root]).status,0);
 assert.notEqual(cli(['questions','--out',root,'--secret','anything']).status,0);
 const report=join(root,'report.json');writeFileSync(report,'{}');
 const out=join(root,'attached.json');assert.notEqual(cli(['attach','--case','polyclinic-whampoa','--report',report,'--out',out]).status,0);assert.equal(existsSync(out),false);assert.equal(readFileSync(report,'utf8'),'{}');
});
