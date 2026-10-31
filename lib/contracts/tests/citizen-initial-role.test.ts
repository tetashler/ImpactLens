import test from 'node:test';
import assert from 'node:assert/strict';
import {scenarioRoleQuotation} from '../../citizen-grounding/initial-actions.ts';
test('earlier analytical role statements remain quotations rather than frozen citizen biographies',()=>{
 const original='I work as a nurse in Novena.',rendered=scenarioRoleQuotation(original);
 assert.match(rendered,/scenario-role quotation/);assert.match(rendered,/not this citizen/);assert.ok(rendered.includes(original));assert.equal(original,'I work as a nurse in Novena.');
});
test('long source quotations are bounded and omissions are explicit without mutating the source',()=>{
 const source='A'.repeat(1000),rendered=scenarioRoleQuotation(source);assert.ok(rendered.length<=1000);assert.match(rendered,/remainder omitted/);assert.equal(source.length,1000);
});
