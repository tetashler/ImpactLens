import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createSafeSocialDiagnostic,parseSafeSocialDiagnostic,SAFE_SOCIAL_SUBREASONS} from '../../society/social-diagnostics.ts';

const safe=()=>({version:1,family:'SOCIAL_TEXT',subreason:'authored-span-missing',stage:'evidence',field:'issueEvidenceId',offeredOption:{actionOffered:true,evidenceOffered:true,action:'reply',issueKind:'question'}});

test('safe diagnostics preserve only closed finite metadata in an immutable independent snapshot',()=>{
 const input=safe(),parsed=parseSafeSocialDiagnostic(input);
 assert.deepEqual(parsed,{version:1,family:'SOCIAL_TEXT',subreason:'authored-span-missing',stage:'evidence',field:'issueEvidenceId',offeredOption:{actionOffered:true,evidenceOffered:true,action:'reply',issueKind:'question'}});
 input.offeredOption.action='post';assert.equal(parsed.offeredOption.action,'reply');
 assert.ok(Object.isFrozen(parsed));assert.ok(Object.isFrozen(parsed.offeredOption));
});

test('safe diagnostics reject unknown fields and arbitrary prose at every metadata boundary',()=>{
 const marker='PRIVATE_REJECTED_OUTPUT_SENTINEL';
 for(const bad of [
  {...safe(),version:2}, {...safe(),family:marker}, {...safe(),subreason:marker},
  {...safe(),stage:marker}, {...safe(),field:marker}, {...safe(),text:marker},
  {...safe(),offeredOption:{...safe().offeredOption,action:marker}},
  {...safe(),offeredOption:{...safe().offeredOption,issueKind:marker}},
  {...safe(),offeredOption:{...safe().offeredOption,actionOffered:'true'}},
  {...safe(),offeredOption:{...safe().offeredOption,evidenceOffered:1}},
  {...safe(),offeredOption:{...safe().offeredOption,submittedId:marker}},
  {...safe(),offeredOption:{...safe().offeredOption,actionOffered:false}},
  {...safe(),offeredOption:{...safe().offeredOption,evidenceOffered:false}},
 ])assert.throws(()=>parseSafeSocialDiagnostic(bad),(error:unknown)=>!String(error).includes(marker));
});

test('safe diagnostic factory validates its inputs instead of retaining extra payloads or accessors',()=>{
 const input={family:'SOCIAL_TARGET' as const,subreason:'unoffered-action' as const,stage:'menu' as const,field:'choiceId' as const,offeredOption:{actionOffered:false,evidenceOffered:false,action:null,issueKind:null}};
 assert.deepEqual(createSafeSocialDiagnostic(input),{version:1,...input});
 assert.throws(()=>createSafeSocialDiagnostic({...input,profile:{private:'secret'}} as typeof input));
 let reads=0;const getter={...input};Object.defineProperty(getter,'subreason',{enumerable:true,get(){reads++;return 'unoffered-action';}});
 assert.throws(()=>createSafeSocialDiagnostic(getter));assert.equal(reads,0);
});

test('safe diagnostic parser rejects incomplete objects without filling in evidence or action claims',()=>{
 for(const bad of [null,[],{},Object.assign(Object.create({}),safe()),{...safe(),offeredOption:{actionOffered:false,evidenceOffered:false,action:null}},{...safe(),offeredOption:null}])assert.throws(()=>parseSafeSocialDiagnostic(bad));
});

test('consumers cannot widen the finite diagnostic vocabulary to admit private prose',()=>{
 const marker='PRIVATE_UNTRUSTED_ENUM_VALUE';
 try{(SAFE_SOCIAL_SUBREASONS as unknown as string[]).push(marker);}catch{/* A frozen vocabulary rejects the attempted expansion. */}
 assert.throws(()=>parseSafeSocialDiagnostic({...safe(),subreason:marker}));
});
