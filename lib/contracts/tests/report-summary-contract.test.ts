import test from 'node:test';
import assert from 'node:assert/strict';
import {parseReportSections,parseReportSummary,parseReportNarrative} from '../../report-summary/contract.ts';

const sections=()=>({findings:'A bounded fictional run was recorded.',agreements:'Agreement details are unavailable.',disagreements:'Disagreement details are unavailable.',concerns:'Reported concerns cannot be established from counts.',unknowns:'The run was interrupted; outcomes remain unknown.'});
const summary=()=>({version:1,runId:'run-test',snapshotKey:'a'.repeat(64),generatedAt:'2026-11-02T01:00:00.000Z',sections:sections()});

test('report contract accepts only five bounded plain-text sections and returns detached text',()=>{
 const input=summary(),result=parseReportSummary(input);assert.deepEqual(result,input);
 input.sections.findings='changed';assert.notEqual(result.sections.findings,input.sections.findings);
 const literal='<script>alert("not markup")</script>';assert.equal(parseReportSections({...sections(),findings:literal}).findings,literal);
 for(const value of [null,[],{}, {...sections(),quotes:[]},{...sections(),findings:''},{...sections(),findings:'x'.repeat(2401)},{...sections(),concerns:'unsafe\u0000control'}])assert.throws(()=>parseReportSections(value));
});

test('report contract rejects wrong versions, malformed snapshot identity and unexpected fields',()=>{
 for(const change of [{version:2},{runId:'../private'},{snapshotKey:'not-a-hash'},{generatedAt:'not-a-date'},{token:'PRIVATE_TOKEN'},{sections:{...sections(),findings:42}}])assert.throws(()=>parseReportSummary({...summary(),...change}));
});

test('report artifact supports bounded graph narratives without exposing source statements',()=>{
 const value={...summary(),nodeSummaries:[{nodeId:'platform:reddit',summary:'Residents discussed how the proposed clinic could affect access to care.'}]};
 assert.deepEqual(parseReportSummary(value),value);
 assert.equal(parseReportSummary(summary()).nodeSummaries,undefined,'older artifacts remain readable');
 for(const nodeSummaries of [[{nodeId:'platform:reddit',summary:''}],[{nodeId:'platform:reddit',summary:'x'.repeat(651)}],Array.from({length:17},(_,i)=>({nodeId:'node-'+i,summary:'A view.'})),[{nodeId:'same',summary:'A view.'},{nodeId:'same',summary:'Another view.'}],[{nodeId:'node',summary:'A view.',text:'RAW_SOURCE'}]])assert.throws(()=>parseReportSummary({...summary(),nodeSummaries}));
});

test('writer narrative accepts only known node references and five readable sections',()=>{
 const nodes=[{nodeId:'reddit',summary:'Initial comments raised access and staffing questions.'}];
 assert.deepEqual(parseReportNarrative({...sections(),nodeSummaries:nodes},new Set(['reddit'])),{sections:sections(),nodeSummaries:nodes});
 assert.throws(()=>parseReportNarrative({...sections(),nodeSummaries:nodes},new Set(['other'])));
 assert.throws(()=>parseReportNarrative({...sections(),nodeSummaries:nodes,rawStatements:['PRIVATE']}));
});
