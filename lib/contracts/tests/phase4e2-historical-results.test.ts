import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as results from '../../../scripts/testing/phase4e2-historical-results.ts';

const approvedFile='f62d6f5e112fc640aa275e193f31fc0eb909032445c106fe4fedcbdf1fa1a916.json';
function fixture(){return {
 expectedMandatory:['legacy-a.json','swarm-b.json'],
 qualifying:[
  {file:'legacy-a.json',replayExact:true,archiveUnchanged:true,journalUnchanged:true},
  {file:'swarm-b.json',replayExact:true,archiveUnchanged:true,journalUnchanged:true,checkpointTailExact:true},
 ],
 failures:[{file:approvedFile,code:'SOCIAL_STALE'}],
 classified:[{file:approvedFile,classification:'pre-final-mocked-development-artifact',qualification:'nonqualifying-for-mandatory-historical-replay',replayStatus:'unresolved-SOCIAL_STALE',hashesVerified:true,recordIndex:0,tick:1,sourcePolicyRecoverable:false as const}],
 approvedFile,
};}
function evaluate(input=fixture()){
 assert.equal(typeof results.historicalAcceptanceResult,'function','historical outcome aggregation must exist');
 return results.historicalAcceptanceResult(input);
}
function rejected(input=fixture()){
 const result=evaluate(input);
 assert.equal(result.mandatory.status,'FAIL');
 assert.equal(result.inventory.status,'INCOMPLETE');
 assert.ok(result.mandatory.failures.length>0);
 return result;
}

test('mandatory acceptance and the unresolved classified inventory have separate outcomes',()=>{
 const input=fixture(),before=structuredClone(input),result=evaluate(input);
 assert.deepEqual(result.mandatory,{status:'PASS',expected:2,passed:2,failures:[]});
 assert.deepEqual(result.inventory,{status:'COMPLETE_WITH_CLASSIFIED_UNRESOLVED',qualifying:2,classified:input.classified,unresolved:1});
 assert.equal(result.inventory.classified[0].replayStatus,'unresolved-SOCIAL_STALE');
 assert.equal(result.inventory.classified[0].recordIndex,0);
 assert.equal(result.inventory.classified[0].tick,1);
 assert.deepEqual(input,before);
});

test('acceptance counts come from the expected fixtures rather than fixed historical totals',()=>{
 const input=fixture();input.expectedMandatory.push('another.json');input.qualifying.push({file:'another.json',replayExact:true,archiveUnchanged:true,journalUnchanged:true});
 const result=evaluate(input);
 assert.equal(result.mandatory.status,'PASS');assert.equal(result.mandatory.expected,3);assert.equal(result.mandatory.passed,3);assert.equal(result.inventory.qualifying,3);
});

test('a missing mandatory replay fails even when the classified inventory is valid',()=>{
 const input=fixture();input.qualifying.pop();
 const result=rejected(input);assert.equal(result.mandatory.expected,2);assert.equal(result.mandatory.passed,1);assert.equal(result.inventory.unresolved,1);
 assert.ok(result.mandatory.failures.some(row=>row.file==='swarm-b.json'));
});

test('replay, immutable bytes, and any present checkpoint tail are required for qualifying rows',()=>{
 for(const key of ['replayExact','archiveUnchanged','journalUnchanged','checkpointTailExact'] as const){
  const input=fixture();input.qualifying[1][key]=false;
  const result=rejected(input);assert.equal(result.mandatory.passed,1);assert.equal(result.inventory.qualifying,1);
 }
 const input=fixture();Object.assign(input.qualifying[1],{checkpointTailExact:null});assert.equal(evaluate(input).mandatory.status,'PASS');
});

test('unknown artifacts cannot become qualifying or inherit the approved classification',()=>{
 const qualifying=fixture();qualifying.qualifying.push({file:'unknown.json',replayExact:true,archiveUnchanged:true,journalUnchanged:true});
 assert.equal(rejected(qualifying).inventory.qualifying,2);
 const classified=fixture();classified.classified[0].file='unknown.json';
 const result=rejected(classified);assert.equal(result.inventory.classified.length,0);assert.equal(result.inventory.unresolved,0);
 const swapped=fixture();swapped.approvedFile='unknown.json';rejected(swapped);
});

test('invalid classification metadata cannot turn an unresolved replay into a pass',()=>{
 for(const patch of [
  {classification:'accepted-live-artifact'},
  {qualification:'qualifying'},
  {replayStatus:'PASS'},
  {hashesVerified:false},
  {recordIndex:1},
  {tick:2},
  {sourcePolicyRecoverable:true},
 ]){
  const input=fixture();Object.assign(input.classified[0],patch);
  const result=rejected(input);assert.equal(result.inventory.classified.length,0);assert.equal(result.inventory.unresolved,0);
 }
});

test('missing, duplicate, or additional classification is never accepted as a complete inventory',()=>{
 const absent=fixture();absent.classified=[];rejected(absent);
 const duplicate=fixture();duplicate.classified.push({...duplicate.classified[0]});rejected(duplicate);
 const extra=fixture();extra.classified.push({...extra.classified[0],file:'unknown.json'});rejected(extra);
});

test('the approved archive stays out of mandatory replay and cannot be added as a qualifying row',()=>{
 const expected=fixture();expected.expectedMandatory.push(approvedFile);rejected(expected);
 const qualifying=fixture();qualifying.qualifying.push({file:approvedFile,replayExact:true,archiveUnchanged:true,journalUnchanged:true});rejected(qualifying);
});

test('empty or duplicate expected identifiers and duplicate replay rows fail closed',()=>{
 const empty=fixture();empty.expectedMandatory=[];rejected(empty);
 for(const identifier of ['', '  ']){const input=fixture();input.expectedMandatory[0]=identifier;rejected(input);}
 const duplicateExpected=fixture();duplicateExpected.expectedMandatory.push('legacy-a.json');rejected(duplicateExpected);
 const duplicateReplay=fixture();duplicateReplay.qualifying.push({...duplicateReplay.qualifying[0]});
 const result=rejected(duplicateReplay);assert.equal(result.mandatory.passed,1);assert.equal(result.inventory.qualifying,1);
 const missingApproval=fixture();missingApproval.approvedFile='';rejected(missingApproval);
});

test('only the approved SOCIAL_STALE failure can remain outside mandatory failures',()=>{
 for(const failure of [
  {file:'legacy-a.json',code:'SOCIAL_STALE'},
  {file:'unknown.json',code:'SOCIAL_STALE'},
  {file:approvedFile,code:'SOCIAL_SHAPE'},
  {code:'AUDIT_ERROR'},
 ]){
  const input=fixture();input.failures.push(failure as typeof input.failures[number]);
  const result=rejected(input);assert.ok(result.mandatory.failures.some(row=>row.code===failure.code&&row.file===failure.file));
 }
 const missing=fixture();missing.failures=[];rejected(missing);
});
