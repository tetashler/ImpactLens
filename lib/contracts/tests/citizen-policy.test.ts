import test from 'node:test';
import assert from 'node:assert/strict';
import {CITIZEN_POLICY,QUALITY_POLICY,TOPIC_POLICY,validateIntelligence,isMenuPolicy,isBehaviourQuality} from '../../society/intelligence.ts';
test('citizen context is explicit and historical selectors remain frozen',()=>{
 assert.equal(CITIZEN_POLICY.context,'conversation-menu-v4');assert.equal(CITIZEN_POLICY.behaviour,'citizen-grounded-v1');
 assert.doesNotThrow(()=>validateIntelligence(CITIZEN_POLICY));assert.equal(isMenuPolicy('conversation-menu-v4'),true);assert.equal(isBehaviourQuality(CITIZEN_POLICY),true);
 assert.equal(QUALITY_POLICY.context,'conversation-menu-v3');assert.equal(TOPIC_POLICY.context,'conversation-menu-v2');
});
test('citizen selector cannot be paired with historical context',()=>{
 assert.throws(()=>validateIntelligence({...CITIZEN_POLICY,context:'conversation-menu-v3'}));
 assert.throws(()=>validateIntelligence({...QUALITY_POLICY,context:'conversation-menu-v4'}));
});
