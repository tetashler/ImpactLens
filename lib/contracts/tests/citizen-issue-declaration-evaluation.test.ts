import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {evaluateIssueDeclarations} from '../../../scripts/testing/issue-declaration-evaluation.ts';
test('synthetic comparison separates adoption from authored evidence and preserves unsupported controls',()=>{
 const r=evaluateIssueDeclarations(),s=r.summary as any;assert.equal(r.liveProviderEvidence,false);assert.equal(s.v7['explicit-intent'].accepted,8);assert.equal(s.v7['explicit-intent'].formalIssues,8);assert.ok(s.v6['explicit-intent'].accepted<8);assert.equal(s.v7.unsupported.accepted,0);assert.equal(s.v6.unsupported.accepted,0);assert.equal(s.v7.untracked.accepted,3);assert.equal(s.v7.untracked.formalIssues,0);assert.ok(r.rows.every((x:any)=>!x.v7.authoredSpanEvidence));
});
