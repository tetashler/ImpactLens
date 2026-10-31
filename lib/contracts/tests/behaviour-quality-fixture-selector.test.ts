import '../../../scripts/testing/offline-network.mjs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {createBehaviourCapabilitySelector,type BehaviourWireContext} from '../../../scripts/testing/phase4e2-behaviour-integration.ts';

function context():BehaviourWireContext{return {id:'fixture-decision',runId:'fixture-run',policy:'conversation-menu-v3',tick:100,calendar:{day:2},platform:'reddit',actor:{id:'actor-a',label:'Fictional fixture participant',goal:'Discuss the supplied safeguard.'},channels:[{id:'reddit',style:'public-discussion'},{id:'whatsapp',style:'private-group'}],groups:[],items:[],memories:[],topics:[{id:'topic-1',label:'Safeguards'}],choices:[{id:'choice-1',action:'inactive',platform:'reddit',target:null,requiredMemories:[],destinationGroup:null}],issueChoices:[]};}

test('offline capability selector accepts inactivity when no authored choice or new event is supplied',()=>{
 const c=context(),selected=createBehaviourCapabilitySelector().select(c);
 assert.equal(selected.choiceId,'choice-1');assert.equal(selected.text,null);assert.equal(selected.issueChoiceId,null);assert.deepEqual(selected.recallIds,[]);
});

test('offline capability group creation chooses the supplied transition without inventing a first message',()=>{
 const c=context();c.choices.push({id:'choice-2',action:'group-create',platform:'whatsapp',target:null,requiredMemories:[],destinationGroup:null});
 const selected=createBehaviourCapabilitySelector().select(c);
 assert.equal(selected.choiceId,'choice-2');assert.equal(selected.text,null);assert.equal(selected.issueChoiceId,null);
});

test('offline capability resolution selects a supplied finite owner-source choice and addresses its actual body',()=>{
 const c=context();c.items=[{id:'item-1',actorId:'actor-a',platform:'reddit',groupId:null,parentId:null,text:'A supplied earlier fixture question about wage safeguards.'}];
 c.choices.push({id:'choice-2',action:'post',platform:'reddit',target:null,requiredMemories:[],destinationGroup:null});
 c.issueChoices=[{id:'issue-choice-1',kind:'resolve',sourceItem:'item-1',requiredMemories:['memory-1']}];
 const selected=createBehaviourCapabilitySelector().select(c);
 assert.equal(selected.choiceId,'choice-2');assert.equal(selected.issueChoiceId,'issue-choice-1');assert.equal(selected.discussion,null);
 assert.ok(selected.text!.includes('A supplied earlier fixture question about wage safeguards.'));
});

test('offline capability selector never attaches an issue classification to a non-authored choice',()=>{
 const c=context();c.issueChoices=[{id:'issue-choice-1',kind:'question',sourceItem:null,requiredMemories:[]}];
 c.choices.push({id:'choice-2',action:'read',platform:'reddit',target:'item-1',requiredMemories:['memory-1'],destinationGroup:null});
 const selected=createBehaviourCapabilitySelector().select(c);
 assert.equal(selected.choiceId,'choice-1');assert.equal(selected.issueChoiceId,null);assert.equal(selected.text,null);
});

test('offline optional recall selects only supplied cross-day episodic evidence with an available body',()=>{
 const c=context();c.items=[{id:'item-1',actorId:'actor-b',platform:'reddit',groupId:null,parentId:null,text:'A supplied older fixture condition.'}];
 c.choices.push({id:'choice-2',action:'comment',platform:'reddit',target:'item-1',requiredMemories:['memory-1'],destinationGroup:null});
 c.memories=[{ref:'memory-1',kind:'exposure',origin:'episodic',tick:0,primaryItem:'item-1',items:['item-1']}];
 const selector=createBehaviourCapabilitySelector(),selected=selector.select(c);
 assert.deepEqual(selected.recallIds,['memory-1']);assert.ok(selected.text!.includes('I also recall the supplied earlier point: A supplied older fixture condition.'));
 assert.deepEqual(selector.select({...c,memories:[{...c.memories[0],origin:'short-term'}]}).recallIds,[]);
 assert.deepEqual(selector.select({...c,tick:8,calendar:{day:1}}).recallIds,[]);
 assert.deepEqual(selector.select({...c,memories:[{...c.memories[0],primaryItem:'earlier-record',items:['earlier-record']}]}).recallIds,[]);
});
