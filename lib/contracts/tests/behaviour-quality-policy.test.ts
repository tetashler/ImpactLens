import test from 'node:test';
import assert from 'node:assert/strict';
import {TOPIC_POLICY,validateIntelligence,isMenuPolicy} from '../../society/intelligence.ts';

test('quality context is an explicit frozen selector while legacy remains unchanged',()=>{
 const policy={...TOPIC_POLICY,context:'conversation-menu-v3',behaviour:'behaviour-quality-v1'};
 assert.doesNotThrow(()=>validateIntelligence(policy as any));
 assert.equal(isMenuPolicy('conversation-menu-v3'),true);
 assert.equal(TOPIC_POLICY.context,'conversation-menu-v2');
 assert.equal('behaviour' in TOPIC_POLICY,false);
 assert.doesNotThrow(()=>validateIntelligence(TOPIC_POLICY));
});

test('quality selector and context must be paired and unknown policies fail closed',()=>{
 for(const policy of [{...TOPIC_POLICY,behaviour:'behaviour-quality-v1'},{...TOPIC_POLICY,context:'conversation-menu-v3'},{...TOPIC_POLICY,context:'conversation-menu-v3',behaviour:'unknown'}])assert.throws(()=>validateIntelligence(policy as any));
});
